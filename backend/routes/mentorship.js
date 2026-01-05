// routes/mentorship.js
const express = require('express');
const router = express.Router();
const {
  requestMentorship,
  getMentorshipsAsMentor,
  getMentorshipsAsMentee,
  acceptMentorship,
  rejectMentorship,
  completeMentorship,
  getMentorshipSessions,
  scheduleSession,
  completeSession,
  deleteSession,
  getMentorshipGoals,
  createGoal,
  updateGoalProgress,
  deleteGoal
} = require('../controllers/mentorshipController');
const { protect } = require('../middleware/auth');

// Mentorship requests
router.post('/request', protect, requestMentorship);
router.get('/as-mentor', protect, getMentorshipsAsMentor);
router.get('/as-mentee', protect, getMentorshipsAsMentee);
router.put('/:id/accept', protect, acceptMentorship);
router.put('/:id/reject', protect, rejectMentorship);
router.put('/:id/complete', protect, completeMentorship);

// Sessions
router.get('/:id/sessions', protect, getMentorshipSessions);
router.post('/:id/sessions', protect, scheduleSession);
router.post('/sessions/:sessionId/complete', protect, completeSession);
router.delete('/sessions/:sessionId', protect, deleteSession);

// Goals
router.get('/:id/goals', protect, getMentorshipGoals);
router.post('/:id/goals', protect, createGoal);
router.put('/goals/:goalId/progress', protect, updateGoalProgress);
router.delete('/goals/:goalId', protect, deleteGoal);

module.exports = router;