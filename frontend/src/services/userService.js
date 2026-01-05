import api from './api';

export const userService = {
  // Get alumni/super_admin profile
  getProfile: (userId) => api.get(`/users/${userId}`),
  
  // Get school admin profile - NEW
  getSchoolAdminProfile: (adminId) => api.get(`/school-admin/profile/${adminId}`),
  
  // Update profile (works for both alumni and school admins)
  updateProfile: (data) => api.put('/users/profile', data),
  
  // Upload profile picture (works for both)
  uploadProfilePicture: (formData) => api.post('/users/profile-picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Change password (works for both)
  changePassword: (data) => api.put('/users/change-password', data),
  
  // Get all users (admin only)
  getAllUsers: (params) => api.get('/users', { params })
};