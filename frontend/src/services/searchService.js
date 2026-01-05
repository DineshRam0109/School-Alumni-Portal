import api from './api';

export const searchService = {
  searchAlumni: (params) => api.get('/search/alumni', { params }),
  findBatchMates: () => api.get('/search/batch-mates'),
  getSearchFilters: () => api.get('/search/filters')
};