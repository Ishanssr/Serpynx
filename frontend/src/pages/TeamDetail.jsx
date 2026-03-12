import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTeam, inviteToTeam, leaveTeam, removeTeamMember } from '../api/client';
import { Loading } from '../components/UI';

export default function TeamDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTeam();
    }, [id]);

    const fetchTeam = async () => {
        try {
            const res = await getTeam(id);
            setTeam(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviting(true);
        setError('');
        setMessage('');
        try {
            const res = await inviteToTeam(id, { email: inviteEmail });
            setMessage(res.data.message);
            setInviteEmail('');
            fetchTeam();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to invite');
        } finally {
            setInviting(false);
        }
    };

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to leave this team?')) return;
        try {
            await leaveTeam(id);
            navigate('/teams');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to leave team');
        }
    };

    const handleRemove = async (memberId, memberName) => {
        if (!confirm(`Remove ${memberName} from the team?`)) return;
        try {
            await removeTeamMember(id, memberId);
            fetchTeam();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove member');
        }
    };

    if (loading) return <Loading />;
    if (!team) return <div className="empty-state"><h3>Team not found</h3></div>;

    const myMembership = team.members?.find(m => m.userId === user?.id);
    const isLeader = myMembership?.role === 'LEADER';

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>🤝 {team.name}</h1>
                    <p>{team.description || 'No description'}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Link to="/teams" className="btn btn-secondary">← Back</Link>
                    <button className="btn btn-danger btn-sm" onClick={handleLeave}>
                        Leave Team
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}

            {/* Invite Section */}
            {isLeader && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 12 }}>Invite a Freelancer</h3>
                    <form onSubmit={handleInvite} style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Email Address</label>
                            <input
                                className="form-input"
                                type="email"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                placeholder="freelancer@email.com"
                                required
                            />
                        </div>
                        <button className="btn btn-primary" disabled={inviting}>
                            {inviting ? 'Inviting...' : 'Invite'}
                        </button>
                    </form>
                </div>
            )}

            {/* Members */}
            <div className="detail-section">
                <h2>Team Members ({team.members?.length || 0})</h2>
                <div className="tasks-grid">
                    {team.members?.map(m => (
                        <div key={m.user.id} className="card">
                            <div className="card-header">
                                <div>
                                    <span className="card-title">{m.user.name}</span>
                                    <div className="card-meta">{m.user.email}</div>
                                </div>
                                <span className={`badge ${m.role === 'LEADER' ? 'badge-recommended' : 'badge-open'}`}>
                                    {m.role}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                {m.user.skills?.map((s, i) => (
                                    <span key={i} className="skill-tag">{s}</span>
                                ))}
                            </div>
                            {m.user.avgRating > 0 && (
                                <div className="star-display" style={{ marginTop: 8 }}>
                                    ⭐ {m.user.avgRating.toFixed(1)}
                                </div>
                            )}
                            {isLeader && m.userId !== user?.id && (
                                <button
                                    className="btn btn-danger btn-sm"
                                    style={{ marginTop: 12 }}
                                    onClick={() => handleRemove(m.userId, m.user.name)}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Team Bids */}
            {team.bids?.length > 0 && (
                <div className="detail-section">
                    <h2>Recent Team Bids</h2>
                    {team.bids.map(bid => (
                        <Link to={`/tasks/${bid.task?.id}`} key={bid.id} style={{ textDecoration: 'none' }}>
                            <div className="bid-card">
                                <div className="bid-header">
                                    <span className="bid-freelancer">{bid.task?.title}</span>
                                    <span className="bid-amount">${bid.amount}</span>
                                </div>
                                <div className="card-meta">{bid.task?.status}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
