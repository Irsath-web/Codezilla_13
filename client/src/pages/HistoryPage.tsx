import { useEffect, useState } from 'react';
import { Trash2, Hand, Mic, FileText, AlertTriangle } from 'lucide-react';
import { signApi, transcriptApi, ocrApi, sosApi } from '../api';
import toast from 'react-hot-toast';

type TabType = 'signs' | 'transcripts' | 'ocr' | 'sos';

export default function HistoryPage() {
    const [activeTab, setActiveTab] = useState<TabType>('signs');
    const [data, setData] = useState<Record<TabType, unknown[]>>({ signs: [], transcripts: [], ocr: [], sos: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData(activeTab);
    }, [activeTab]);

    const fetchData = async (tab: TabType) => {
        setLoading(true);
        try {
            let res;
            if (tab === 'signs') res = await signApi.getHistory();
            else if (tab === 'transcripts') res = await transcriptApi.getAll();
            else if (tab === 'ocr') res = await ocrApi.getHistory();
            else res = await sosApi.getHistory();
            const key = tab === 'signs' ? 'sessions' : tab === 'transcripts' ? 'transcripts' : tab === 'ocr' ? 'results' : 'alerts';
            setData(prev => ({ ...prev, [tab]: res.data[key] || [] }));
        } catch { /* offline */ }
        setLoading(false);
    };

    const tabs = [
        { id: 'signs' as TabType, label: '🤟 Sign Sessions', icon: Hand },
        { id: 'transcripts' as TabType, label: '🎙 Transcripts', icon: Mic },
        { id: 'ocr' as TabType, label: '📄 OCR Results', icon: FileText },
        { id: 'sos' as TabType, label: '🆘 SOS Alerts', icon: AlertTriangle },
    ];

    return (
        <div className="feature-page">
            <div className="feature-header">
                <div className="feature-title-row">
                    <div className="feature-icon-badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>📋</div>
                    <div>
                        <h1 className="feature-title">Activity History</h1>
                        <p className="feature-subtitle">All your sessions and activity stored in MongoDB</p>
                    </div>
                </div>
                <button className="btn-primary-sm" onClick={() => fetchData(activeTab)} id="refresh-history">🔄 Refresh</button>
            </div>

            <div className="tab-row">
                {tabs.map(t => (
                    <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'tab-active' : ''}`}
                        id={`hist-tab-${t.id}`} onClick={() => setActiveTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="history-panel">
                {loading ? (
                    <div className="loading-state">
                        <div className="loader-spin"></div>
                        <p>Fetching from MongoDB...</p>
                    </div>
                ) : data[activeTab].length === 0 ? (
                    <div className="empty-state">
                        <p>No {activeTab} history yet. Start using the features to see data here.</p>
                        <p className="tp-hint">Make sure MongoDB is connected at <code>mongodb://localhost:27017/accessai</code></p>
                    </div>
                ) : (
                    <div className="history-list">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(data[activeTab] as any[]).map((item: any) => (
                            <div className="history-item" key={item._id}>
                                <div className="hi-main">
                                    {activeTab === 'signs' && (
                                        <>
                                            <div className="hi-title">Sign Session — {item.detectedSigns?.length || 0} signs</div>
                                            <div className="hi-sub">Sentence: "{item.builtSentence || '—'}"</div>
                                        </>
                                    )}
                                    {activeTab === 'transcripts' && (
                                        <>
                                            <div className="hi-title">{item.text?.substring(0, 80)}...</div>
                                            <div className="hi-sub">{item.wordCount} words · {item.language}</div>
                                        </>
                                    )}
                                    {activeTab === 'ocr' && (
                                        <>
                                            <div className="hi-title">{item.extractedText?.substring(0, 80)}...</div>
                                            <div className="hi-sub">{item.wordCount} words · Confidence: {item.confidence}%</div>
                                        </>
                                    )}
                                    {activeTab === 'sos' && (
                                        <>
                                            <div className="hi-title">SOS — {item.triggerMethod} trigger</div>
                                            <div className="hi-sub">
                                                Status: <span className={`status-tag status-${item.status}`}>{item.status}</span>
                                                &nbsp;· {item.contactsNotified?.length || 0} contacts notified
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="hi-meta">
                                    <span className="hi-date">{new Date(item.createdAt).toLocaleString('en-IN')}</span>
                                    <button className="icon-action-btn delete-btn" title="Delete" onClick={async () => {
                                        try {
                                            if (activeTab === 'transcripts') await transcriptApi.delete(item._id);
                                            else if (activeTab === 'ocr') await ocrApi.deleteResult(item._id);
                                            toast.success('Deleted from MongoDB');
                                            fetchData(activeTab);
                                        } catch { toast.error('Delete failed'); }
                                    }} id={`del-${item._id}`}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
