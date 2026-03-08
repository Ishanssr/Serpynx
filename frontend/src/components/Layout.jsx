import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

export default function Layout({ children }) {
    const { user, logout, updateUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleRoleSwitch = () => {
        console.log('Current role:', user?.role);
        const newRole = user?.role === 'CLIENT' ? 'FREELANCER' : 'CLIENT';
        console.log('Switching to:', newRole);
        
        // Update user in context and localStorage
        const updatedUser = { ...user, role: newRole };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        updateUser(updatedUser);
        
        // Force page reload to apply changes
        window.location.href = '/';
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
                        <NavLink to="/work-progress" className={({ isActive }) => isActive ? 'active' : ''}>
                            <span className="nav-icon">⚡</span> Work Progress
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
                    
                    {/* Role Switcher */}
                    <button 
                        onClick={handleRoleSwitch}
                        className="btn btn-primary btn-sm" 
                        style={{ marginTop: 8, width: '100%', fontSize: '0.75rem' }}
                        title={`Switch to ${user?.role === 'CLIENT' ? 'Freelancer' : 'Client'} mode`}
                    >
                        🔄 Switch to {user?.role === 'CLIENT' ? 'Freelancer' : 'Client'}
                    </button>
                    
                    <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ marginTop: 8, width: '100%' }}>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <div className="top-bar">
                    <div />
                    <div className="top-bar-actions">
                    <div className="theme-toggle-container">
                        <button
                            onClick={toggleTheme}
                            className="theme-toggle-btn"
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? (
                                <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="5"/>
                                    <line x1="12" y1="1" x2="12" y2="3"/>
                                    <line x1="12" y1="21" x2="12" y2="23"/>
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                                    <line x1="1" y1="12" x2="3" y2="12"/>
                                    <line x1="21" y1="12" x2="23" y2="12"/>
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                                </svg>
                            ) : (
                                <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                                </svg>
                            )}
                        </button>
                    </div>
                    <NotificationBell />
                </div>
                </div>
                {children}
            </main>
        </div>
    );
}
