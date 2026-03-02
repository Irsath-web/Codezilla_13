import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, Settings, Accessibility } from 'lucide-react';
import { useAuthStore, useAppStore } from '../store';
import toast from 'react-hot-toast';

export default function Navbar() {
    const { user, logout } = useAuthStore();
    const { toggleHighContrast, highContrast } = useAppStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/');
    };

    return (
        <nav className="navbar-app">
            <div className="navbar-app-left">
                <div className="app-logo" onClick={() => navigate('/dashboard')}>
                    <div className="logo-mark">
                        <svg viewBox="0 0 36 36" fill="none" width="36" height="36">
                            <circle cx="18" cy="18" r="17" stroke="url(#ng)" strokeWidth="2" />
                            <path d="M10 18c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke="url(#ng)" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="18" cy="18" r="3" fill="url(#ng)" />
                            <defs><linearGradient id="ng" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#7C3AED" /><stop offset="1" stopColor="#06B6D4" /></linearGradient></defs>
                        </svg>
                    </div>
                    <span className="brand-name">Access<span className="brand-accent">AI</span></span>
                </div>
            </div>

            <div className="navbar-app-right">
                <button
                    className={`nav-icon-btn tooltip-btn ${highContrast ? 'active-state' : ''}`}
                    onClick={toggleHighContrast}
                    title="Toggle High Contrast"
                    aria-label="Toggle high contrast mode"
                >
                    <Accessibility size={18} />
                </button>
                <button className="nav-icon-btn tooltip-btn" title="Notifications" aria-label="Notifications">
                    <Bell size={18} />
                    <span className="notif-dot"></span>
                </button>
                <button className="nav-icon-btn tooltip-btn" onClick={() => navigate('/settings')} title="Settings" aria-label="Settings">
                    <Settings size={18} />
                </button>
                <div className="user-pill">
                    <div className="user-avatar-sm">
                        {user?.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="user-name-sm">{user?.name?.split(' ')[0]}</span>
                </div>
                <button className="nav-icon-btn logout-btn" onClick={handleLogout} title="Logout" aria-label="Logout">
                    <LogOut size={18} />
                </button>
            </div>
        </nav>
    );
}
