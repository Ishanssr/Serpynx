import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyTasks, getTasks, getMyBids } from '../api/client';
import { StatusBadge, SkillTags, Loading } from '../components/UI';

export default function Dashboard() {
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const isClient = user?.role === 'CLIENT';

    useEffect(() => {
        const fetch = async () => {
            try {
                if (isClient) {
                    const res = await getMyTasks();
                    // Handle both array and paginated { data, meta } responses
                    setData(Array.isArray(res.data) ? res.data : (res.data?.data || []));
                } else {
                    const res = await getMyBids();
                    setData(Array.isArray(res.data) ? res.data : (res.data?.data || []));
                }
            } catch (err) {
                console.error(err);
                setData([]);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [isClient]);

    if (loading) return <Loading />;

    const stats = isClient
        ? {
            total: data.length,
            open: data.filter(t => t.status === 'OPEN').length,
            assigned: data.filter(t => t.status === 'ASSIGNED').length,
            completed: data.filter(t => t.status === 'COMPLETED').length,
        }
        : {
            total: data.length,
            pending: data.filter(b => b.status === 'PENDING').length,
            accepted: data.filter(b => b.status === 'ACCEPTED').length,
            rejected: data.filter(b => b.status === 'REJECTED').length,
        };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Welcome, {user?.name} 👋</h1>
                    <p>{isClient ? 'Manage your tasks and find the best developers' : 'Track your bids and active projects'}</p>
                </div>
                {isClient && (
                    <Link to="/tasks/new" className="btn btn-primary">➕ Post New Task</Link>
                )}
            </div>

            <div className="stats-row">
                {Object.entries(stats).map(([key, val]) => (
                    <div key={key} className="stat-card">
                        <div className="stat-value">{val}</div>
                        <div className="stat-label">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
                    </div>
                ))}
            </div>

            <div className="detail-section">
                <h2>{isClient ? 'Your Tasks' : 'Your Bids'}</h2>
                {data.length === 0 ? (
                    <div className="empty-state">
                        <h3>{isClient ? 'No tasks yet' : 'No bids yet'}</h3>
                        <p>{isClient ? 'Post your first task to get started' : 'Browse tasks and place your first bid'}</p>
                        <Link to={isClient ? '/tasks/new' : '/tasks'} className="btn btn-primary" style={{ marginTop: 16 }}>
                            {isClient ? 'Post a Task' : 'Browse Tasks'}
                        </Link>
                    </div>
                ) : (
                    <div className="tasks-grid">
                        {isClient ? data.map(task => (
                            <Link to={`/tasks/${task.id}`} key={task.id} style={{ textDecoration: 'none' }}>
                                <div className="card">
                                    <div className="card-header">
                                        <span className="card-title">{task.title}</span>
                                        <StatusBadge status={task.status} />
                                    </div>
                                    <div className="budget">${task.budget}</div>
                                    <div className="card-meta" style={{ marginTop: 8 }}>
                                        {task._count?.bids || 0} bids received
                                    </div>
                                    <div style={{ marginTop: 8 }}>
                                        <SkillTags skills={task.requiredSkills} />
                                    </div>
                                </div>
                            </Link>
                        )) : data.map(bid => (
                            <Link to={`/tasks/${bid.task?.id}`} key={bid.id} style={{ textDecoration: 'none' }}>
                                <div className="card">
                                    <div className="card-header">
                                        <span className="card-title">{bid.task?.title}</span>
                                        <StatusBadge status={bid.status} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                        <span className="budget">${bid.amount}</span>
                                        <span className="card-meta">{bid.estimatedDays} days</span>
                                    </div>
                                    <div style={{ marginTop: 8 }}>
                                        <SkillTags skills={bid.task?.requiredSkills} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
