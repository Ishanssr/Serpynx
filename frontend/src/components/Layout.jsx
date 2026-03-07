import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
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
                <div className="sidebar-logo">Serpynx</div>
                <div className="sidebar-subtitle">Smart Freelance Marketplace</div>

                <ul className="sidebar-nav">
                    <li>
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                            <span className="nav-icon">◈</span> Dashboard
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
                            <span className="nav-icon">◇</span> Browse Tasks
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/chat" className={({ isActive }) => isActive ? 'active' : ''}>
                            <span className="nav-icon">✉</span> Messages
                        </NavLink>
                    </li>
                    {isClient && (
                        <>
                            <li>
                                <NavLink to="/freelancers" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="nav-icon">◎</span> Find Freelancers
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/tasks/new" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="nav-icon">+</span> Post Task
                                </NavLink>
                            </li>
                        </>
                    )}
                    {isFreelancer && (
                        <>
                            <li>
                                <NavLink to="/freelancers" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="nav-icon">◆</span> Community
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/teams" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="nav-icon">⬡</span> My Teams
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/my-bids" className={({ isActive }) => isActive ? 'active' : ''}>
                                    <span className="nav-icon">◈</span> My Bids
                                </NavLink>
                            </li>
                        </>
                    )}
                    <li>
                        <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
                            <span className="nav-icon">○</span> Profile
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
                <div className="top-bar">
                    <div />
                    <div className="top-bar-actions">
                        <button
                            onClick={toggleTheme}
                            className="theme-toggle"
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? '☀' : '🌙'}
                        </button>
                        <NotificationBell />
                    </div>
                </div>
                {children}
            </main>
        </div>
    );
}
