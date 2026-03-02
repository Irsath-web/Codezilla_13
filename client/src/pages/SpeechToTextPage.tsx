import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Trash2, Save, Copy, Volume2, VolumeX, Settings2, PlayCircle } from 'lucide-react';
import { transcriptApi } from '../api';
import toast from 'react-hot-toast';

const LANGUAGES = [
    { code: 'en-US', label: 'English (US)' }, { code: 'hi-IN', label: 'Hindi' },
    { code: 'ta-IN', label: 'Tamil' }, { code: 'te-IN', label: 'Telugu' },
    { code: 'es-ES', label: 'Spanish' }, { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' }, { code: 'ja-JP', label: 'Japanese' },
];

const PRESETS = [
    { label: '🧑 Natural', rate: 1.0, pitch: 1.0, volume: 1.0 },
    { label: '🐢 Slow & Clear', rate: 0.75, pitch: 0.95, volume: 1.0 },
    { label: '⚡ Fast', rate: 1.4, pitch: 1.05, volume: 1.0 },
    { label: '👩 Female Soft', rate: 0.9, pitch: 1.3, volume: 0.9 },
    { label: '🧔 Male Deep', rate: 0.85, pitch: 0.7, volume: 1.0 },
    { label: '📢 Loud & Bold', rate: 1.0, pitch: 1.0, volume: 1.0 },
];

export default function SpeechToTextPage() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [language, setLanguage] = useState('en-US');
    const [saved, setSaved] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Voice settings
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>('');
    const [rate, setRate] = useState(1.0);
    const [pitch, setPitch] = useState(1.0);
    const [volume, setVolume] = useState(1.0);
    const [showSettings, setShowSettings] = useState(true);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const autoReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            const v = window.speechSynthesis?.getVoices() ?? [];
            setVoices(v);
            // Default: first English voice
            const eng = v.find(x => x.lang.startsWith('en'));
            if (eng && !selectedVoice) setSelectedVoice(eng.name);
        };
        loadVoices();
        window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
        return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
            if (autoReadTimerRef.current) clearTimeout(autoReadTimerRef.current);
            window.speechSynthesis?.cancel();
        };
    }, []);

    // Auto-read: debounce 1 second after typing stops
    useEffect(() => {
        if (!transcript.trim()) return;
        if (autoReadTimerRef.current) clearTimeout(autoReadTimerRef.current);
        autoReadTimerRef.current = setTimeout(() => speakText(transcript.trim()), 1000);
        return () => { if (autoReadTimerRef.current) clearTimeout(autoReadTimerRef.current); };
    }, [transcript, selectedVoice, rate, pitch, volume]);

    const speakText = (text: string) => {
        if (!window.speechSynthesis) { toast.error('TTS not supported in this browser'); return; }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        const voice = voices.find(v => v.name === selectedVoice);
        if (voice) utt.voice = voice;
        utt.lang = voice?.lang ?? language;
        utt.rate = rate;
        utt.pitch = pitch;
        utt.volume = volume;
        utt.onstart = () => setIsSpeaking(true);
        utt.onend = () => setIsSpeaking(false);
        utt.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utt);
    };

    const stopSpeaking = () => { window.speechSynthesis?.cancel(); setIsSpeaking(false); };

    const applyPreset = (p: typeof PRESETS[0]) => {
        setRate(p.rate); setPitch(p.pitch); setVolume(p.volume);
        toast.success(`Preset "${p.label.replace(/^\S+\s/, '')}" applied`);
    };

    const startListening = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { toast.error('Speech recognition not supported'); return; }
        const r = new SR();
        r.lang = language; r.continuous = true; r.interimResults = true;
        r.onresult = (e: SpeechRecognitionEvent) => {
            let final = '', interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
                else interim += e.results[i][0].transcript;
            }
            if (final) setTranscript(p => p + final);
            setInterimText(interim);
        };
        r.onerror = () => { setIsListening(false); toast.error('Microphone error'); };
        r.onend = () => { setIsListening(false); setInterimText(''); };
        r.start();
        recognitionRef.current = r;
        setIsListening(true); setSaved(false);
        toast.success('Listening...');
    };

    const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); setInterimText(''); };

    const handleSave = async () => {
        if (!transcript.trim()) { toast.error('Nothing to save'); return; }
        try {
            await transcriptApi.save({ text: transcript.trim(), language, confidence: 95 });
            toast.success('Saved to MongoDB!'); setSaved(true);
        } catch { toast('Offline — connect server to save.', { icon: '⚡' }); }
    };

    const copyText = () => { navigator.clipboard.writeText(transcript); toast.success('Copied!'); };

    // Filter voices by selected language prefix when possible
    const filteredVoices = voices.filter(v => v.lang.startsWith(language.split('-')[0]));
    const displayVoices = filteredVoices.length > 0 ? filteredVoices : voices;

    return (
        <div className="feature-page">
            <div className="feature-header">
                <div className="feature-title-row">
                    <div className="feature-icon-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>🔊</div>
                    <div>
                        <h1 className="feature-title">Text to Speech</h1>
                        <p className="feature-subtitle">Type or record — auto-reads aloud after 1 second · Customise voice for crystal clarity</p>
                    </div>
                </div>
            </div>

            <div className="page-layout">
                <div className="page-left">

                    {/* ── Language + Mic Controls ── */}
                    <div className="stt-controls">
                        <div className="form-group">
                            <label className="form-label">Language</label>
                            <select className="form-input" value={language} onChange={e => { setLanguage(e.target.value); setSelectedVoice(''); }} id="lang-select" style={{ colorScheme: 'dark', background: '#13132a', color: '#e2e8f0' }}>
                                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className={`mic-toggle-btn ${isListening ? 'mic-active' : ''}`}
                                onClick={isListening ? stopListening : startListening}
                                id="mic-toggle" style={{ flex: 1 }}>
                                {isListening ? <><MicOff size={20} /> <span>Stop Recording</span></> : <><Mic size={20} /> <span>Start Recording</span></>}
                            </button>
                            <button className={`mic-toggle-btn ${isSpeaking ? 'mic-active' : ''}`}
                                onClick={isSpeaking ? stopSpeaking : () => speakText(transcript.trim())}
                                id="speak-toggle" style={{ flex: 1 }} disabled={!transcript.trim()}>
                                {isSpeaking ? <><VolumeX size={20} /> <span>Stop</span></> : <><Volume2 size={20} /> <span>Read Aloud</span></>}
                            </button>
                        </div>

                        {isListening && (
                            <div className="listening-indicator">
                                <div className="mic-waves">{[...Array(5)].map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />)}</div>
                                <span>Listening in {LANGUAGES.find(l => l.code === language)?.label}...</span>
                            </div>
                        )}
                        {isSpeaking && (
                            <div className="listening-indicator" style={{ background: 'rgba(16,185,129,0.08)', borderColor: '#10b981' }}>
                                <div className="mic-waves">{[...Array(5)].map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.1}s`, background: '#10b981' }} />)}</div>
                                <span>Speaking aloud…</span>
                            </div>
                        )}
                    </div>

                    {/* ── Voice Settings Panel ── */}
                    <div style={{
                        background: 'var(--card-bg, rgba(255,255,255,0.04))',
                        border: '1px solid var(--border, rgba(255,255,255,0.08))',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        marginBottom: '1.25rem',
                    }}>
                        {/* Header */}
                        <button
                            onClick={() => setShowSettings(s => !s)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.85rem 1.1rem', background: 'transparent', border: 'none',
                                cursor: 'pointer', color: 'inherit',
                            }}
                            id="voice-settings-toggle"
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
                                <Settings2 size={16} style={{ color: '#10b981' }} /> Voice Settings
                            </span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{showSettings ? '▲ Hide' : '▼ Show'}</span>
                        </button>

                        {showSettings && (
                            <div style={{ padding: '0 1.1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                {/* Voice Picker */}
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">🎙️ Voice</label>
                                    <select
                                        className="form-input"
                                        value={selectedVoice}
                                        onChange={e => setSelectedVoice(e.target.value)}
                                        id="voice-select"
                                        style={{ colorScheme: 'dark', background: '#13132a', color: '#e2e8f0' }}
                                    >
                                        <option value="">— System Default —</option>
                                        {displayVoices.map(v => (
                                            <option key={v.name} value={v.name}>
                                                {v.name} ({v.lang}) {v.localService ? '📍' : '☁️'}
                                            </option>
                                        ))}
                                    </select>
                                    <span style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '4px', display: 'block' }}>
                                        📍 = local (offline) &nbsp;☁️ = cloud (clearer)
                                    </span>
                                </div>

                                {/* Sliders row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
                                    {/* Speed */}
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>⚡ Speed</span><strong>{rate.toFixed(2)}x</strong>
                                        </label>
                                        <input type="range" min="0.5" max="2" step="0.05"
                                            value={rate} onChange={e => setRate(parseFloat(e.target.value))}
                                            id="rate-slider"
                                            style={{ width: '100%', accentColor: '#10b981' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', opacity: 0.45 }}>
                                            <span>0.5×</span><span>2×</span>
                                        </div>
                                    </div>

                                    {/* Pitch */}
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>🎵 Pitch</span><strong>{pitch.toFixed(2)}</strong>
                                        </label>
                                        <input type="range" min="0.5" max="2" step="0.05"
                                            value={pitch} onChange={e => setPitch(parseFloat(e.target.value))}
                                            id="pitch-slider"
                                            style={{ width: '100%', accentColor: '#7c3aed' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', opacity: 0.45 }}>
                                            <span>Low</span><span>High</span>
                                        </div>
                                    </div>

                                    {/* Volume */}
                                    <div>
                                        <label className="form-label" style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>🔊 Volume</span><strong>{Math.round(volume * 100)}%</strong>
                                        </label>
                                        <input type="range" min="0" max="1" step="0.05"
                                            value={volume} onChange={e => setVolume(parseFloat(e.target.value))}
                                            id="volume-slider"
                                            style={{ width: '100%', accentColor: '#f59e0b' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', opacity: 0.45 }}>
                                            <span>0%</span><span>100%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Presets */}
                                <div>
                                    <label className="form-label" style={{ marginBottom: '6px' }}>🎛️ Quick Presets</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {PRESETS.map(p => (
                                            <button key={p.label}
                                                onClick={() => applyPreset(p)}
                                                id={`preset-${p.label.replace(/\W+/g, '-')}`}
                                                style={{
                                                    padding: '0.35rem 0.8rem',
                                                    borderRadius: '20px',
                                                    border: '1px solid rgba(255,255,255,0.12)',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    color: 'inherit',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    transition: 'all 0.18s',
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.18)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Test Voice button */}
                                <button
                                    onClick={() => speakText('Hello! This is a voice test. Adjust the settings until it sounds perfect.')}
                                    id="test-voice-btn"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.55rem 1.1rem', borderRadius: '10px',
                                        border: '1px solid #10b981', background: 'rgba(16,185,129,0.1)',
                                        color: '#10b981', cursor: 'pointer', fontSize: '0.88rem',
                                        fontWeight: 600, alignSelf: 'flex-start', transition: 'all 0.18s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.22)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.1)')}
                                >
                                    <PlayCircle size={16} /> Test Voice
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Text Box ── */}
                    <div className="transcript-panel">
                        <div className="tp-header">
                            <span>✏️ Text (auto-reads after 1s)</span>
                            <div className="tp-actions">
                                <button className="icon-action-btn" onClick={copyText} title="Copy" disabled={!transcript} id="copy-transcript"><Copy size={16} /></button>
                                <button className="icon-action-btn" onClick={() => { setTranscript(''); setSaved(false); stopSpeaking(); }} title="Clear" disabled={!transcript} id="clear-transcript"><Trash2 size={16} /></button>
                                <button className="icon-action-btn save-btn" onClick={handleSave} title="Save to DB" disabled={!transcript || saved} id="save-transcript"><Save size={16} /></button>
                            </div>
                        </div>
                        <div className="tp-body">
                            <textarea
                                style={{
                                    width: '100%', minHeight: '160px', background: 'transparent',
                                    border: 'none', outline: 'none', resize: 'vertical',
                                    color: 'inherit', fontFamily: 'inherit', fontSize: '1rem',
                                    lineHeight: '1.7', padding: '0.25rem 0',
                                }}
                                placeholder="Type or paste text here… it will be read aloud automatically after 1 second."
                                value={transcript + interimText}
                                onChange={e => { setTranscript(e.target.value); setSaved(false); }}
                                id="tts-textarea"
                            />
                        </div>
                        {transcript && (
                            <div className="tp-footer">
                                <span>Words: {transcript.trim().split(/\s+/).filter(Boolean).length}</span>
                                <span>Characters: {transcript.length}</span>
                                {saved && <span className="saved-tag">✓ Saved</span>}
                            </div>
                        )}
                    </div>

                    {/* Info cards */}
                    <div className="info-cards">
                        <div className="info-card"><span className="ic-icon">🔊</span><span className="ic-text">Auto-reads 1 second after you stop typing</span></div>
                        <div className="info-card"><span className="ic-icon">🎛️</span><span className="ic-text">Adjust voice, speed, pitch &amp; volume for clear output</span></div>
                        <div className="info-card"><span className="ic-icon">☁️</span><span className="ic-text">Cloud voices (☁️) are clearer than local voices (📍)</span></div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="page-right">
                    <div className="stt-visual">
                        <div className="waveform-display" id="waveform">
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className={`wf-bar ${(isListening || isSpeaking) ? 'wf-active' : ''}`}
                                    style={{ animationDelay: `${i * 0.05}s`, height: (isListening || isSpeaking) ? undefined : '8px' }} />
                            ))}
                        </div>
                        <div className="stt-status-badge">
                            <div className={`status-dot ${(isListening || isSpeaking) ? 'dot-active' : ''}`} />
                            <span>{isListening ? 'Recording...' : isSpeaking ? 'Speaking...' : 'Ready'}</span>
                        </div>
                        <div className="lang-display">
                            <span className="ld-label">Active Language</span>
                            <span className="ld-value">{LANGUAGES.find(l => l.code === language)?.label}</span>
                        </div>
                        {/* Live settings summary */}
                        <div style={{
                            marginTop: '1.25rem', padding: '0.9rem 1rem',
                            background: 'rgba(16,185,129,0.07)', borderRadius: '10px',
                            border: '1px solid rgba(16,185,129,0.18)',
                            fontSize: '0.82rem', lineHeight: '1.9',
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: '#10b981' }}>🎚️ Current Settings</div>
                            <div style={{ opacity: 0.75 }}>🎙️ {selectedVoice || 'System Default'}</div>
                            <div style={{ opacity: 0.75 }}>⚡ Speed: {rate.toFixed(2)}x &nbsp;|&nbsp; 🎵 Pitch: {pitch.toFixed(2)}</div>
                            <div style={{ opacity: 0.75 }}>🔊 Volume: {Math.round(volume * 100)}%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
