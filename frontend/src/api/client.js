import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
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
export const getMyBids = () => api.get('/api/my-bids');

// Submissions
export const submitWork = (taskId, data) => api.post(`/api/tasks/${taskId}/submit`, data);
export const getSubmission = (taskId) => api.get(`/api/tasks/${taskId}/submission`);

// Reviews
export const createReview = (taskId, data) => api.post(`/api/tasks/${taskId}/review`, data);
export const getReview = (taskId) => api.get(`/api/tasks/${taskId}/review`);

// Google Auth
export const googleLogin = (credential, role) => api.post('/api/auth/google', { credential, role });

export default api;
