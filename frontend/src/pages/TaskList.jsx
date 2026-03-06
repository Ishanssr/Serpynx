import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getTasks } from '../api/client';
import { StatusBadge, SkillTags, Loading } from '../components/UI';

export default function TaskList() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 12, totalPages: 0 });
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const fetchTasks = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 12 };
            if (filter) params.status = filter;
            if (search) params.search = search;
            const res = await getTasks(params);
            setTasks(res.data.data);
            setMeta(res.data.meta);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    useEffect(() => {
        fetchTasks(1);
    }, [fetchTasks]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Browse Tasks</h1>
                    <p>Find projects that match your skills</p>
                </div>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        className="form-input"
                        type="text"
                        placeholder="Search tasks by title or description..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" type="submit">Search</button>
                    {search && (
                        <button className="btn btn-secondary" type="button" onClick={() => { setSearch(''); setSearchInput(''); }}>
                            Clear
                        </button>
                    )}
                </div>
            </form>

            {/* Status filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {['', 'OPEN', 'ASSIGNED', 'IN_REVIEW', 'COMPLETED'].map((s) => (
                    <button
                        key={s}
                        className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter(s)}
                    >
                        {s || 'All'}
                    </button>
                ))}
            </div>

            {search && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                    Showing results for "<strong>{search}</strong>" — {meta.total} found
                </p>
            )}

            {loading ? <Loading /> : tasks.length === 0 ? (
                <div className="empty-state">
                    <h3>No tasks found</h3>
                    <p>Try a different filter or search term</p>
                </div>
            ) : (
                <>
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

                    {/* Pagination */}
                    {meta.totalPages > 1 && (
                        <div style={{
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            gap: 12, marginTop: 32, paddingBottom: 24,
                        }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={meta.page <= 1}
                                onClick={() => fetchTasks(meta.page - 1)}
                            >
                                ← Prev
                            </button>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Page {meta.page} of {meta.totalPages}
                            </span>
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={meta.page >= meta.totalPages}
                                onClick={() => fetchTasks(meta.page + 1)}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
