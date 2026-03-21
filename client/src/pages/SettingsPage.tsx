import { useState } from 'react';
import { Save, Plus, Trash2, Mail } from 'lucide-react';
import { useAuthStore } from '../store';
import { userApi } from '../api';
import toast from 'react-hot-toast';
import type { EmergencyContact, UserPreferences } from '../types';

export default function SettingsPage() {
    const { user, updateUser, updatePreferences } = useAuthStore();
    const [profile, setProfile] = useState({ name: user?.name || '', disabilityType: user?.disabilityType || 'multiple' });
    const [prefs, setPrefs] = useState<UserPreferences>(user?.preferences || { highContrast: false, largeText: false, voiceControl: false, ttsSpeed: 1, ttsPitch: 1, language: 'en-US' });
    const [contacts, setContacts] = useState<EmergencyContact[]>(user?.emergencyContacts || []);
    const [saving, setSaving] = useState(false);

    const saveProfile = async () => {
        setSaving(true);
        try {
            await userApi.updateProfile({ name: profile.name, disabilityType: profile.disabilityType });
            updateUser({ name: profile.name, disabilityType: profile.disabilityType as 'visual' | 'hearing' | 'physical' | 'multiple' });
            toast.success('Profile updated in MongoDB!');
        } catch { updateUser({ name: profile.name }); toast('Saved locally (server offline)', { icon: '⚡' }); }
        setSaving(false);
    };

    const savePreferences = async () => {
        setSaving(true);
        try {
            await userApi.updatePreferences({ preferences: prefs });
            updatePreferences(prefs);
            toast.success('Preferences saved to MongoDB!');
        } catch { updatePreferences(prefs); toast('Saved locally (server offline)', { icon: '⚡' }); }
        setSaving(false);
    };

    const saveContacts = async () => {
        setSaving(true);
        try {
            await userApi.updateEmergencyContacts(contacts);
            updateUser({ emergencyContacts: contacts });
            toast.success('Emergency contacts updated in MongoDB!');
        } catch { updateUser({ emergencyContacts: contacts }); toast('Saved locally (server offline)', { icon: '⚡' }); }
        setSaving(false);
    };

    const addContact = () => setContacts(c => [...c, { name: '', phone: '', email: '', relation: 'Family', isActive: true }]);
    const removeContact = (i: number) => setContacts(c => c.filter((_, idx) => idx !== i));
    const updateContact = (i: number, field: keyof EmergencyContact, value: string | boolean) =>
        setContacts(c => c.map((ct, idx) => idx === i ? { ...ct, [field]: value } : ct));

    return (
        <div className="feature-page">
            <div className="feature-header">
                <div className="feature-title-row">
                    <div className="feature-icon-badge" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }}>⚙️</div>
                    <div>
                        <h1 className="feature-title">Settings</h1>
                        <p className="feature-subtitle">Manage your profile, accessibility preferences, and emergency contacts</p>
                    </div>
                </div>
            </div>

            <div className="settings-sections">
                {/* Profile */}
                <div className="settings-card">
                    <h3 className="settings-card-title">👤 Profile</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="set-name">Full Name</label>
                            <input id="set-name" type="text" className="form-input" value={profile.name}
                                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="set-email">Email</label>
                            <input id="set-email" type="email" className="form-input" value={user?.email || ''} disabled />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Accessibility Profile</label>
                        <div className="disability-grid">
                            {[{ v: 'visual', l: '👁️ Visual' }, { v: 'hearing', l: '🦻 Hearing' }, { v: 'physical', l: '🦽 Physical' }, { v: 'multiple', l: '✦ Multiple' }].map(({ v, l }) => (
                                <button key={v} type="button" className={`disability-btn ${profile.disabilityType === v ? 'selected' : ''}`}
                                    onClick={() => setProfile(p => ({ ...p, disabilityType: v }))} id={`dtype-${v}`}>{l}</button>
                            ))}
                        </div>
                    </div>
                    <button className="action-btn primary-action" onClick={saveProfile} disabled={saving} id="save-profile">
                        <Save size={15} /> Save Profile
                    </button>
                </div>

                {/* Preferences */}
                <div className="settings-card">
                    <h3 className="settings-card-title">🎛 Accessibility Preferences</h3>
                    <div className="prefs-grid">
                        {[{ key: 'highContrast', label: '🔆 High Contrast Mode' }, { key: 'largeText', label: '🔠 Large Text Mode' }, { key: 'voiceControl', label: '🎤 Voice Control' }].map(({ key, label }) => (
                            <div className="pref-toggle" key={key}>
                                <span>{label}</span>
                                <button
                                    className={`toggle-btn ${prefs[key as keyof UserPreferences] ? 'toggle-on' : ''}`}
                                    onClick={() => setPrefs(p => ({ ...p, [key]: !p[key as keyof UserPreferences] }))}
                                    id={`pref-${key}`}>
                                    {prefs[key as keyof UserPreferences] ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="prefs-sliders">
                        <div className="pref-slider-row">
                            <label>TTS Speed: {prefs.ttsSpeed.toFixed(1)}x</label>
                            <input type="range" min="0.5" max="2" step="0.1" value={prefs.ttsSpeed} className="range-slider"
                                onChange={e => setPrefs(p => ({ ...p, ttsSpeed: parseFloat(e.target.value) }))} id="pref-speed" />
                        </div>
                        <div className="pref-slider-row">
                            <label>TTS Pitch: {prefs.ttsPitch.toFixed(1)}</label>
                            <input type="range" min="0.5" max="2" step="0.1" value={prefs.ttsPitch} className="range-slider"
                                onChange={e => setPrefs(p => ({ ...p, ttsPitch: parseFloat(e.target.value) }))} id="pref-pitch" />
                        </div>
                        <div className="pref-slider-row">
                            <label>Language</label>
                            <select className="form-input" value={prefs.language} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))} id="pref-lang">
                                {[['en-US', 'English'], ['hi-IN', 'Hindi'], ['ta-IN', 'Tamil'], ['te-IN', 'Telugu'], ['es-ES', 'Spanish'], ['fr-FR', 'French']].map(([code, name]) => (
                                    <option key={code} value={code}>{name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button className="action-btn primary-action" onClick={savePreferences} disabled={saving} id="save-prefs">
                        <Save size={15} /> Save Preferences
                    </button>
                </div>

                {/* Emergency Contacts */}
                <div className="settings-card">
                    <div className="sc-header">
                        <h3 className="settings-card-title">🆘 Emergency Contacts</h3>
                        <button className="action-btn" onClick={addContact} id="add-contact"><Plus size={14} /> Add</button>
                    </div>
                    {contacts.map((c, i) => (
                        <div key={i} style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                            {/* Row 1: Name + Phone + Relation */}
                            <div className="contact-form-row" style={{ marginBottom: '0.6rem' }}>
                                <input className="form-input" placeholder="Name *" value={c.name} id={`contact-name-${i}`}
                                    onChange={e => updateContact(i, 'name', e.target.value)} />
                                <input className="form-input" placeholder="Phone *" value={c.phone} id={`contact-phone-${i}`}
                                    onChange={e => updateContact(i, 'phone', e.target.value)} />
                                <input className="form-input" placeholder="Relation" value={c.relation} id={`contact-rel-${i}`}
                                    onChange={e => updateContact(i, 'relation', e.target.value)} />
                                <button className={`toggle-btn ${c.isActive ? 'toggle-on' : ''}`}
                                    onClick={() => updateContact(i, 'isActive', !c.isActive)} id={`contact-active-${i}`}>
                                    {c.isActive ? 'Active' : 'Off'}
                                </button>
                                <button className="icon-action-btn delete-btn" onClick={() => removeContact(i)} id={`del-contact-${i}`}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {/* Row 2: Email (used for SOS alerts) */}
                            <div style={{ position: 'relative' }}>
                                <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444', pointerEvents: 'none' }} />
                                <input
                                    className="form-input"
                                    type="email"
                                    placeholder="Email address (used for SOS emergency alert) *"
                                    value={c.email ?? ''}
                                    id={`contact-email-${i}`}
                                    onChange={e => updateContact(i, 'email', e.target.value)}
                                    style={{ paddingLeft: '36px', borderColor: c.email ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.3)', background: c.email ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)' }}
                                />
                                {c.email && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: '#10b981' }}>✓</span>}
                            </div>
                        </div>
                    ))}
                    {contacts.length === 0 && <p className="empty-hint">No contacts added. Click "Add" to create one.</p>}
                    <button className="action-btn primary-action" onClick={saveContacts} disabled={saving || contacts.length === 0} id="save-contacts">
                        <Save size={15} /> Save Contacts
                    </button>
                </div>
            </div>
        </div>
    );
}
