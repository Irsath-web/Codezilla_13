import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { authApi } from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import type { User } from '../types';

const DISABILITY_TYPES = [
    { value: 'visual', label: '👁️ Visually Impaired' },
    { value: 'hearing', label: '🦻 Hearing Impaired' },
    { value: 'physical', label: '🦽 Physically Challenged' },
    { value: 'multiple', label: '✦ Multiple / General' },
];

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', disabilityType: 'multiple' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) {
            toast.error('Please fill in all fields');
            return;
        }
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const res = await authApi.register(form);
            const { user, token } = res.data;
            setAuth(user as User, token as string);
            toast.success(`Welcome to AccessAI, ${(user as User).name.split(' ')[0]}! 🎉`);
            navigate('/dashboard');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg">
                <div className="auth-orb auth-orb-1"></div>
                <div className="auth-orb auth-orb-2"></div>
            </div>
            <div className="auth-card wide-card">
                <div className="auth-logo">
                    <svg viewBox="0 0 40 40" fill="none" width="48" height="48">
                        <circle cx="20" cy="20" r="19" stroke="url(#rg)" strokeWidth="2" />
                        <path d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke="url(#rg)" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="20" cy="20" r="3" fill="url(#rg)" />
                        <defs><linearGradient id="rg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#7C3AED" /><stop offset="1" stopColor="#06B6D4" /></linearGradient></defs>
                    </svg>
                    <h1>Access<span style={{ color: '#06B6D4' }}>AI</span></h1>
                </div>
                <h2 className="auth-title">Create Your Account</h2>
                <p className="auth-subtitle">Join AccessAI and unlock your accessibility superpowers</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="reg-name">Full Name</label>
                            <input id="reg-name" type="text" className="form-input" placeholder="Your full name"
                                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="reg-email">Email</label>
                            <input id="reg-email" type="email" className="form-input" placeholder="you@example.com"
                                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="email" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-password">Password</label>
                        <div className="input-with-icon">
                            <input id="reg-password" type={showPassword ? 'text' : 'password'} className="form-input"
                                placeholder="Minimum 6 characters" value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
                            <button type="button" className="input-icon-btn" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Accessibility Profile</label>
                        <div className="disability-grid">
                            {DISABILITY_TYPES.map(({ value, label }) => (
                                <button key={value} type="button"
                                    className={`disability-btn ${form.disabilityType === value ? 'selected' : ''}`}
                                    onClick={() => setForm(f => ({ ...f, disabilityType: value }))}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="btn-auth" disabled={loading} id="register-submit">
                        {loading ? <Loader2 size={18} className="spin" /> : null}
                        <span>{loading ? 'Creating account...' : 'Create Account'}</span>
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>
                <p className="auth-switch">
                    Already have an account? <a href="/login" className="auth-link">Sign in →</a>
                </p>
            </div>
        </div>
    );
}
