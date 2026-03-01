import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/client';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'FREELANCER', skills: '', bio: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

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
            login(res.data.user, res.data.accessToken);
            navigate('/dashboard');
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
                <h1>Join Serpynx</h1>
                <p className="subtitle">Create your account and start building</p>

                {error && <div className="alert alert-error">{error}</div>}

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
                        <input className="form-input" type="password" value={form.password} onChange={update('password')} required minLength={6} placeholder="Min 6 characters" />
                    </div>

                    <div className="form-group">
                        <label>I am a</label>
                        <div className="role-toggle">
                            <button type="button" className={form.role === 'FREELANCER' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'FREELANCER' })}>
                                🛠 Freelancer
                            </button>
                            <button type="button" className={form.role === 'CLIENT' ? 'active' : ''} onClick={() => setForm({ ...form, role: 'CLIENT' })}>
                                💼 Client
                            </button>
                        </div>
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
            </div>
        </div>
    );
}
