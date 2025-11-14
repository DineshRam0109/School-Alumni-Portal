const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { protect } = require('../middleware/auth');

// Request mentorship
router.post('/request', protect, async (req, res) => {
  try {
    const { mentor_id, area_of_guidance } = req.body;
    
    await db.query(
      'INSERT INTO mentorship (mentor_id, mentee_id, area_of_guidance, status) VALUES (?, ?, ?, ?)',
      [mentor_id, req.user.user_id, area_of_guidance, 'requested']
    );
    
    res.status(201).json({ success: true, message: 'Mentorship request sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send request' });
  }
});

// Get my mentorships (as mentor)
router.get('/as-mentor', protect, async (req, res) => {
  try {
    const [mentorships] = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.profile_picture, u.email
       FROM mentorship m
       JOIN users u ON m.mentee_id = u.user_id
       WHERE m.mentor_id = ?
       ORDER BY m.created_at DESC`,
      [req.user.user_id]
    );
    
    res.json({ success: true, mentorships });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentorships' });
  }
});

// Get my mentorships (as mentee)
router.get('/as-mentee', protect, async (req, res) => {
  try {
    const [mentorships] = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.profile_picture, u.email
       FROM mentorship m
       JOIN users u ON m.mentor_id = u.user_id
       WHERE m.mentee_id = ?
       ORDER BY m.created_at DESC`,
      [req.user.user_id]
    );
    
    res.json({ success: true, mentorships });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch mentorships' });
  }
});

// Accept mentorship
router.put('/:id/accept', protect, async (req, res) => {
  try {
    await db.query(
      'UPDATE mentorship SET status = "active", start_date = NOW() WHERE mentorship_id = ? AND mentor_id = ?',
      [req.params.id, req.user.user_id]
    );
    
    res.json({ success: true, message: 'Mentorship accepted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to accept mentorship' });
  }
});

module.exports = router;
