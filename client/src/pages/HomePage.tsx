import { useNavigate } from 'react-router-dom';
import { ArrowRight, Hand, Mic, FileText, AlertTriangle, Zap, Shield, Globe } from 'lucide-react';
import { useEffect, useRef } from 'react';

const features = [
    { icon: '👁️', title: 'OCR Text-to-Speech', desc: 'Camera-powered text reading for visually impaired', color: '#7C3AED' },
    { icon: '🤟', title: 'A–Z Sign Recognition', desc: 'Full ASL alphabet + 50 words via MediaPipe AI', color: '#06B6D4' },
    { icon: '🔊', title: 'Text to Speech', desc: 'Type or record — auto-reads aloud after 1 second', color: '#10b981' },
    { icon: '🆘', title: 'SOS Emergency', desc: 'Instant GPS-based emergency alerts', color: '#ef4444' },
];

export default function HomePage() {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: { x: number; y: number; vx: number; vy: number; radius: number; alpha: number }[] = [];
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
                radius: Math.random() * 2 + 0.5, alpha: Math.random() * 0.5 + 0.1
            });
        }

        let animId: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(124,58,237,${p.alpha})`; ctx.fill();
            });
            particles.forEach((p, i) => {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = p.x - particles[j].x, dy = p.y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(124,58,237,${0.08 * (1 - dist / 120)})`; ctx.lineWidth = 0.5; ctx.stroke();
                    }
                }
            });
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <div className="home-page">
            <canvas ref={canvasRef} className="particle-canvas" />
            <div className="home-orb home-orb-1"></div>
            <div className="home-orb home-orb-2"></div>
            <div className="home-orb home-orb-3"></div>

            {/* Hero */}
            <section className="home-hero">
                <div className="home-nav">
                    <div className="app-logo">
                        <svg viewBox="0 0 36 36" fill="none" width="36" height="36">
                            <circle cx="18" cy="18" r="17" stroke="url(#hng)" strokeWidth="2" />
                            <path d="M10 18c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke="url(#hng)" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="18" cy="18" r="3" fill="url(#hng)" />
                            <defs><linearGradient id="hng" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#7C3AED" /><stop offset="1" stopColor="#06B6D4" /></linearGradient></defs>
                        </svg>
                        <span className="brand-name">Access<span className="brand-accent">AI</span></span>
                    </div>
                    <div className="home-nav-actions">
                        <button className="btn-ghost" onClick={() => navigate('/login')} id="home-login">Sign In</button>
                        <button className="btn-primary-sm" onClick={() => navigate('/register')} id="home-register">Get Started</button>
                    </div>
                </div>

                <div className="hero-content-wrap">
                    <div className="hero-badge-pill">
                        <span className="badge-glow"></span>
                        🚀 AI-Powered Accessibility Platform
                    </div>
                    <h1 className="hero-h1">
                        One Platform.<br />
                        <span className="grad-text">Every Ability.</span><br />
                        Zero Barriers.
                    </h1>
                    <p className="hero-p">
                        Unified AI assistant providing real-time accessibility for visually impaired,
                        hearing impaired, and physically challenged individuals through sign language
                        recognition, OCR, speech processing, and emergency SOS.
                    </p>
                    <div className="hero-btns">
                        <button className="btn-primary-lg" onClick={() => navigate('/register')} id="hero-cta">
                            <span>Start Free</span> <ArrowRight size={20} />
                        </button>
                        <button className="btn-outline-lg" onClick={() => navigate('/login')} id="hero-login">
                            Sign In →
                        </button>
                    </div>
                    <div className="hero-stats-row">
                        <div className="hstat"><span className="hstat-num">26+</span><span className="hstat-lbl">ASL Signs</span></div>
                        <div className="hstat-sep"></div>
                        <div className="hstat"><span className="hstat-num">50+</span><span className="hstat-lbl">Sign Words</span></div>
                        <div className="hstat-sep"></div>
                        <div className="hstat"><span className="hstat-num">98%</span><span className="hstat-lbl">Accuracy</span></div>
                        <div className="hstat-sep"></div>
                        <div className="hstat"><span className="hstat-num">&lt;3s</span><span className="hstat-lbl">SOS Alert</span></div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="home-features">
                <div className="section-tag-sm">Key Features</div>
                <h2 className="section-h2">Built for <span className="grad-text">Every Need</span></h2>
                <div className="features-row">
                    {features.map(({ icon, title, desc, color }) => (
                        <div className="feat-card" key={title} style={{ '--accent': color } as React.CSSProperties}>
                            <div className="feat-icon-wrap">{icon}</div>
                            <h3 className="feat-title">{title}</h3>
                            <p className="feat-desc">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tech Stack */}
            <section className="home-tech">
                <h2 className="section-h2">Powered by <span className="grad-text">Cutting-Edge AI</span></h2>
                <div className="tech-pills-row">
                    {['Python', 'OpenCV', 'MediaPipe', 'PyTorch', 'Whisper AI', 'Tesseract OCR', 'FastAPI', 'MongoDB', 'React', 'TypeScript', 'Node.js'].map(t => (
                        <span className="tech-pill-lg" key={t}>{t}</span>
                    ))}
                </div>
                <div className="tech-highlights">
                    <div className="tech-hl"><Zap size={20} className="hl-icon" /><span>Real-time AI inference at 30 FPS</span></div>
                    <div className="tech-hl"><Shield size={20} className="hl-icon" /><span>Secure JWT authentication</span></div>
                    <div className="tech-hl"><Globe size={20} className="hl-icon" /><span>99 languages supported</span></div>
                    <div className="tech-hl"><Hand size={20} className="hl-icon" /><span>21 hand landmark keypoints</span></div>
                    <div className="tech-hl"><Mic size={20} className="hl-icon" /><span>Background voice trigger</span></div>
                    <div className="tech-hl"><FileText size={20} className="hl-icon" /><span>High-accuracy Tesseract OCR</span></div>
                </div>
            </section>

            {/* CTA */}
            <section className="home-cta">
                <div className="cta-glass">
                    <AlertTriangle size={32} className="cta-icon-big" />
                    <h2>Ready to Make Technology Accessible?</h2>
                    <p>Join AccessAI — where AI meets inclusivity. Free to use, built for everyone.</p>
                    <button className="btn-primary-lg" onClick={() => navigate('/register')} id="bottom-cta">
                        Create Free Account <ArrowRight size={20} />
                    </button>
                </div>
            </section>

            <footer className="home-footer">
                <p>© 2026 AccessAI · Built with React, TypeScript, Node.js & MongoDB · Hackathon 2026</p>
            </footer>
        </div>
    );
}
