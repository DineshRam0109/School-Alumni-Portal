const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { protect } = require('../middleware/auth');

// Add education
router.post('/', protect, async (req, res) => {
  try {
    const { school_id, degree_level, field_of_study, start_year, end_year } = req.body;
    
    await db.query(
      `INSERT INTO alumni_education (user_id, school_id, degree_level, field_of_study, start_year, end_year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, school_id, degree_level, field_of_study, start_year, end_year]
    );
    
    res.status(201).json({ success: true, message: 'Education added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add education' });
  }
});

// Get my education
router.get('/my', protect, async (req, res) => {
  try {
    const [education] = await db.query(
      `SELECT ae.*, s.school_name, s.city, s.logo
       FROM alumni_education ae
       JOIN schools s ON ae.school_id = s.school_id
       WHERE ae.user_id = ?
       ORDER BY ae.start_year DESC`,
      [req.user.user_id]
    );
    
    res.json({ success: true, education });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch education' });
  }
});

// Delete education
router.delete('/:id', protect, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM alumni_education WHERE education_id = ? AND user_id = ?',
      [req.params.id, req.user.user_id]
    );
    
    res.json({ success: true, message: 'Education deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete education' });
  }
});

module.exports = router;