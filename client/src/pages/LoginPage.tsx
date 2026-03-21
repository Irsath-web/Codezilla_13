import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { authApi } from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';
import type { User } from '../types';

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            toast.error('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            const res = await authApi.login(form);
            const { user, token } = res.data;
            setAuth(user as User, token as string);
            toast.success(`Welcome back, ${(user as User).name.split(' ')[0]}! 👋`);
            navigate('/dashboard');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || 'Login failed');
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
            <div className="auth-card">
                <div className="auth-logo">
                    <svg viewBox="0 0 40 40" fill="none" width="48" height="48">
                        <circle cx="20" cy="20" r="19" stroke="url(#alg)" strokeWidth="2" />
                        <path d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke="url(#alg)" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="20" cy="20" r="3" fill="url(#alg)" />
                        <defs><linearGradient id="alg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#7C3AED" /><stop offset="1" stopColor="#06B6D4" /></linearGradient></defs>
                    </svg>
                    <h1>Access<span style={{ color: '#06B6D4' }}>AI</span></h1>
                </div>
                <h2 className="auth-title">Welcome Back</h2>
                <p className="auth-subtitle">Sign in to your accessibility assistant</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-password">Password</label>
                        <div className="input-with-icon">
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                autoComplete="current-password"
                            />
                            <button type="button" className="input-icon-btn" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn-auth" disabled={loading} id="login-submit">
                        {loading ? <Loader2 size={18} className="spin" /> : null}
                        <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div className="auth-demo-box">
                    <p>🧪 <strong>Demo credentials:</strong></p>
                    <p>Email: <code>demo@accessai.com</code> &nbsp;|&nbsp; Password: <code>demo1234</code></p>
                </div>

                <p className="auth-switch">
                    Don't have an account? <a href="/register" className="auth-link">Create one →</a>
                </p>
            </div>
        </div>
    );
}
