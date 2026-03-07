import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyTeams, createTeam } from '../api/client';
import { Loading } from '../components/UI';

export default function Teams() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const res = await getMyTeams();
            setTeams(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        try {
            await createTeam(form);
            setForm({ name: '', description: '' });
            setShowCreate(false);
            fetchTeams();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create team');
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>My Teams</h1>
                    <p>Collaborate with fellow freelancers on bigger projects</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
                    {showCreate ? 'Cancel' : '➕ Create Team'}
                </button>
            </div>

            {showCreate && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>Create New Team</h3>
                    {error && <div className="alert alert-error">{error}</div>}
                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label>Team Name</label>
                            <input
                                className="form-input"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Full Stack Squad"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Description (optional)</label>
                            <textarea
                                className="form-textarea"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="What does your team specialize in?"
                                rows={2}
                            />
                        </div>
                        <button className="btn btn-primary" disabled={creating}>
                            {creating ? 'Creating...' : 'Create Team'}
                        </button>
                    </form>
                </div>
            )}

            {teams.length === 0 ? (
                <div className="empty-state">
                    <h3>No teams yet</h3>
                    <p>Create a team to collaborate with other freelancers and bid on bigger projects together.</p>
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
                        Create Your First Team
                    </button>
                </div>
            ) : (
                <div className="tasks-grid">
                    {teams.map(team => (
                        <Link to={`/teams/${team.id}`} key={team.id} style={{ textDecoration: 'none' }}>
                            <div className="card">
                                <div className="card-header">
                                    <span className="card-title">🤝 {team.name}</span>
                                    <span className="badge badge-open">{team._count?.members || 0} members</span>
                                </div>
                                {team.description && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 12 }}>
                                        {team.description}
                                    </p>
                                )}
                                <div className="card-meta">
                                    {team._count?.bids || 0} team bids placed
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                                    {team.members?.slice(0, 4).map(m => (
                                        <span key={m.user.id} className="skill-tag">{m.user.name}</span>
                                    ))}
                                    {team.members?.length > 4 && (
                                        <span className="skill-tag">+{team.members.length - 4} more</span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
