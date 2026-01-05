import api from './api';

export const eventService = {
  // Get all events with filters
  getAllEvents: (params) => api.get('/events', { params }),
  
  // Get single event by ID
  getEventById: (id) => api.get(`/events/${id}`),
  
  // Create new event
  createEvent: (data) => api.post('/events', data),
  
  // Update event
  updateEvent: (id, data) => api.put(`/events/${id}`, data),
  
  // Delete event
  deleteEvent: (id) => api.delete(`/events/${id}`),
  
  // Register for event
  registerForEvent: (id) => api.post(`/events/${id}/register`),
  
  // Cancel event registration
  cancelRegistration: (id) => api.delete(`/events/${id}/cancel`),
  
  // Get my registered events
  getMyEvents: (status) => api.get('/events/my/events', { params: { status } })
};