import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTasks } from '../api/client';
import { StatusBadge, SkillTags, Loading } from '../components/UI';

export default function TaskList() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const params = {};
                if (filter) params.status = filter;
                const res = await getTasks(params);
                setTasks(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [filter]);

    if (loading) return <Loading />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Browse Tasks</h1>
                    <p>Find projects that match your skills</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {['', 'OPEN', 'ASSIGNED', 'IN_REVIEW', 'COMPLETED'].map((s) => (
                    <button
                        key={s}
                        className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => { setFilter(s); setLoading(true); }}
                    >
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {tasks.length === 0 ? (
                <div className="empty-state">
                    <h3>No tasks found</h3>
                    <p>Try a different filter or check back later</p>
                </div>
            ) : (
                <div className="tasks-grid">
                    {tasks.map((task) => (
                        <Link to={`/tasks/${task.id}`} key={task.id} style={{ textDecoration: 'none' }}>
                            <div className="card">
                                <div className="card-header">
                                    <span className="card-title">{task.title}</span>
                                    <StatusBadge status={task.status} />
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12, lineHeight: 1.5 }}>
                                    {task.description.length > 120 ? task.description.slice(0, 120) + '...' : task.description}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span className="budget">${task.budget}</span>
                                    <span className="card-meta">{task._count?.bids || 0} bids</span>
                                </div>
                                <SkillTags skills={task.requiredSkills} />
                                <div className="card-meta" style={{ marginTop: 8 }}>
                                    Posted by {task.client?.name}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
