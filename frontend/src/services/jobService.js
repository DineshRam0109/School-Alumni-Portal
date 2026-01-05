import api from './api';

export const jobService = {
  getAllJobs: (params) => api.get('/jobs', { params }),
  getJobById: (id) => api.get(`/jobs/${id}`),
  createJob: (data) => api.post('/jobs', data),
  deleteJob: (id) => api.delete(`/jobs/${id}`),
  
  getMyApplications: () => api.get('/jobs/my/applications'),
  

  
  referForJob: (id, data) => api.post(`/jobs/${id}/refer`, data),
  createJobAlert: (data) => api.post('/jobs/alerts', data),
  getCompaniesWithAlumni: () => api.get('/jobs/companies/alumni')
};