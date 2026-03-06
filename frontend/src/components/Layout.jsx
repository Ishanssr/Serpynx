import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isClient = user?.role === 'CLIENT';
    const isFreelancer = user?.role === 'FREELANCER';

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">⚡ Serpynx</div>
                <div className="sidebar-subtitle">Smart Freelance Marketplace</div>

                <ul className="sidebar-nav">
                    <li>
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                            📊 Dashboard
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
                            📋 Browse Tasks
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/freelancers" className={({ isActive }) => isActive ? 'active' : ''}>
                            🔍 Find Freelancers
                        </NavLink>
                    </li>
                    {isClient && (
                        <li>
                            <NavLink to="/tasks/new" className={({ isActive }) => isActive ? 'active' : ''}>
                                ➕ Post Task
                            </NavLink>
                        </li>
                    )}
                    {isFreelancer && (
                        <li>
                            <NavLink to="/my-bids" className={({ isActive }) => isActive ? 'active' : ''}>
                                🎯 My Bids
                            </NavLink>
                        </li>
                    )}
                    <li>
                        <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
                            👤 Profile
                        </NavLink>
                    </li>
                </ul>

                <div className="sidebar-user">
                    <div className="sidebar-user-name">{user?.name}</div>
                    <div className="sidebar-user-role">{user?.role}</div>
                    <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }}>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 0', marginBottom: 8 }}>
                    <NotificationBell />
                </div>
                {children}
            </main>
        </div>
    );
}
