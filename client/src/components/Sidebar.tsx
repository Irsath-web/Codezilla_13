import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Hand, Mic, FileText, AlertTriangle,
    History, Settings, ChevronRight
} from 'lucide-react';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#7C3AED' },
    { to: '/sign-language', icon: Hand, label: 'Sign Language', color: '#06B6D4' },
    { to: '/speech-to-text', icon: Mic, label: 'Text to Speech', color: '#10b981' },
    { to: '/ocr', icon: FileText, label: 'OCR Reader', color: '#f59e0b' },
    { to: '/sos', icon: AlertTriangle, label: 'SOS Emergency', color: '#ef4444' },
    { to: '/history', icon: History, label: 'History', color: '#8b5cf6' },
    { to: '/settings', icon: Settings, label: 'Settings', color: '#64748b' },
];

export default function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-inner">
                <div className="sidebar-section-label">Navigation</div>
                <nav className="sidebar-nav">
                    {navItems.map(({ to, icon: Icon, label, color }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            {({ isActive }) => (
                                <>
                                    <div
                                        className="sidebar-icon"
                                        style={{ color: isActive ? color : 'var(--text-muted)', background: isActive ? `${color}22` : 'transparent' }}
                                    >
                                        <Icon size={20} />
                                    </div>
                                    <span className="sidebar-label">{label}</span>
                                    {isActive && <ChevronRight size={14} className="sidebar-chevron" />}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-version">
                        <span>AccessAI v1.0</span>
                        <span className="version-badge">Beta</span>
                    </div>
                    <div className="tech-stack-pills">
                        <span className="tech-pill">React</span>
                        <span className="tech-pill">TypeScript</span>
                        <span className="tech-pill">MongoDB</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
