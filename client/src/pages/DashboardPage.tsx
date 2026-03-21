import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hand, Mic, FileText, AlertTriangle, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store';
import { signApi, sosApi } from '../api';

interface Stats {
    signSessions: number;
    signsDetected: number;
    sosAlerts: number;
    avgConfidence: number;
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats>({ signSessions: 0, signsDetected: 0, sosAlerts: 0, avgConfidence: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [signRes, sosRes] = await Promise.all([signApi.getStats(), sosApi.getStats()]);
                setStats({
                    signSessions: signRes.data.stats?.totalSessions ?? 0,
                    signsDetected: signRes.data.stats?.totalSignsDetected ?? 0,
                    avgConfidence: signRes.data.stats?.avgConfidence ?? 0,
                    sosAlerts: sosRes.data.stats?.total ?? 0,
                });
            } catch { /* API might not be connected */ }
        };
        fetchStats();
    }, []);

    const quickActions = [
        { icon: Hand, label: 'Sign Language', sublabel: 'Detect ASL signs', path: '/sign-language', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
        { icon: Mic, label: 'Text to Speech', sublabel: 'Auto-read text aloud', path: '/speech-to-text', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { icon: FileText, label: 'OCR Reader', sublabel: 'Read text aloud', path: '/ocr', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { icon: AlertTriangle, label: 'SOS Emergency', sublabel: 'Send emergency alert', path: '/sos', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    ];

    const statCards = [
        { label: 'Sign Sessions', value: stats.signSessions, icon: Hand, color: '#06B6D4' },
        { label: 'Signs Detected', value: stats.signsDetected, icon: TrendingUp, color: '#7C3AED' },
        { label: 'Avg Confidence', value: `${stats.avgConfidence}%`, icon: TrendingUp, color: '#10b981' },
        { label: 'SOS Alerts', value: stats.sosAlerts, icon: AlertTriangle, color: '#ef4444' },
    ];

    const disabilityLabel: Record<string, string> = {
        visual: '👁️ Visually Impaired', hearing: '🦻 Hearing Impaired',
        physical: '🦽 Physically Challenged', multiple: '✦ General Accessibility',
    };

    return (
        <div className="dashboard-page">
            {/* Welcome Banner */}
            <div className="welcome-banner">
                <div className="welcome-text">
                    <h1 className="welcome-title">
                        Welcome back, <span className="grad-text">{user?.name?.split(' ')[0]}</span>! 👋
                    </h1>
                    <p className="welcome-sub">
                        Profile: {disabilityLabel[user?.disabilityType || 'multiple']} &nbsp;·&nbsp;
                        <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                        &nbsp;{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="welcome-avatar">
                    {user?.name?.charAt(0).toUpperCase()}
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                {statCards.map(({ label, value, icon: Icon, color }) => (
                    <div className="stat-card" key={label}>
                        <div className="stat-card-icon" style={{ color, background: `${color}18` }}>
                            <Icon size={22} />
                        </div>
                        <div className="stat-card-info">
                            <div className="stat-card-value">{value}</div>
                            <div className="stat-card-label">{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="dashboard-section">
                <h2 className="dash-section-title">Quick Actions</h2>
                <div className="quick-actions-grid">
                    {quickActions.map(({ icon: Icon, label, sublabel, path, color, bg }) => (
                        <button
                            key={path}
                            className="quick-action-card"
                            style={{ '--card-accent': color, '--card-bg': bg } as React.CSSProperties}
                            onClick={() => navigate(path)}
                            id={`qa-${label.toLowerCase().replace(' ', '-')}`}
                        >
                            <div className="qa-icon" style={{ color, background: bg }}><Icon size={28} /></div>
                            <div className="qa-text">
                                <div className="qa-label">{label}</div>
                                <div className="qa-sublabel">{sublabel}</div>
                            </div>
                            <ChevronRight size={18} className="qa-arrow" style={{ color }} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Emergency Contacts */}
            <div className="dashboard-section">
                <div className="dash-section-header">
                    <h2 className="dash-section-title">Emergency Contacts</h2>
                    <button className="dash-link-btn" onClick={() => navigate('/settings')} id="manage-contacts">
                        Manage →
                    </button>
                </div>
                <div className="contacts-list">
                    {user?.emergencyContacts?.length ? (
                        user.emergencyContacts.map((c, i) => (
                            <div className="contact-row" key={i}>
                                <div className={`contact-indicator ${c.isActive ? 'active' : ''}`}></div>
                                <div className="contact-details">
                                    <span className="contact-n">{c.name}</span>
                                    <span className="contact-p">{c.phone} · {c.relation}</span>
                                </div>
                                <span className={`contact-badge ${c.isActive ? 'badge-active' : 'badge-standby'}`}>
                                    {c.isActive ? 'Active' : 'Standby'}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <p>No emergency contacts added yet.</p>
                            <button className="btn-primary-sm" onClick={() => navigate('/settings')} id="add-contacts">
                                Add Contacts
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tech Stack Info */}
            <div className="dashboard-section">
                <h2 className="dash-section-title">System Info</h2>
                <div className="sys-info-grid">
                    <div className="sys-info-item"><span className="sys-label">Frontend</span><span className="sys-value">React 18 + TypeScript</span></div>
                    <div className="sys-info-item"><span className="sys-label">Backend</span><span className="sys-value">Node.js + Express + TypeScript</span></div>
                    <div className="sys-info-item"><span className="sys-label">Database</span><span className="sys-value">MongoDB + Mongoose</span></div>
                    <div className="sys-info-item"><span className="sys-label">AI Stack</span><span className="sys-value">MediaPipe, PyTorch, Whisper</span></div>
                    <div className="sys-info-item"><span className="sys-label">Real-time</span><span className="sys-value">Socket.IO</span></div>
                    <div className="sys-info-item"><span className="sys-label">Auth</span><span className="sys-value">JWT + bcrypt</span></div>
                </div>
            </div>
        </div>
    );
}
