import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import CreateTask from './pages/CreateTask';
import MyBids from './pages/MyBids';
import Profile from './pages/Profile';
import VerifyEmail from './pages/VerifyEmail';
import Freelancers from './pages/Freelancers';
import PublicProfile from './pages/PublicProfile';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import { Loading } from './components/UI';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <Loading />;
    if (!user) return <Navigate to="/login" />;
    return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <Loading />;
    if (user) return <Navigate to="/dashboard" />;
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/freelancers" element={<ProtectedRoute><Freelancers /></ProtectedRoute>} />
            <Route path="/users/:id" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TaskList /></ProtectedRoute>} />
            <Route path="/tasks/new" element={<ProtectedRoute><CreateTask /></ProtectedRoute>} />
            <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
            <Route path="/my-bids" element={<ProtectedRoute><MyBids /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
            <Route path="/teams/:id" element={<ProtectedRoute><TeamDetail /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<HomePage />} />
        </Routes>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <BrowserRouter>
                    <AuthProvider>
                        <AppRoutes />
                    </AuthProvider>
                </BrowserRouter>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default App;

