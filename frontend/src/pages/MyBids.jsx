import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyBids } from '../api/client';
import { StatusBadge, ScoreBar, SkillTags, Loading } from '../components/UI';

export default function MyBids() {
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMyBids()
            .then((res) => setBids(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>My Bids</h1>
                    <p>Track all your submitted bids and their status</p>
                </div>
            </div>

            {bids.length === 0 ? (
                <div className="empty-state">
                    <h3>No bids yet</h3>
                    <p>Browse available tasks and start bidding</p>
                    <Link to="/tasks" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Tasks</Link>
                </div>
            ) : (
                <div>
                    {bids.map((bid) => (
                        <Link to={`/tasks/${bid.Task?.id}`} key={bid.id} style={{ textDecoration: 'none' }}>
                            <div className="bid-card">
                                <div className="bid-header">
                                    <div>
                                        <div className="bid-freelancer">{bid.Task?.title}</div>
                                        <div style={{ marginTop: 4 }}>
                                            <SkillTags skills={bid.Task?.requiredSkills} />
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <StatusBadge status={bid.status} />
                                        {bid.Task?.status && (
                                            <div style={{ marginTop: 4 }}>
                                                <span className="card-meta">Task: </span>
                                                <StatusBadge status={bid.Task.status} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bid-details">
                                    <span>💰 Your bid: <strong>${bid.amount}</strong></span>
                                    <span>⏱ {bid.estimatedDays} days</span>
                                    <span>📊 Task budget: ${bid.Task?.budget}</span>
                                </div>
                                <ScoreBar score={bid.smartScore || 0} />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
