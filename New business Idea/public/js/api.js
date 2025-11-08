// API Configuration
const API_BASE = 'http://localhost:5000/api';

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('token');
}

// Get current user from localStorage
function getCurrentUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

// API request helper with authentication
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        
        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Authentication API
const AuthAPI = {
    async login(username, password) {
        return apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },

    async register(userData) {
        return apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
};

// Students API
const StudentsAPI = {
    async getByClass(className) {
        return apiRequest(`/students/${className}`);
    },

    async getAll() {
        return apiRequest('/students');
    },

    async create(studentData) {
        return apiRequest('/students', {
            method: 'POST',
            body: JSON.stringify(studentData)
        });
    },

    async updateAttendance(studentId, status) {
        return apiRequest(`/students/${studentId}/attendance`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    },

    async update(studentId, studentData) {
        return apiRequest(`/students/${studentId}`, {
            method: 'PUT',
            body: JSON.stringify(studentData)
        });
    },

    async delete(studentId) {
        return apiRequest(`/students/${studentId}`, {
            method: 'DELETE'
        });
    }
};

// Notices API
const NoticesAPI = {
    async getAll() {
        return apiRequest('/notices');
    },

    async create(noticeData) {
        return apiRequest('/notices', {
            method: 'POST',
            body: JSON.stringify(noticeData)
        });
    }
};

// Payments API
const PaymentsAPI = {
    async getAll() {
        return apiRequest('/payments');
    },

    async create(paymentData) {
        return apiRequest('/payments', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }
};

// SMS API
const SMSAPI = {
    async send(smsData) {
        return apiRequest('/sms', {
            method: 'POST',
            body: JSON.stringify(smsData)
        });
    },

    async getHistory() {
        return apiRequest('/sms');
    }
};

// Resources API
const ResourcesAPI = {
    async getAll(category = 'all') {
        const query = category !== 'all' ? `?category=${category}` : '';
        return apiRequest(`/resources${query}`);
    },

    async create(resourceData) {
        return apiRequest('/resources', {
            method: 'POST',
            body: JSON.stringify(resourceData)
        });
    }
};

// Events API
const EventsAPI = {
    async getAll() {
        return apiRequest('/events');
    },

    async create(eventData) {
        return apiRequest('/events', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    }
};

// Portfolios API
const PortfoliosAPI = {
    async getAll(category = 'all') {
        const query = category !== 'all' ? `?category=${category}` : '';
        return apiRequest(`/portfolios${query}`);
    },

    async create(portfolioData) {
        return apiRequest('/portfolios', {
            method: 'POST',
            body: JSON.stringify(portfolioData)
        });
    }
};

// Chat API
const ChatAPI = {
    async sendMessage(message) {
        return apiRequest('/chat', {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }
};

// Contact API
const ContactAPI = {
    async sendMessage(contactData) {
        return apiRequest('/contact', {
            method: 'POST',
            body: JSON.stringify(contactData)
        });
    }
};

// Utility functions
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = type === 'error' ? 'error-message' : 'success-message';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 3000;
        animation: fadeInUp 0.3s ease;
        max-width: 300px;
        display: block;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function checkAuth() {
    const token = getAuthToken();
    const user = getCurrentUser();
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}