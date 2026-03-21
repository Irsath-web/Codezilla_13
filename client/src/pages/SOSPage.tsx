import { useState, useEffect, useRef } from 'react';
import { Phone, MapPin, CheckCircle, XCircle, Loader2, ShieldAlert, RefreshCw, Mail, Navigation } from 'lucide-react';
import { sosApi } from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import type { SOSAlert } from '../types';

type SOSStatus = 'idle' | 'countdown' | 'sending' | 'sent';

interface EmailResult {
    name: string;
    phone: string;
    email: string;
    delivered: boolean;
    info: string;
}

export default function SOSPage() {
    const { user } = useAuthStore();
    const [status, setStatus] = useState<SOSStatus>('idle');
    const [countdown, setCountdown] = useState(3);
    const [currentAlert, setCurrentAlert] = useState<SOSAlert | null>(null);
    const [location, setLocation] = useState({ lat: 13.0827, lng: 80.2707, accuracy: 99999, accurate: false });
    const [gpsLoading, setGpsLoading] = useState(true);
    const [method, setMethod] = useState<'button' | 'voice' | 'fall_detection'>('button');
    const [customMsg, setCustomMsg] = useState('');
    const [emailResults, setEmailResults] = useState<EmailResult[]>([]);
    const [credsMissing, setCredsMissing] = useState(false);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const watchIdRef = useRef<number | null>(null);

    // ── watchPosition: keeps refining until best accuracy achieved ──
    const startWatchingLocation = () => {
        if (!navigator.geolocation) { setGpsLoading(false); return; }
        setGpsLoading(true);
        // Clear any existing watcher
        if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude: lat, longitude: lng, accuracy } = pos.coords;
                setLocation({ lat, lng, accuracy, accurate: true });
                setGpsLoading(false);
                // Stop watching once we get within 50 metres (good enough)
                if (accuracy <= 50 && watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                }
            },
            () => { setGpsLoading(false); setLocation(l => ({ ...l, accurate: false })); },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        startWatchingLocation();
        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    const activeContacts = user?.emergencyContacts?.filter(c => c.isActive) ?? [];
    const contactsWithEmail = activeContacts.filter(c => (c as unknown as { email?: string }).email);
    const mapsUrl = `https://maps.google.com/?q=${location.lat},${location.lng}`;
    const accuracyM = Math.round(location.accuracy);
    const isAccurate = location.accurate && accuracyM <= 500;
    const accuracyLabel = !location.accurate
        ? '⚠️ GPS unavailable — using default'
        : accuracyM <= 50 ? `🟢 Excellent — ±${accuracyM}m`
            : accuracyM <= 200 ? `🟡 Good — ±${accuracyM}m`
                : accuracyM <= 1000 ? `🟠 Rough — ±${accuracyM}m`
                    : `🔴 Poor — ±${(accuracyM / 1000).toFixed(1)}km (keep page open to refine)`;

    const startCountdown = () => {
        if (activeContacts.length === 0) {
            toast.error('No active contacts! Add them in Settings first.'); return;
        }
        if (contactsWithEmail.length === 0) {
            toast.error('No contacts have an email address. Add emails in Settings.'); return;
        }
        setStatus('countdown'); setCountdown(3);
        let c = 3;
        countdownRef.current = setInterval(() => {
            c--; setCountdown(c);
            if (c === 0) { clearInterval(countdownRef.current!); triggerSOS(); }
        }, 1000);
    };

    const cancelCountdown = () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setStatus('idle');
    };

    const triggerSOS = async () => {
        setStatus('sending');
        try {
            const res = await sosApi.trigger(method, { lat: location.lat, lng: location.lng }, customMsg);
            const data = res.data;
            setCurrentAlert(data.alert as SOSAlert);
            const results: EmailResult[] = data.emailResults ?? [];
            setEmailResults(results);
            const missed = results.some(r => r.info?.includes('GMAIL'));
            setCredsMissing(missed);
            const ok = results.filter(r => r.delivered).length;
            if (ok > 0) toast.error(`🆘 SOS sent! ${ok} email${ok !== 1 ? 's' : ''} delivered.`, { duration: 6000 });
            else toast(`⚠️ SOS saved but emails not sent. Check Gmail setup.`, { icon: '⚙️', duration: 7000 });
            setStatus('sent');
        } catch {
            toast.error('Server offline. Start the backend server and try again.', { duration: 6000 });
            setStatus('idle');
        }
    };

    const resolveAlert = async () => {
        if (currentAlert) {
            try { await sosApi.resolve(currentAlert._id, 'resolved', 'User confirmed safe'); } catch { /* offline */ }
        }
        if (countdownRef.current) clearInterval(countdownRef.current);
        setStatus('idle'); setCurrentAlert(null); setEmailResults([]); setCredsMissing(false);
        toast.success('✅ You are safe! SOS alert cancelled.', { duration: 4000 });
    };


    return (
        <div className="feature-page">
            <div className="feature-header">
                <div className="feature-title-row">
                    <div className="feature-icon-badge sos-badge">🆘</div>
                    <div>
                        <h1 className="feature-title">SOS Emergency System</h1>
                        <p className="feature-subtitle">Sends a real emergency email with GPS location to all active contacts instantly</p>
                    </div>
                </div>
            </div>

            <div className="sos-page-layout">
                <div className="sos-left">

                    {/* Trigger Method */}
                    <div className="trigger-card">
                        <h3 className="tc-title">⚡ Trigger Method</h3>
                        <div className="trigger-btns">
                            {(['button', 'voice', 'fall_detection'] as const).map(m => (
                                <button key={m} className={`trigger-option ${method === m ? 'trigger-active' : ''}`}
                                    onClick={() => setMethod(m)} id={`method-${m}`}>
                                    {m === 'button' ? '🔴 One-Tap Button' : m === 'voice' ? '🎤 Voice Command' : '📱 Fall Detection'}
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* Emergency Contacts */}
                    <div className="sos-contacts-card">
                        <div className="scc-header">
                            <h3>📋 Will email these contacts</h3>
                            <span className="active-count">{contactsWithEmail.length}/{activeContacts.length} with email</span>
                        </div>
                        {activeContacts.length > 0 ? activeContacts.map((c, i) => {
                            const email = (c as unknown as { email?: string }).email ?? '';
                            return (
                                <div className="sos-contact-row" key={i}>
                                    <div className={`sos-contact-dot ${email ? 'dot-green' : 'dot-gray'}`} />
                                    <div className="scr-info">
                                        <span className="scr-name">{c.name}</span>
                                        <span className="scr-phone">
                                            {email
                                                ? <><Mail size={11} style={{ display: 'inline', marginRight: 3 }} />{email}</>
                                                : <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>⚠ No email — add in Settings</span>}
                                        </span>
                                    </div>
                                    <Phone size={14} style={{ color: email ? '#10b981' : '#64748b' }} />
                                </div>
                            );
                        }) : (
                            <div className="empty-state-sm">
                                <p>No active contacts. <a href="/settings" className="auth-link">Add them in Settings →</a></p>
                            </div>
                        )}
                    </div>

                    {/* Location */}
                    <div className="location-card">
                        <div className="lc-header" style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={16} />
                                <span>Your Location</span>
                                {gpsLoading && <Loader2 size={13} className="spin" style={{ opacity: 0.6 }} />}
                            </div>
                            <button
                                onClick={startWatchingLocation}
                                title="Refresh GPS"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: '2px 6px', borderRadius: '6px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                id="refresh-gps"
                            >
                                <RefreshCw size={13} /> Refresh
                            </button>
                        </div>

                        {/* Accuracy bar */}
                        <div style={{ margin: '8px 0 4px', fontSize: '0.78rem', opacity: 0.75 }}>{accuracyLabel}</div>
                        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '20px', height: '5px', overflow: 'hidden', marginBottom: '10px' }}>
                            <div style={{
                                height: '100%', borderRadius: '20px',
                                background: isAccurate ? '#10b981' : accuracyM <= 1000 ? '#f59e0b' : '#ef4444',
                                width: `${Math.min(100, Math.max(5, 100 - (accuracyM / 50)))}%`,
                                transition: 'width 0.8s ease, background 0.5s',
                            }} />
                        </div>

                        <div className="lc-coords">
                            <span>Lat: {location.lat.toFixed(5)}°</span>
                            <span>Lng: {location.lng.toFixed(5)}°</span>
                        </div>
                        <a href={mapsUrl} target="_blank" rel="noreferrer"
                            style={{ fontSize: '0.78rem', color: '#10b981', textDecoration: 'none', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Navigation size={12} /> Preview on Google Maps
                        </a>

                        {!isAccurate && location.accurate && (
                            <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', padding: '8px 10px', lineHeight: 1.6 }}>
                                💡 <strong>Tip:</strong> Desktop browsers use Wi-Fi/IP location which can be inaccurate. For precise GPS, open this page on your <strong>phone browser</strong> and allow location access.
                            </div>
                        )}
                    </div>

                    {/* Gmail setup guide */}
                    {credsMissing && (
                        <div style={{
                            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                            borderRadius: '12px', padding: '14px 16px', fontSize: '0.82rem', lineHeight: 1.9,
                        }}>
                            <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>⚙️ One-time Gmail Setup</div>
                            <ol style={{ paddingLeft: '1.2rem', opacity: 0.8, margin: 0 }}>
                                <li>Enable <strong>2-Step Verification</strong> on your Google account</li>
                                <li>Go to <strong>myaccount.google.com → Security → App Passwords</strong></li>
                                <li>Create an App Password (select "Mail")</li>
                                <li>Add to <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4 }}>server/.env</code>:</li>
                            </ol>
                            <pre style={{
                                background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: '10px 12px',
                                margin: '8px 0 0', fontSize: '0.78rem', overflowX: 'auto', color: '#10b981',
                            }}>{`GMAIL_USER=yourgmail@gmail.com\nGMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx`}</pre>
                            <div style={{ opacity: 0.55, fontSize: '0.72rem', marginTop: 6 }}>Restart the server after saving .env</div>
                        </div>
                    )}
                </div>

                {/* ── Right Panel ── */}
                <div className="sos-right">
                    {status === 'idle' && (
                        <div className="sos-btn-zone">
                            <div className="sos-rings">
                                <div className="sos-ring-1" />
                                <div className="sos-ring-2" />
                                <button className="sos-main-btn-react" onClick={startCountdown} id="sos-main"
                                    disabled={activeContacts.length === 0}
                                    style={{ opacity: activeContacts.length === 0 ? 0.5 : 1 }}>
                                    <span className="sos-emoji">🆘</span>
                                    <span className="sos-main-label">SEND SOS</span>
                                </button>
                            </div>
                            <p className="sos-hint">
                                {activeContacts.length === 0
                                    ? '⚠️ Add emergency contacts in Settings'
                                    : contactsWithEmail.length === 0
                                        ? '⚠️ Add email addresses to contacts in Settings'
                                        : `Emails ${contactsWithEmail.length} contact${contactsWithEmail.length !== 1 ? 's' : ''} immediately`}
                            </p>
                        </div>
                    )}

                    {status === 'countdown' && (
                        <div className="sos-countdown">
                            <div className="countdown-circle">
                                <span className="countdown-number">{countdown}</span>
                            </div>
                            <p>Sending SOS email in {countdown}s…</p>
                            <button className="cancel-sos-btn" onClick={cancelCountdown} id="cancel-countdown">
                                <XCircle size={16} /> Cancel
                            </button>
                        </div>
                    )}

                    {status === 'sending' && (
                        <div className="sos-sending">
                            <Loader2 size={48} className="spin sos-spin" />
                            <p>Sending emergency emails…</p>
                        </div>
                    )}

                    {status === 'sent' && (
                        <div className="sos-sent-panel">
                            <div className="sos-sent-icon"><ShieldAlert size={48} /></div>
                            <h2>SOS SENT</h2>

                            {/* Per-contact delivery */}
                            <div style={{ width: '100%', marginBottom: '1rem' }}>
                                {emailResults.map((r, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                        padding: '8px 12px', borderRadius: '8px', marginBottom: '6px',
                                        background: r.delivered ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                                        border: `1px solid ${r.delivered ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                    }}>
                                        {r.delivered
                                            ? <CheckCircle size={16} color="#10b981" />
                                            : <XCircle size={16} color="#ef4444" />}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{r.name}</div>
                                            <div style={{ fontSize: '0.72rem', opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {r.email || r.phone}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: '0.72rem', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
                                            background: r.delivered ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                            color: r.delivered ? '#10b981' : '#ef4444',
                                        }}>
                                            {r.delivered ? '✓ Email Sent' : '✗ Failed'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="alert-details">
                                <div className="ad-row">
                                    <span className="ad-key">📍 Location:</span>
                                    <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ color: '#10b981', fontSize: '0.85rem' }}>
                                        View on Maps ↗
                                    </a>
                                </div>
                                <div className="ad-row">
                                    <span className="ad-key">📧 Delivered:</span>
                                    <span className="ad-val">{emailResults.filter(r => r.delivered).length}/{emailResults.length} emails</span>
                                </div>
                            </div>

                            <div className="sos-resolve-actions">
                                <button className="action-btn" onClick={triggerSOS} id="resend-sos"
                                    style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                                    <RefreshCw size={14} /> Re-send
                                </button>
                                <button className="cancel-sos-btn" onClick={resolveAlert} id="cancel-sos">
                                    <CheckCircle size={16} /> I'm Safe
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Status bar */}
                    <div className="sos-status-indicators">
                        <div className="ssi-item">
                            <div className={`ssi-dot ${location.accurate ? 'ssi-green' : 'ssi-amber'}`} />
                            <span>GPS: {location.accurate ? 'Live' : 'Default'}</span>
                        </div>
                        <div className="ssi-item">
                            <div className="ssi-dot ssi-green" />
                            <span>Channel: Email</span>
                        </div>
                        <div className="ssi-item">
                            <div className={`ssi-dot ${contactsWithEmail.length > 0 ? 'ssi-green' : 'ssi-red'}`} />
                            <span>Ready: {contactsWithEmail.length} contact{contactsWithEmail.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
