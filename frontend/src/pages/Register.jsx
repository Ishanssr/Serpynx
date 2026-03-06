import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser, googleLogin } from '../api/client';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'FREELANCER', skills: '', bio: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registered, setRegistered] = useState(false);
    const [googleRole, setGoogleRole] = useState('FREELANCER');
    const { login } = useAuth();
    const navigate = useNavigate();
    const googleBtnRef = useRef(null);

    useEffect(() => {
        const initGoogle = () => {
            if (window.google && googleBtnRef.current) {
                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                });
                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'filled_black',
                    size: 'large',
                    width: '100%',
                    text: 'signup_with',
                    shape: 'rectangular',
                });
            }
        };

        if (window.google) {
            initGoogle();
        } else {
            const interval = setInterval(() => {
                if (window.google) {
                    clearInterval(interval);
                    initGoogle();
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, []);

    // Re-initialize Google when role changes so the callback captures the latest role
    useEffect(() => {
        if (window.google && googleBtnRef.current) {
            window.google.accounts.id.initialize({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
            });
        }
    }, [googleRole]);

    const handleGoogleResponse = async (response) => {
        setError('');
        setLoading(true);
        try {
            const res = await googleLogin(response.credential, googleRole);
            login(res.data.user, res.data.accessToken);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Google signup failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const skillsArr = form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
            const res = await registerUser({
                ...form,
                skills: skillsArr,
            });
            setRegistered(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    return (
        <div className="auth-container">
            <div className="auth-card">
                {registered ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
                        <h1>Check your email!</h1>
                        <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
                            We've sent a verification link to <strong>{form.email}</strong>.
                            Please click the link to verify your account.
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Already verified? <Link to="/login">Sign in</Link>
                        </p>
                    </div>
                ) : (
                    <>
                        <h1>Join Serpynx</h1>
                        <p className="subtitle">Create your account and start building</p>

                        {error && <div className="alert alert-error">{error}</div>}

                        {/* Role selector for Google signup */}
                        <div className="form-group">
                            <label>I want to join as</label>
                            <div className="role-toggle">
                                <button type="button" className={googleRole === 'FREELANCER' ? 'active' : ''} onClick={() => { setGoogleRole('FREELANCER'); setForm({ ...form, role: 'FREELANCER' }); }}>
                                    🛠 Freelancer
                                </button>
                                <button type="button" className={googleRole === 'CLIENT' ? 'active' : ''} onClick={() => { setGoogleRole('CLIENT'); setForm({ ...form, role: 'CLIENT' }); }}>
                                    💼 Client
                                </button>
                            </div>
                        </div>

                        {/* Google Sign-Up Button */}
                        <div ref={googleBtnRef} className="google-btn-wrapper"></div>

                        <div className="auth-divider">
                            <span>or sign up with email</span>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input className="form-input" value={form.name} onChange={update('name')} required placeholder="John Doe" />
                            </div>

                            <div className="form-group">
                                <label>Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={update('email')} required placeholder="you@example.com" />
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <input className="form-input" type="password" value={form.password} onChange={update('password')} required minLength={8} placeholder="Min 8 chars, upper + lower + number" />
                            </div>

                            {form.role === 'FREELANCER' && (
                                <>
                                    <div className="form-group">
                                        <label>Skills (comma separated)</label>
                                        <input className="form-input" value={form.skills} onChange={update('skills')} placeholder="React, Node.js, Python" />
                                    </div>
                                    <div className="form-group">
                                        <label>Bio</label>
                                        <textarea className="form-textarea" value={form.bio} onChange={update('bio')} placeholder="Tell clients about yourself..." rows={3} />
                                    </div>
                                </>
                            )}

                            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Already have an account? <Link to="/login">Sign in</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
