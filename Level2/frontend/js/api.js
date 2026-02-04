/**
 * Streaklet API Service
 * Centralized API communication layer
 */

const API_BASE_URL = 'http://localhost:5000/api';

class APIService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Get auth token from localStorage
    getToken() {
        return localStorage.getItem('streaklet_token');
    }

    // Set auth token
    setToken(token) {
        localStorage.setItem('streaklet_token', token);
    }

    // Remove auth token
    removeToken() {
        localStorage.removeItem('streaklet_token');
    }

    // Get user data from localStorage
    getUser() {
        const user = localStorage.getItem('streaklet_user');
        return user ? JSON.parse(user) : null;
    }

    // Set user data
    setUser(user) {
        localStorage.setItem('streaklet_user', JSON.stringify(user));
    }

    // Remove user data
    removeUser() {
        localStorage.removeItem('streaklet_user');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    }

    // Build headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth && this.getToken()) {
            headers['Authorization'] = `Bearer ${this.getToken()}`;
        }

        return headers;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(options.auth !== false),
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    // POST request
    async post(endpoint, body, auth = true) {
        return this.request(endpoint, { method: 'POST', body, auth });
    }

    // PUT request
    async put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // ═══════════════════════════════════════════════════════════════
    // Auth Endpoints
    // ═══════════════════════════════════════════════════════════════

    async register(name, email, password, timezone = 'UTC') {
        const response = await this.post('/auth/register', { name, email, password, timezone }, false);
        if (response.success) {
            this.setToken(response.data.token);
            this.setUser(response.data);
        }
        return response;
    }

    async login(email, password) {
        const response = await this.post('/auth/login', { email, password }, false);
        if (response.success) {
            this.setToken(response.data.token);
            this.setUser(response.data);
        }
        return response;
    }

    logout() {
        this.removeToken();
        this.removeUser();
        window.location.href = 'login.html';
    }

    async getMe() {
        return this.get('/auth/me');
    }

    async updateProfile(data) {
        const response = await this.put('/auth/profile', data);
        if (response.success) {
            this.setUser({ ...this.getUser(), ...response.data });
        }
        return response;
    }

    // ═══════════════════════════════════════════════════════════════
    // Habit Endpoints
    // ═══════════════════════════════════════════════════════════════

    async getHabits(calendarId = null) {
        let endpoint = '/habits';
        if (calendarId) {
            endpoint += `?calendarId=${calendarId}`;
        }
        return this.get(endpoint);
    }

    async getTodaysHabits() {
        return this.get('/habits/today');
    }

    async getHabit(id) {
        return this.get(`/habits/${id}`);
    }

    async createHabit(habitData) {
        return this.post('/habits', habitData);
    }

    async updateHabit(id, habitData) {
        return this.put(`/habits/${id}`, habitData);
    }

    async deleteHabit(id) {
        return this.delete(`/habits/${id}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // Habit Log Endpoints
    // ═══════════════════════════════════════════════════════════════

    async logHabit(habitId, status, notes = '', date = null) {
        const body = { status, notes };
        if (date) body.date = date;
        return this.post(`/habits/${habitId}/log`, body);
    }

    async getHabitLogs(habitId, startDate = null, endDate = null) {
        let endpoint = `/habits/${habitId}/logs`;
        if (startDate && endDate) {
            endpoint += `?startDate=${startDate}&endDate=${endDate}`;
        }
        return this.get(endpoint);
    }

    // ═══════════════════════════════════════════════════════════════
    // Stats Endpoints
    // ═══════════════════════════════════════════════════════════════

    async getTodayStats() {
        return this.get('/stats/today');
    }

    async getWeeklyStats() {
        return this.get('/stats/weekly');
    }

    async getMonthlyStats() {
        return this.get('/stats/monthly');
    }

    async getStreakStats() {
        return this.get('/stats/streaks');
    }

    async getInsights() {
        return this.get('/stats/insights');
    }

    // ═══════════════════════════════════════════════════════════════
    // Update member role
    async updateMemberRole(calendarId, memberId, role) {
        return this.request(`/shared-calendars/${calendarId}/members/${memberId}`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // Notification Endpoints
    // ═══════════════════════════════════════════════════════════════

    async getNotifications() {
        return this.get('/notifications');
    }

    async getNotificationCount() {
        return this.get('/notifications/count');
    }

    async markNotificationAsRead(id) {
        return this.put(`/notifications/${id}/read`, {});
    }

    async markAllNotificationsAsRead() {
        return this.put('/notifications/read-all', {});
    }

    async generateNotifications() {
        return this.request('/notifications/generate', { method: 'POST' });
    }

    async getMonthlyLogs(year, month, calendarId = null) {
        let endpoint = `/logs/monthly?year=${year}&month=${month}`;
        if (calendarId) {
            endpoint += `&calendarId=${calendarId}`;
        }
        return this.request(endpoint);
    }

    // ═══════════════════════════════════════════════════════════════
    // Shared Calendar Endpoints
    // ═══════════════════════════════════════════════════════════════

    async getSharedCalendars() {
        return this.get('/shared-calendars');
    }

    async createSharedCalendar(name) {
        return this.post('/shared-calendars', { name });
    }

    async joinSharedCalendar(code) {
        return this.post(`/shared-calendars/join/${code}`, {});
    }

    async getCalendarMembers(id) {
        return this.get(`/shared-calendars/${id}/members`);
    }

    async deleteSharedCalendar(id) {
        return this.delete(`/shared-calendars/${id}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // Grace Day Endpoints
    // ═══════════════════════════════════════════════════════════════

    async getGraceStatus() {
        return this.get('/grace/status');
    }

    async activateGraceDay(calendarId = null) {
        const body = {};
        if (calendarId) body.calendarId = calendarId;
        return this.post('/grace/activate', body);
    }

    async getGraceHistory(limit = 30) {
        return this.get(`/grace/history?limit=${limit}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // AI Chat Endpoints
    // ═══════════════════════════════════════════════════════════════

    async askAI(query) {
        return this.post('/chat/ask', { query });
    }
}

// Initialize and export API instance
const api = new APIService();

// Global UI Functions
function toggleMobileMenu() {
    const dropdown = document.getElementById('navbarDropdownMenu');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdowns when clicking outside
window.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar-dropdown')) {
        const dropdown = document.getElementById('navbarDropdownMenu');
        if (dropdown) dropdown.classList.remove('show');
    }
});


// Auth guard - redirect to login if not authenticated
function requireAuth() {
    if (!api.isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Redirect to dashboard if already authenticated
function redirectIfAuthenticated() {
    if (api.isAuthenticated()) {
        window.location.href = 'index.html';
    }
}
