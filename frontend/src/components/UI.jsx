export function ScoreBar({ score }) {
    const pct = Math.round(score * 100);
    return (
        <div className="score-bar-container">
            <div className="score-bar">
                <div className="score-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="score-value">{pct}%</span>
        </div>
    );
}

export function StarRating({ value, onChange, readonly = false }) {
    return (
        <div className={readonly ? 'star-display' : 'star-rating'}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={`star ${star <= value ? 'filled' : ''}`}
                    onClick={() => !readonly && onChange?.(star)}
                    style={{ cursor: readonly ? 'default' : 'pointer' }}
                >
                    ★
                </span>
            ))}
            {readonly && <span style={{ marginLeft: 4, fontSize: '0.8rem' }}>({value}/5)</span>}
        </div>
    );
}

export function StatusBadge({ status }) {
    const statusMap = {
        OPEN: 'badge-open',
        ASSIGNED: 'badge-assigned',
        IN_REVIEW: 'badge-in-review',
        COMPLETED: 'badge-completed',
        CANCELLED: 'badge-cancelled',
        PENDING: 'badge-pending',
        ACCEPTED: 'badge-accepted',
    REJECTED: 'badge-rejected',
    STANDBY: 'badge-pending',
    };
    const label = status.replace('_', ' ');
    return <span className={`badge ${statusMap[status] || ''}`}>{label}</span>;
}

export function SkillTags({ skills }) {
    if (!skills?.length) return null;
    return (
        <div className="skills-list">
            {skills.map((s) => (
                <span key={s} className="skill-tag">{s}</span>
            ))}
        </div>
    );
}

export function Loading() {
    return (
        <div className="loading">
            <div className="spinner" />
        </div>
    );
}
