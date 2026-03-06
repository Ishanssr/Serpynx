import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../api/client';

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();

    // Fetch unread count on mount and every 30s
    useEffect(() => {
        const fetchCount = () => {
            getUnreadCount()
                .then((res) => setUnread(res.data.count))
                .catch(() => { });
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await getNotifications({ limit: 15 });
            setNotifications(res.data.data);
        } catch { }
        setLoading(false);
    };

    const handleToggle = () => {
        if (!open) fetchNotifications();
        setOpen(!open);
    };

    const handleClick = async (notif) => {
        if (!notif.isRead) {
            await markNotificationRead(notif.id).catch(() => { });
            setUnread((u) => Math.max(0, u - 1));
            setNotifications((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
            );
        }
        setOpen(false);
        if (notif.link) navigate(notif.link);
    };

    const handleMarkAllRead = async () => {
        await markAllNotificationsRead().catch(() => { });
        setUnread(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const typeIcon = {
        BID_RECEIVED: '📩',
        BID_ACCEPTED: '🎉',
        BID_REJECTED: '😔',
        WORK_SUBMITTED: '📦',
        REVIEW_RECEIVED: '⭐',
        TASK_ASSIGNED: '🚀',
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={handleToggle}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '1.3rem', position: 'relative', padding: '4px 8px',
                    color: 'var(--text-primary)',
                }}
                title="Notifications"
            >
                🔔
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: 0, right: 0,
                        background: '#ef4444', color: 'white',
                        fontSize: '0.65rem', fontWeight: 700,
                        borderRadius: '50%', width: 18, height: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    width: 360, maxHeight: 440, overflowY: 'auto',
                    background: 'var(--bg-card, #1e1e2e)', border: '1px solid var(--border, #333)',
                    borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', borderBottom: '1px solid var(--border, #333)',
                    }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Notifications</span>
                        {unread > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--primary, #6366f1)', fontSize: '0.8rem',
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No notifications yet
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleClick(notif)}
                                style={{
                                    display: 'flex', gap: 12, padding: '12px 16px',
                                    cursor: 'pointer', borderBottom: '1px solid var(--border, #222)',
                                    background: notif.isRead ? 'transparent' : 'rgba(99,102,241,0.06)',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(99,102,241,0.06)'}
                            >
                                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                                    {typeIcon[notif.type] || '📬'}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                        margin: 0, fontSize: '0.85rem', lineHeight: 1.4,
                                        fontWeight: notif.isRead ? 400 : 600,
                                        color: 'var(--text-primary)',
                                    }}>
                                        {notif.message}
                                    </p>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {timeAgo(notif.createdAt)}
                                    </span>
                                </div>
                                {!notif.isRead && (
                                    <span style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: '#6366f1', flexShrink: 0, marginTop: 6,
                                    }} />
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
