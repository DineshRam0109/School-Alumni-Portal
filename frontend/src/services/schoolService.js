import api from './api';

export const schoolService = {
  // Get all schools with pagination
  getAllSchools: (params) => api.get('/schools', { params }),
  
  // Get single school by ID
  getSchoolById: (id) => api.get(`/schools/${id}`),
  
  // Get school statistics
  getSchoolStatistics: (id) => api.get(`/schools/${id}/statistics`),
  
  // Get school alumni
  getSchoolAlumni: (id, params) => api.get(`/schools/${id}/alumni`, { params }),
  
  // NEW: Get alumni grouped by batches
  getSchoolBatches: (id) => api.get(`/schools/${id}/batches`),
  
  // Create school (Super Admin only)
  createSchool: (data) => api.post('/schools', data),
  
  // Update school
  updateSchool: (id, data) => api.put(`/schools/${id}`, data),
  
  // Delete school
  deleteSchool: (id) => api.delete(`/schools/${id}`),
  
  // Get my school (School Admin)
  getMySchool: () => api.get('/schools/my-school'),
  
  // Get unverified alumni (School Admin)
  getUnverifiedAlumni: () => api.get('/schools/unverified-alumni'),
  
  // Verify alumni education
  verifyEducation: (educationId) => api.patch(`/schools/verify-education/${educationId}`)
};