import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPublicProfile, getConnectionStatus, sendChatRequest } from '../api/client';
import { StarRating, SkillTags, Loading } from '../components/UI';

export default function PublicProfile() {
    const { id } = useParams();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [connection, setConnection] = useState(null);
    const [connectLoading, setConnectLoading] = useState(false);
    const [connectError, setConnectError] = useState('');

    useEffect(() => {
        getPublicProfile(id)
            .then((res) => setProfile(res.data))
            .catch((err) => setError(err.response?.data?.message || 'User not found'))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!id || !user || user.id === id) return;

        getConnectionStatus(id)
            .then((res) => setConnection(res.data))
            .catch(() => {
                // Ignore connection status errors to avoid blocking profile view
            });
    }, [id, user]);

    const handleConnect = async () => {
        if (!id) return;
        setConnectError('');
        setConnectLoading(true);
        try {
            await sendChatRequest({ receiverId: id });
            const res = await getConnectionStatus(id);
            setConnection(res.data);
        } catch (err) {
            setConnectError(err?.response?.data?.message || 'Failed to send connection request');
        } finally {
            setConnectLoading(false);
        }
    };

    if (loading) return <Loading />;
    if (error) return (
        <div className="empty-state">
            <h3>{error}</h3>
            <Link to="/freelancers" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Freelancers</Link>
        </div>
    );
    if (!profile) return null;

    const isFreelancer = profile.role === 'FREELANCER';
    const isOwnProfile = user?.id === profile.id;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>{profile.name}</h1>
                    <p>{isFreelancer ? 'Freelancer' : 'Client'} · Joined {new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 800 }}>
                {/* Profile card */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'var(--accent-gradient)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.8rem', fontWeight: 800, color: 'white',
                        }}>
                            {profile.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{profile.name}</h2>
                            <span className={`badge ${isFreelancer ? 'badge-assigned' : 'badge-open'}`}>
                                {profile.role}
                            </span>
                        </div>
                    </div>

                    {!isOwnProfile && (
                        <div style={{ marginBottom: 16 }}>
                            {connection?.status === 'ACCEPTED' ? (
                                <Link to="/chat" className="connect-btn connected">
                                    <span>Message</span>
                                </Link>
                            ) : connection?.status === 'PENDING' ? (
                                <button
                                    type="button"
                                    className={`connect-btn ${connection.direction === 'SENT' ? 'pending' : ''}`}
                                    disabled
                                >
                                    {connection.direction === 'SENT' ? 'Request pending' : 'Request received'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="connect-btn"
                                    onClick={handleConnect}
                                    disabled={connectLoading}
                                >
                                    {connectLoading ? 'Sending...' : 'Connect'}
                                </button>
                            )}
                            {connectError && (
                                <div className="alert alert-error" style={{ marginTop: 8 }}>
                                    {connectError}
                                </div>
                            )}
                        </div>
                    )}

                    {isFreelancer && profile.avgRating > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <StarRating value={Math.round(profile.avgRating)} readonly />
                                <span className="card-meta">
                                    {profile.avgRating.toFixed(1)} ({profile.totalReviews} reviews)
                                </span>
                            </div>
                        </div>
                    )}

                    {profile.bio && (
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                            {profile.bio}
                        </p>
                    )}

                    {isFreelancer && profile.skills?.length > 0 && (
                        <div>
                            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                                Skills
                            </label>
                            <SkillTags skills={profile.skills} />
                        </div>
                    )}
                </div>

                {/* Stats card */}
                <div className="card">
                    <h3 style={{ marginTop: 0, marginBottom: 16 }}>📊 Stats</h3>
                    <div className="detail-info">
                        {isFreelancer ? (
                            <>
                                <div className="detail-info-item">
                                    <label>Completed Jobs</label>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{profile.stats.completedTasks}</span>
                                </div>
                                <div className="detail-info-item">
                                    <label>Active Bids</label>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{profile.stats.activeBids}</span>
                                </div>
                                <div className="detail-info-item">
                                    <label>Total Earned</label>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>${profile.stats.totalEarned}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="detail-info-item">
                                    <label>Total Tasks</label>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{profile.stats.totalTasks}</span>
                                </div>
                                <div className="detail-info-item">
                                    <label>Open Tasks</label>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{profile.stats.openTasks}</span>
                                </div>
                                <div className="detail-info-item">
                                    <label>Completed</label>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{profile.stats.completedTasks}</span>
                                </div>
                                <div className="detail-info-item">
                                    <label>Total Spent</label>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>${profile.stats.totalSpent}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Recent work for freelancers */}
                    {isFreelancer && profile.stats.recentWork?.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                            <h4 style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>Recent Work</h4>
                            {profile.stats.recentWork.map((work) => (
                                <Link to={`/tasks/${work.id}`} key={work.id} style={{ textDecoration: 'none' }}>
                                    <div style={{
                                        padding: '10px 12px', marginBottom: 8,
                                        borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border, #333)',
                                    }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{work.title}</div>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                            <span className="card-meta">${work.budget}</span>
                                            {work.review && (
                                                <span className="card-meta">⭐ {work.review.rating}/5</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
