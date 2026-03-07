import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000, // 60s timeout — Render free tier cold starts can take 30-50s
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('serpynx_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const registerUser = (data) => api.post('/api/auth/register', data);
export const loginUser = (data) => api.post('/api/auth/login', data);
export const getProfile = () => api.get('/api/auth/profile');

// Tasks
export const getTasks = (params) => api.get('/api/tasks', { params });
export const getMyTasks = () => api.get('/api/tasks/my');
export const getTask = (id) => api.get(`/api/tasks/${id}`);
export const createTask = (data) => api.post('/api/tasks', data);
export const updateTask = (id, data) => api.patch(`/api/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/api/tasks/${id}`);

// Bids
export const getTaskBids = (taskId) => api.get(`/api/tasks/${taskId}/bids`);
export const createBid = (taskId, data) => api.post(`/api/tasks/${taskId}/bids`, data);
export const acceptBid = (bidId) => api.post(`/api/bids/${bidId}/accept`);
export const assignPrimaryAndStandby = (taskId, data) => api.post(`/api/tasks/${taskId}/assign`, data);
export const triggerStandbyTakeover = (taskId) => api.post(`/api/tasks/${taskId}/standby-takeover`);
export const getMyBids = () => api.get('/api/my-bids');

// Submissions
export const submitWork = (taskId, data) => api.post(`/api/tasks/${taskId}/submit`, data);
export const getSubmission = (taskId) => api.get(`/api/tasks/${taskId}/submission`);

// Reviews
export const createReview = (taskId, data) => api.post(`/api/tasks/${taskId}/review`, data);
export const getReview = (taskId) => api.get(`/api/tasks/${taskId}/review`);

// Google Auth
export const googleLogin = (credential, role) => api.post('/api/auth/google', { credential, role });

// Email Verification
export const verifyEmail = (token) => api.get(`/api/auth/verify?token=${token}`);
export const resendVerification = (email) => api.post('/api/auth/resend-verification', { email });

// Notifications
export const getNotifications = (params) => api.get('/api/notifications', { params });
export const getUnreadCount = () => api.get('/api/notifications/unread-count');
export const markNotificationRead = (id) => api.patch(`/api/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/api/notifications/read-all');

// Users / Profiles
export const searchFreelancers = (params) => api.get('/api/users/freelancers', { params });
export const getPublicProfile = (userId) => api.get(`/api/users/${userId}`);

// Teams
export const createTeam = (data) => api.post('/api/teams', data);
export const getMyTeams = () => api.get('/api/teams/my');
export const getTeam = (id) => api.get(`/api/teams/${id}`);
export const inviteToTeam = (teamId, data) => api.post(`/api/teams/${teamId}/invite`, data);
export const leaveTeam = (teamId) => api.post(`/api/teams/${teamId}/leave`);
export const removeTeamMember = (teamId, memberId) => api.delete(`/api/teams/${teamId}/members/${memberId}`);

// Chat
export const sendChatRequest = (data) => api.post('/api/chat/request', data);
export const getChatRequests = () => api.get('/api/chat/requests');
export const acceptChatRequest = (id) => api.post(`/api/chat/request/${id}/accept`);
export const rejectChatRequest = (id) => api.post(`/api/chat/request/${id}/reject`);
export const getConversations = () => api.get('/api/chat/conversations');
export const getMessages = (conversationId, page) => api.get(`/api/chat/conversations/${conversationId}/messages`, { params: { page } });
export const sendMessageRest = (conversationId, data) => api.post(`/api/chat/conversations/${conversationId}/messages`, data);
export const getConnectionStatus = (userId) => api.get(`/api/chat/status/${userId}`);

export default api;
