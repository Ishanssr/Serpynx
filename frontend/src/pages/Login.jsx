import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/client';

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await loginUser(form);
            login(res.data.user, res.data.accessToken);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
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
