// src/services/notificationService.js - NEW FILE
import api from './api';

export const notificationService = {
  // Fetch notifications
  getNotifications: async (params = {}) => {
    return await api.get('/notifications', { params });
  },

  // Get unread count
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data.unread_count || 0;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  },

  // Mark as read
  markAsRead: async (notificationId) => {
    return await api.put(`/notifications/${notificationId}/read`);
  },

  // Mark all as read
  markAllAsRead: async () => {
    return await api.put('/notifications/mark-all-read');
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    return await api.delete(`/notifications/${notificationId}`);
  },

  // Delete all notifications
  deleteAllNotifications: async () => {
    return await api.delete('/notifications/delete-all');
  }
};