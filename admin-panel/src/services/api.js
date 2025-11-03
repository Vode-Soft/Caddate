import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - token ekle
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - hata yönetimi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token geçersiz, logout yap
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  },
  getCurrentUser: () => api.get('/users/me'),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/admin/dashboard/stats'),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/admin/users', { params }),
  getById: (userId) => api.get(`/admin/users/${userId}`),
  update: (userId, data) => api.put(`/admin/users/${userId}`, data),
  toggleBan: (userId, reason) => api.post(`/admin/users/${userId}/toggle-ban`, { reason }),
  delete: (userId) => api.delete(`/admin/users/${userId}`),
};

// Photos API
export const photosAPI = {
  getAll: (params) => api.get('/admin/photos', { params }),
  delete: (photoId) => api.delete(`/admin/photos/${photoId}`),
};

// Vehicles API
export const vehiclesAPI = {
  getAll: (params) => api.get('/admin/vehicles', { params }),
  verify: (vehicleId, isVerified) => api.post(`/admin/vehicles/${vehicleId}/verify`, { isVerified }),
  delete: (vehicleId) => api.delete(`/admin/vehicles/${vehicleId}`),
};

// Messages API
export const messagesAPI = {
  getAll: (params) => api.get('/admin/messages', { params }),
};

// Security API
export const securityAPI = {
  getEvents: (params) => api.get('/admin/security/events', { params }),
};

// Subscriptions API
export const subscriptionsAPI = {
  getAll: (params) => api.get('/subscriptions/admin/all', { params }),
  getStats: () => api.get('/subscriptions/admin/stats'),
  getPlans: () => api.get('/subscriptions/plans'),
  givePremium: (data) => api.post('/subscriptions/admin/give-premium', data),
  revokePremium: (data) => api.post('/subscriptions/admin/revoke-premium', data),
};

// Support API
export const supportAPI = {
  getAllTickets: (params) => api.get('/support/tickets', { params }),
  getStats: () => api.get('/support/tickets/stats'),
  updateTicket: (ticketId, data) => api.put(`/support/tickets/${ticketId}`, data),
  deleteTicket: (ticketId) => api.delete(`/support/tickets/${ticketId}`),
};

export default api;

