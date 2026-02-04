import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for API calls
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('streaklet_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for API calls
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('streaklet_token');
            // Use internal event or context to trigger logout in UI
            window.dispatchEvent(new Event('unauthorized'));
        }
        return Promise.reject(error.response?.data || { message: 'Network Error' });
    }
);

export const authService = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data)
};

export const habitService = {
    getHabits: (calendarId) => api.get(`/habits${calendarId && calendarId !== 'all' ? `?calendarId=${calendarId}` : ''}`),
    createHabit: (data) => api.post('/habits', data),
    updateHabit: (id, data) => api.put(`/habits/${id}`, data),
    deleteHabit: (id) => api.delete(`/habits/${id}`),
    toggleHabit: (id, data) => api.post(`/habits/${id}/log`, data),
    getMonthlyLogs: (year, month, calendarId) => api.get(`/logs/monthly?year=${year}&month=${month}${calendarId && calendarId !== 'all' ? `&calendarId=${calendarId}` : ''}`),
    getStats: (period = 'weekly') => api.get(`/stats/${period}`),
    getDeletedHabits: () => api.get('/habits?active=false'),
    restoreHabit: (id) => api.put(`/habits/${id}`, { active: true })
};

export const sharedCalendarService = {
    getCalendars: () => api.get('/shared-calendars'),
    createCalendar: (name) => api.post('/shared-calendars', { name }),
    joinCalendar: (code) => api.post('/shared-calendars/join', { joinCode: code }),
    getMembers: (id) => api.get(`/shared-calendars/${id}/members`),
    updateMemberRole: (calendarId, userId, role) => api.put(`/shared-calendars/${calendarId}/members/${userId}`, { role }),
    deleteCalendar: (id) => api.delete(`/shared-calendars/${id}`)
};

export const chatService = {
    askAI: (question, context) => api.post('/chat/ask', { question, context })
};

export default api;
