/**
 * Level 1 - Simple API Service
 * Interacts with a basic REST API without authentication
 */

const API_BASE_URL = 'http://localhost:5000/api';

class APIService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Generic request method (No Auth)
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: { 'Content-Type': 'application/json' },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error');
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async get(endpoint) { return this.request(endpoint, { method: 'GET' }); }
    async post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); }
    async put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); }
    async delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }

    // Auth bypass for Level 1
    isAuthenticated() { return true; }
    getToken() { return null; }

    async getUser() {
        const res = await this.get('/auth/me');
        return res.data;
    }

    async updateProfile(profileData) {
        return this.put('/auth/profile', profileData);
    }

    logout() { alert('Logout not implemented in Level 1'); }

    // Habit Endpoints (Full CRUD)
    async getHabits() { return this.get('/habits'); }
    async createHabit(habitData) { return this.post('/habits', habitData); }
    async updateHabit(id, habitData) { return this.put(`/habits/${id}`, habitData); }
    async deleteHabit(id) { return this.delete(`/habits/${id}`); }

    // Habit Logs (For "checking logs/notes")
    async logHabit(habitId, status, notes = '', date = null) {
        return this.post(`/habits/${habitId}/log`, { status, notes, date });
    }
    async getHabitLogs(habitId) {
        return this.get(`/habits/${habitId}/logs`);
    }

    // Shared Calendar Endpoints
    async getSharedCalendars() { return this.get('/shared-calendars'); }
    async createSharedCalendar(scData) { return this.post('/shared-calendars', scData); }
    async deleteSharedCalendar(id) { return this.delete(`/shared-calendars/${id}`); }

    // Stats Endpoints
    async getTodayStats() { return this.get('/stats/today'); }
    async getOverallStats() { return this.get('/stats/overall'); }

    // Stubs to prevent UI errors in pages that use these
    async getTodaysHabits() { return { success: true, data: [] }; }
    async getNotificationCount() { return { success: true, data: 0 }; }
    async getNotifications() { return { success: true, data: [] }; }
    async getGraceStatus() {
        const res = await this.get('/stats/overall');
        return { success: true, data: { points: res.data.points, graceDays: res.data.graceDays } };
    }
}

const api = new APIService();

function requireAuth() { return true; }
function redirectIfAuthenticated() { }
function toggleMobileMenu() {
    const dropdown = document.getElementById('navbarDropdownMenu');
    if (dropdown) dropdown.classList.toggle('show');
}
