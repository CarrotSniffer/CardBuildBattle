/**
 * Authentication Client Module
 */

const Auth = {
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),

    isLoggedIn() {
        return !!this.token && !!this.user;
    },

    async register(username, password) {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        this.setSession(data.token, data.user);
        return data.user;
    },

    async login(username, password) {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        this.setSession(data.token, data.user);
        return data.user;
    },

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    },

    setSession(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    },

    async fetchWithAuth(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getAuthHeaders(),
                ...options.headers
            }
        });

        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired');
        }

        return response;
    },

    // Require auth - redirect to login if not logged in
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }
};

// Export for use in other modules
window.Auth = Auth;
