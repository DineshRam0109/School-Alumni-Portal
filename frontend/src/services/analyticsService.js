import api from './api';

export const analyticsService = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getUserAnalytics: () => api.get('/analytics/users'),
  getSchoolAnalytics: (id) => api.get(`/analytics/schools/${id}`),
  getEventAnalytics: () => api.get('/analytics/events'),
  getJobAnalytics: () => api.get('/analytics/jobs'),
  exportReport: (data) => api.post('/analytics/export', data, {
    responseType: 'blob'
  })
};