import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import CreateTask from './pages/CreateTask';
import MyBids from './pages/MyBids';
import Profile from './pages/Profile';
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
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TaskList /></ProtectedRoute>} />
            <Route path="/tasks/new" element={<ProtectedRoute><CreateTask /></ProtectedRoute>} />
            <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
            <Route path="/my-bids" element={<ProtectedRoute><MyBids /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
