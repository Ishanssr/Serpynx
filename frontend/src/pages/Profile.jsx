import { useAuth } from '../context/AuthContext';
import { StarRating, SkillTags } from '../components/UI';

export default function Profile() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Profile</h1>
                    <p>Your account details</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'var(--accent-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 800, color: 'white'
                    }}>
                        {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{user.name}</h2>
                        <span className={`badge ${user.role === 'CLIENT' ? 'badge-open' : 'badge-assigned'}`}>
                            {user.role}
                        </span>
                    </div>
                </div>

                <div className="detail-info">
                    <div className="detail-info-item">
                        <label>Email</label>
                        <span>{user.email}</span>
                    </div>
                    <div className="detail-info-item">
                        <label>Member since</label>
                        <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                {user.role === 'FREELANCER' && (
                    <>
                        <div style={{ marginTop: 16, marginBottom: 16 }}>
                            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                                Rating
                            </label>
                            {user.avgRating > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <StarRating value={Math.round(user.avgRating)} readonly />
                                    <span className="card-meta">({user.totalReviews} reviews)</span>
                                </div>
                            ) : (
                                <span className="card-meta">No reviews yet</span>
                            )}
                        </div>

                        <div>
                            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                                Skills
                            </label>
                            {user.skills?.length > 0 ? (
                                <SkillTags skills={user.skills} />
                            ) : (
                                <span className="card-meta">No skills added yet</span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
