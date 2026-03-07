import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const taglines = [
    "Where talent meets opportunity.",
    "Smart matching, real results.",
    "Build faster. Hire smarter.",
    "Your next project starts here.",
];

const features = [
    {
        icon: "⚡",
        title: "Smart Matching",
        desc: "Our algorithm matches your project with the best-fit developers based on skills, ratings, and past work.",
    },
    {
        icon: "🔒",
        title: "Secure & Transparent",
        desc: "Verified profiles, secure authentication, and transparent bidding ensure trust at every step.",
    },
    {
        icon: "🚀",
        title: "Ship Faster",
        desc: "Post a task, receive bids in minutes, and get your project completed by top developers worldwide.",
    },
];

const stats = [
    { value: "500+", label: "Developers" },
    { value: "1,200+", label: "Tasks Completed" },
    { value: "98%", label: "Satisfaction Rate" },
    { value: "24h", label: "Avg. Response Time" },
];

const reviews = [
    {
        name: "Sarah Chen",
        role: "CTO, NovaTech",
        text: "Serpynx transformed how we hire freelancers. The smart matching saved us weeks of screening.",
        rating: 5,
        avatar: "SC",
    },
    {
        name: "Marcus Williams",
        role: "Freelance Developer",
        text: "Best platform for finding quality projects. The bidding system is fair and transparent.",
        rating: 5,
        avatar: "MW",
    },
    {
        name: "Priya Sharma",
        role: "Product Manager",
        text: "We shipped our MVP in 2 weeks using Serpynx. The developers we found were exceptional.",
        rating: 4,
        avatar: "PS",
    },
    {
        name: "James Rodriguez",
        role: "Full Stack Dev",
        text: "Finally, a freelance platform that values quality over quantity. My earnings doubled.",
        rating: 5,
        avatar: "JR",
    },
];

function Typewriter({ texts }) {
    const [textIndex, setTextIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [display, setDisplay] = useState('');

    useEffect(() => {
        const current = texts[textIndex];
        let timeout;

        if (!isDeleting && charIndex <= current.length) {
            setDisplay(current.slice(0, charIndex));
            timeout = setTimeout(() => setCharIndex(c => c + 1), 80);
        } else if (!isDeleting && charIndex > current.length) {
            timeout = setTimeout(() => setIsDeleting(true), 2000);
        } else if (isDeleting && charIndex > 0) {
            setDisplay(current.slice(0, charIndex - 1));
            timeout = setTimeout(() => setCharIndex(c => c - 1), 40);
        } else {
            setIsDeleting(false);
            setTextIndex((textIndex + 1) % texts.length);
        }

        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, textIndex, texts]);

    return (
        <span className="typewriter-text">
            {display}
            <span className="typewriter-cursor">|</span>
        </span>
    );
}

export default function HomePage() {
    const { user } = useAuth();
    const [visibleSections, setVisibleSections] = useState(new Set());

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setVisibleSections(prev => new Set([...prev, entry.target.id]));
                    }
                });
            },
            { threshold: 0.15 }
        );

        document.querySelectorAll('.landing-section').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const isVisible = (id) => visibleSections.has(id);

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-logo">⚡ Serpynx</div>
                    <div className="landing-nav-links">
                        {user ? (
                            <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
                        ) : (
                            <>
                                <Link to="/login" className="landing-nav-link">Sign In</Link>
                                <Link to="/register" className="btn btn-primary">Get Started</Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="landing-hero">
                <div className="hero-content">
                    <p className="hero-eyebrow">THE SMART FREELANCE MARKETPLACE</p>
                    <h1 className="hero-title">
                        <Typewriter texts={taglines} />
                    </h1>
                    <p className="hero-subtitle">
                        Connect with top developers. Post tasks, receive intelligent bids,
                        and ship projects faster than ever before.
                    </p>
                    <div className="hero-actions">
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Start Free →
                        </Link>
                        <Link to="/tasks" className="btn btn-outline btn-lg">
                            Browse Tasks
                        </Link>
                    </div>
                </div>
                <div className="hero-glow" />
            </section>

            {/* Stats */}
            <section className={`landing-section landing-stats ${isVisible('stats') ? 'visible' : ''}`} id="stats">
                {stats.map((stat, i) => (
                    <div key={i} className="landing-stat" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="landing-stat-value">{stat.value}</div>
                        <div className="landing-stat-label">{stat.label}</div>
                    </div>
                ))}
            </section>

            {/* Features */}
            <section className={`landing-section landing-features ${isVisible('features') ? 'visible' : ''}`} id="features">
                <h2 className="section-title">Why Serpynx?</h2>
                <p className="section-subtitle">Everything you need to hire or get hired, built for the modern web.</p>
                <div className="features-grid">
                    {features.map((f, i) => (
                        <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.15}s` }}>
                            <div className="feature-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Reviews */}
            <section className={`landing-section landing-reviews ${isVisible('reviews') ? 'visible' : ''}`} id="reviews">
                <h2 className="section-title">Loved by developers & clients</h2>
                <p className="section-subtitle">Join hundreds who've found their perfect match on Serpynx.</p>
                <div className="reviews-grid">
                    {reviews.map((r, i) => (
                        <div key={i} className="review-card" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="review-stars">
                                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                            </div>
                            <p className="review-text">"{r.text}"</p>
                            <div className="review-author">
                                <div className="review-avatar">{r.avatar}</div>
                                <div>
                                    <div className="review-name">{r.name}</div>
                                    <div className="review-role">{r.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className={`landing-section landing-cta ${isVisible('cta') ? 'visible' : ''}`} id="cta">
                <h2>Ready to build something great?</h2>
                <p>Join Serpynx today — it's free to get started.</p>
                <Link to="/register" className="btn btn-primary btn-lg">
                    Create Your Account →
                </Link>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <span>⚡ Serpynx</span>
                    <span>© 2026. Built for developers, by developers.</span>
                </div>
            </footer>
        </div>
    );
}
