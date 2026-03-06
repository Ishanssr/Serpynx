import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { searchFreelancers } from '../api/client';
import { SkillTags, StarRating, Loading } from '../components/UI';

export default function Freelancers() {
    const [freelancers, setFreelancers] = useState([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('avgRating');

    const fetchFreelancers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 12, sortBy };
            if (search) params.search = search;
            const res = await searchFreelancers(params);
            setFreelancers(res.data.data);
            setMeta(res.data.meta);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }, [search, sortBy]);

    useEffect(() => { fetchFreelancers(1); }, [fetchFreelancers]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1>Find Freelancers</h1>
                    <p>Discover talented professionals for your projects</p>
                </div>
            </div>

            <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        className="form-input"
                        type="text"
                        placeholder="Search by name or bio..."
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

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[
                    { key: 'avgRating', label: '⭐ Top Rated' },
                    { key: 'reviews', label: '📊 Most Reviews' },
                    { key: 'newest', label: '🆕 Newest' },
                ].map((s) => (
                    <button
                        key={s.key}
                        className={`btn btn-sm ${sortBy === s.key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSortBy(s.key)}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {search && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                    {meta.total} freelancer{meta.total !== 1 ? 's' : ''} found
                </p>
            )}

            {loading ? <Loading /> : freelancers.length === 0 ? (
                <div className="empty-state">
                    <h3>No freelancers found</h3>
                    <p>Try a different search term</p>
                </div>
            ) : (
                <>
                    <div className="tasks-grid">
                        {freelancers.map((f) => (
                            <Link to={`/users/${f.id}`} key={f.id} style={{ textDecoration: 'none' }}>
                                <div className="card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: '50%',
                                            background: 'var(--accent-gradient)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.1rem', fontWeight: 800, color: 'white', flexShrink: 0,
                                        }}>
                                            {f.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{f.name}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                <StarRating value={Math.round(f.avgRating)} readonly size="sm" />
                                                <span className="card-meta">({f.totalReviews})</span>
                                            </div>
                                        </div>
                                    </div>
                                    {f.bio && (
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12, lineHeight: 1.5 }}>
                                            {f.bio.length > 100 ? f.bio.slice(0, 100) + '...' : f.bio}
                                        </p>
                                    )}
                                    <SkillTags skills={f.skills} />
                                    <div className="card-meta" style={{ marginTop: 10 }}>
                                        {f.completedJobs} jobs completed
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {meta.totalPages > 1 && (
                        <div style={{
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            gap: 12, marginTop: 32, paddingBottom: 24,
                        }}>
                            <button className="btn btn-secondary btn-sm" disabled={meta.page <= 1} onClick={() => fetchFreelancers(meta.page - 1)}>
                                ← Prev
                            </button>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Page {meta.page} of {meta.totalPages}
                            </span>
                            <button className="btn btn-secondary btn-sm" disabled={meta.page >= meta.totalPages} onClick={() => fetchFreelancers(meta.page + 1)}>
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
