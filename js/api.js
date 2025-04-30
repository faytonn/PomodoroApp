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
    console.log('Current token from localStorage:', token);
    
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
        console.log('Added Authorization header:', options.headers['Authorization']);
    } else {
        console.warn('No token found in localStorage');
    }

    try {
        console.log(`Making ${method} request to ${endpoint} with data:`, data);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(errorText || 'API request failed');
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const jsonResponse = await response.json();
            console.log('API Response:', jsonResponse);
            return jsonResponse;
        }
        return null;
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

export const auth = {
    async register(username, email, password) {
        return await apiCall('/auth/register', 'POST', { 
            username, 
            email, 
            password,
            confirmPassword: password
        });
    },

    async login(loginId, password) {
        console.log('Attempting login with:', { loginId });
        const response = await apiCall('/auth/login', 'POST', { loginId, password });
        console.log('Login response:', response);
        
        if (!response || !response.token) {
            console.error('Login response missing token:', response);
            throw new Error('Invalid login response');
        }
        
        // Log the exact structure of the response
        console.log('Response structure:', {
            token: response.token,
            username: response.username,
            fullResponse: response
        });
        
        // Store the token and username
        localStorage.setItem('token', response.token);
        localStorage.setItem('currentUser', response.username);
        
        // Verify the stored values
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('currentUser');
        console.log('Stored values:', {
            token: storedToken,
            currentUser: storedUser
        });
        
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

export const settings = {
    async getUserSettings() {
        return await apiCall('/UserSettings');
    },

    async updateUserSettings(settings) {
        return await apiCall('/UserSettings', 'PUT', settings);
    }
}; 