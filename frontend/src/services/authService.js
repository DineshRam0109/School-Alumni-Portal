import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  schoolAdminLogin: (data) => api.post('/auth/school-admin-login', data),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  schoolAdminForgotPassword: (data) => api.post('/auth/school-admin-forgot-password', data),
  resetPassword: (token, data, userType = 'user') => 
    api.post(`/auth/reset-password/${token}?type=${userType}`, data),
  getMe: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};