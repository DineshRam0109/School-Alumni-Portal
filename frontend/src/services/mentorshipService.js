// src/services/mentorshipService.js
import api from './api';

const mentorshipService = {
  // Request mentorship
  requestMentorship: async (mentorId, areaOfGuidance) => {
    const response = await api.post('/mentorship/request', {
      mentor_id: mentorId,
      area_of_guidance: areaOfGuidance
    });
    return response.data;
  },

  // Get mentorships as mentee
  getMentorshipsAsMentee: async () => {
    const response = await api.get('/mentorship/as-mentee');
    return response.data;
  },

  // Get mentorships as mentor
  getMentorshipsAsMentor: async () => {
    const response = await api.get('/mentorship/as-mentor');
    return response.data;
  },

  // Accept mentorship request
  acceptMentorship: async (mentorshipId) => {
    const response = await api.put(`/mentorship/${mentorshipId}/accept`);
    return response.data;
  },

  // Reject mentorship request
  rejectMentorship: async (mentorshipId) => {
    const response = await api.put(`/mentorship/${mentorshipId}/reject`);
    return response.data;
  },

  // Complete mentorship
  completeMentorship: async (mentorshipId) => {
    const response = await api.put(`/mentorship/${mentorshipId}/complete`);
    return response.data;
  },

  // Get mentorship sessions
  getMentorshipSessions: async (mentorshipId) => {
    const response = await api.get(`/mentorship/${mentorshipId}/sessions`);
    return response.data;
  },

  // Schedule session
  scheduleSession: async (mentorshipId, sessionData) => {
    const response = await api.post(`/mentorship/${mentorshipId}/sessions`, sessionData);
    return response.data;
  },

  // Complete session
  completeSession: async (sessionId) => {
    const response = await api.post(`/mentorship/sessions/${sessionId}/complete`);
    return response.data;
  },

  // Delete session
  deleteSession: async (sessionId) => {
    const response = await api.delete(`/mentorship/sessions/${sessionId}`);
    return response.data;
  },

  // Get mentorship goals
  getMentorshipGoals: async (mentorshipId) => {
    const response = await api.get(`/mentorship/${mentorshipId}/goals`);
    return response.data;
  },

  // Create goal
  createGoal: async (mentorshipId, goalData) => {
    const response = await api.post(`/mentorship/${mentorshipId}/goals`, goalData);
    return response.data;
  },

  // Update goal progress
  updateGoalProgress: async (goalId, progress) => {
    const response = await api.put(`/mentorship/goals/${goalId}/progress`, {
      progress_percentage: progress
    });
    return response.data;
  },

  // Delete goal
  deleteGoal: async (goalId) => {
    const response = await api.delete(`/mentorship/goals/${goalId}`);
    return response.data;
  }
};

export default mentorshipService;