import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, googleLogin, resendVerification } from '../api/client';

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [unverified, setUnverified] = useState(false);
    const [resendMsg, setResendMsg] = useState('');
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
                    text: 'signin_with',
                    shape: 'rectangular',
                });
            }
        };

        // Google script might not be loaded yet
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

    const handleGoogleResponse = async (response) => {
        setError('');
        setLoading(true);
        try {
            const res = await googleLogin(response.credential);
            login(res.data.user, res.data.accessToken);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Google login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await loginUser(form);
            login(res.data.user, res.data.accessToken);
            navigate('/dashboard');
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed';
            setError(msg);
            if (typeof msg === 'string' && msg.toLowerCase().includes('verify')) {
                setUnverified(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Welcome Back</h1>
                <p className="subtitle">Sign in to your Serpynx account</p>

                {error && <div className="alert alert-error">{error}</div>}

                {unverified && (
                    <div style={{ textAlign: 'center', margin: '0.5rem 0 1rem' }}>
                        <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem' }}
                            onClick={async () => {
                                try {
                                    const res = await resendVerification(form.email);
                                    setResendMsg(res.data.message);
                                    setUnverified(false);
                                    setError('');
                                } catch {
                                    setResendMsg('Failed to resend. Try again.');
                                }
                            }}
                        >
                            📧 Resend verification email
                        </button>
                        {resendMsg && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{resendMsg}</p>}
                    </div>
                )}

                {/* Google Sign-In Button */}
                <div ref={googleBtnRef} className="google-btn-wrapper"></div>

                <div className="auth-divider">
                    <span>or sign in with email</span>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input className="form-input" type="email" value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required placeholder="you@example.com" />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input className="form-input" type="password" value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required placeholder="Enter your password" />
                    </div>

                    <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Don't have an account? <Link to="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
}
