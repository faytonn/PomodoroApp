const API_BASE_URL = 'https://localhost:7124/api';

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const token = localStorage.getItem('token');
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            let errorText = await response.text();
            let error;
            try {
                error = JSON.parse(errorText);
            } catch {
                error = { message: errorText };
            }
            throw new Error(error.message || 'API request failed');
        }

        // Only try to parse JSON if there is content
        const contentType = response.headers.get('content-type');
        if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
            return;
        }
        const text = await response.text();
        if (!text) return;
        return JSON.parse(text);
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

export const auth = {
    async register(username, email, password) {
        return await apiCall('/auth/register', 'POST', { username, email, password });
    },

    async login(loginId, password) {
        const response = await apiCall('/auth/login', 'POST', { loginId, password });
        localStorage.setItem('token', response.token);
        localStorage.setItem('currentUser', response.username);
        return response;
    },

    async logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
    }
};

export const tasks = {
    async getAll() {
        return await apiCall('/PomodoroTasks');
    },

    async create(task) {
        return await apiCall('/PomodoroTasks', 'POST', task);
    },

    async update(id, task) {
        return await apiCall(`/PomodoroTasks/${id}`, 'PUT', task);
    },

    async delete(id) {
        return await apiCall(`/PomodoroTasks/${id}`, 'DELETE');
    }
};

export const pomodoro = {
    async startSession(settings) {
        return await apiCall('/PomodoroSessions', 'POST', settings);
    },

    async endSession(sessionId) {
        return await apiCall(`/PomodoroSessions/${sessionId}`, 'PUT');
    },

    async getSessions() {
        return await apiCall('/PomodoroSessions');
    }
};

export const focus = {
    async startSession(goals) {
        return await apiCall('/FocusSessions', 'POST', { goals });
    },

    async endSession(sessionId) {
        return await apiCall(`/FocusSessions/${sessionId}`, 'PUT');
    },

    async getBlockedSites() {
        return await apiCall('/BlockedSites');
    },

    async addBlockedSite(site) {
        return await apiCall('/BlockedSites', 'POST', { site });
    },

    async removeBlockedSite(site) {
        return await apiCall(`/BlockedSites/${encodeURIComponent(site)}`, 'DELETE');
    }
};

export const stats = {
    async getUserStats() {
        return await apiCall('/UserStats');
    },

    async getDailyStats() {
        return await apiCall('/UserStats/daily');
    },

    async getWeeklyStats() {
        return await apiCall('/UserStats/weekly');
    }
}; 