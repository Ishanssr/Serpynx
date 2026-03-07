import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTask, createBid, acceptBid, submitWork, createReview, getMyTeams } from '../api/client';
import { ScoreBar, StarRating, StatusBadge, SkillTags, Loading } from '../components/UI';

export default function TaskDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bidForm, setBidForm] = useState({ amount: '', coverLetter: '', estimatedDays: '', teamId: '' });
    const [submitForm, setSubmitForm] = useState({ content: '', link: '' });
    const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showBidForm, setShowBidForm] = useState(false);
    const [myTeams, setMyTeams] = useState([]);

    const fetchTask = async () => {
        try {
            const res = await getTask(id);
            setTask(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTask();
        if (user?.role === 'FREELANCER') {
            getMyTeams().then(res => setMyTeams(Array.isArray(res.data) ? res.data : [])).catch(() => { });
        }
    }, [id]);

    if (loading) return <Loading />;
    if (!task) return <div className="empty-state"><h3>Task not found</h3></div>;

    const isOwner = user?.id === task.clientId;
    const isAssigned = user?.id === task.assignedToId;
    const isFreelancer = user?.role === 'FREELANCER';
    const alreadyBid = task.bids?.some(b => b.freelancerId === user?.id);

    const handleBid = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        try {
            const bidData = {
                amount: Number(bidForm.amount),
                coverLetter: bidForm.coverLetter,
                estimatedDays: Number(bidForm.estimatedDays),
            };
            if (bidForm.teamId) bidData.teamId = bidForm.teamId;
            await createBid(id, bidData);
            setSuccess('Bid placed successfully!');
            setShowBidForm(false);
            fetchTask();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to place bid');
        }
    };

    const handleAcceptBid = async (bidId) => {
        try {
            await acceptBid(bidId);
            setSuccess('Bid accepted! Task assigned.');
            fetchTask();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to accept bid');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        try {
            await submitWork(id, submitForm);
            setSuccess('Work submitted for review!');
            fetchTask();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit work');
        }
    };

    const handleReview = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        try {
            await createReview(id, reviewForm);
            setSuccess('Review submitted! Task completed.');
            fetchTask();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit review');
        }
    };

    return (
        <div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
                ← Back
            </button>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Task Header */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{task.title}</h1>
                    <StatusBadge status={task.status} />
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>{task.description}</p>

                <div className="detail-info">
                    <div className="detail-info-item">
                        <label>Budget</label>
                        <span className="budget">${task.budget}</span>
                    </div>
                    <div className="detail-info-item">
                        <label>Posted by</label>
                        <span>{task.client?.name}</span>
                    </div>
                    <div className="detail-info-item">
                        <label>Total Bids</label>
                        <span>{task.bids?.length || 0}</span>
                    </div>
                    <div className="detail-info-item">
                        <label>Created</label>
                        <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <SkillTags skills={task.requiredSkills} />
            </div>

            {/* Place Bid (Freelancer + OPEN task) */}
            {isFreelancer && task.status === 'OPEN' && !alreadyBid && (
                <div className="detail-section">
                    {!showBidForm ? (
                        <button className="btn btn-primary" onClick={() => setShowBidForm(true)}>
                            🎯 Place a Bid
                        </button>
                    ) : (
                        <div className="card">
                            <h2 style={{ marginBottom: 16 }}>Place Your Bid</h2>
                            <form onSubmit={handleBid}>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Your Price ($)</label>
                                        <input className="form-input" type="number" value={bidForm.amount}
                                            onChange={(e) => setBidForm({ ...bidForm, amount: e.target.value })}
                                            required min={1} placeholder="500" />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Estimated Days</label>
                                        <input className="form-input" type="number" value={bidForm.estimatedDays}
                                            onChange={(e) => setBidForm({ ...bidForm, estimatedDays: e.target.value })}
                                            required min={1} placeholder="7" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Cover Letter</label>
                                    <textarea className="form-textarea" value={bidForm.coverLetter}
                                        onChange={(e) => setBidForm({ ...bidForm, coverLetter: e.target.value })}
                                        required placeholder="Why are you the best fit for this task?" rows={4} />
                                </div>
                                {myTeams.length > 0 && (
                                    <div className="form-group">
                                        <label>Bid as Team (optional)</label>
                                        <select className="form-select" value={bidForm.teamId}
                                            onChange={(e) => setBidForm({ ...bidForm, teamId: e.target.value })}>
                                            <option value="">Solo Bid</option>
                                            {myTeams.map(t => (
                                                <option key={t.id} value={t.id}>🤝 {t.name} ({t._count?.members || t.members?.length} members)</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button className="btn btn-primary" type="submit">Submit Bid</button>
                                    <button className="btn btn-secondary" type="button" onClick={() => setShowBidForm(false)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {alreadyBid && task.status === 'OPEN' && (
                <div className="alert alert-success" style={{ marginBottom: 24 }}>✅ You have already placed a bid on this task</div>
            )}

            {/* Bids List */}
            {task.bids?.length > 0 && (
                <div className="detail-section">
                    <h2>Bids ({task.bids.length}) — Ranked by Smart Score</h2>
                    {task.bids.map((bid, index) => (
                        <div key={bid.id} className={`bid-card ${index === 0 && task.bids.length > 1 ? 'recommended' : ''}`}>
                            {index === 0 && task.bids.length > 1 && (
                                <span className="badge badge-recommended" style={{ marginBottom: 8, display: 'inline-block' }}>⚡ Recommended</span>
                            )}
                            <div className="bid-header">
                                <div>
                                    <div className="bid-freelancer">
                                        {bid.freelancer?.name}
                                        {bid.team && <span className="badge badge-open" style={{ marginLeft: 8 }}>🤝 {bid.team.name}</span>}
                                    </div>
                                    <div style={{ marginTop: 4 }}>
                                        <SkillTags skills={bid.freelancer?.skills} />
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="bid-amount">${bid.amount}</div>
                                    <div className="card-meta">{bid.estimatedDays} days</div>
                                </div>
                            </div>
                            <div style={{ margin: '12px 0' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Smart Score</label>
                                <ScoreBar score={bid.smartScore} />
                            </div>
                            {bid.freelancer?.avgRating > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                    <StarRating value={Math.round(bid.freelancer.avgRating)} readonly />
                                </div>
                            )}
                            <p className="bid-cover">{bid.coverLetter}</p>
                            {isOwner && task.status === 'OPEN' && (
                                <button className="btn btn-success btn-sm" onClick={() => handleAcceptBid(bid.id)}>
                                    ✓ Accept This Bid
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Submit Work (Assigned freelancer) */}
            {isAssigned && task.status === 'ASSIGNED' && !task.submission && (
                <div className="detail-section">
                    <div className="card">
                        <h2 style={{ marginBottom: 16 }}>Submit Your Work</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Description of work done</label>
                                <textarea className="form-textarea" value={submitForm.content}
                                    onChange={(e) => setSubmitForm({ ...submitForm, content: e.target.value })}
                                    required placeholder="Describe what you've built..." rows={4} />
                            </div>
                            <div className="form-group">
                                <label>Link (GitHub, demo, etc.)</label>
                                <input className="form-input" value={submitForm.link}
                                    onChange={(e) => setSubmitForm({ ...submitForm, link: e.target.value })}
                                    placeholder="https://github.com/..." />
                            </div>
                            <button className="btn btn-primary" type="submit">Submit Work</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Show submission */}
            {task.submission && (
                <div className="detail-section">
                    <h2>Submission</h2>
                    <div className="card">
                        <p style={{ marginBottom: 8, lineHeight: 1.6 }}>{task.submission.content}</p>
                        {task.submission.link && (
                            <a href={task.submission.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                                🔗 View Work
                            </a>
                        )}
                        <div className="card-meta" style={{ marginTop: 8 }}>
                            Submitted on {new Date(task.submission.submittedAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Review (Client + IN_REVIEW) */}
            {isOwner && task.status === 'IN_REVIEW' && !task.review && (
                <div className="detail-section">
                    <div className="card">
                        <h2 style={{ marginBottom: 16 }}>Leave a Review</h2>
                        <form onSubmit={handleReview}>
                            <div className="form-group">
                                <label>Rating</label>
                                <StarRating value={reviewForm.rating} onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
                            </div>
                            <div className="form-group">
                                <label>Comment (optional)</label>
                                <textarea className="form-textarea" value={reviewForm.comment}
                                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                    placeholder="Share your experience..." rows={3} />
                            </div>
                            <button className="btn btn-primary" type="submit" disabled={reviewForm.rating === 0}>
                                Submit Review & Complete Task
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Show review */}
            {task.review && (
                <div className="detail-section">
                    <h2>Review</h2>
                    <div className="card">
                        <StarRating value={task.review.rating} readonly />
                        {task.review.comment && <p style={{ marginTop: 8, lineHeight: 1.6 }}>{task.review.comment}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
