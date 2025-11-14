const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { protect } = require('../middleware/auth');

// Add work experience
router.post('/', protect, async (req, res) => {
  try {
    const { company_name, position, location, employment_type, industry, start_date, end_date, is_current, description } = req.body;
    
    await db.query(
      `INSERT INTO work_experience (user_id, company_name, position, location, employment_type, industry, start_date, end_date, is_current, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, company_name, position, location, employment_type, industry, start_date, end_date || null, is_current, description]
    );
    
    res.status(201).json({ success: true, message: 'Work experience added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add work experience' });
  }
});

// Get my work experience
router.get('/my', protect, async (req, res) => {
  try {
    const [work] = await db.query(
      `SELECT * FROM work_experience 
       WHERE user_id = ? 
       ORDER BY start_date DESC`,
      [req.user.user_id]
    );
    
    res.json({ success: true, work_experience: work });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch work experience' });
  }
});

// Update work experience
router.put('/:id', protect, async (req, res) => {
  try {
    const { company_name, position, location, employment_type, industry, start_date, end_date, is_current, description } = req.body;
    
    await db.query(
      `UPDATE work_experience SET
        company_name = COALESCE(?, company_name),
        position = COALESCE(?, position),
        location = COALESCE(?, location),
        employment_type = COALESCE(?, employment_type),
        industry = COALESCE(?, industry),
        start_date = COALESCE(?, start_date),
        end_date = ?,
        is_current = COALESCE(?, is_current),
        description = COALESCE(?, description)
       WHERE experience_id = ? AND user_id = ?`,
      [company_name, position, location, employment_type, industry, start_date, end_date, is_current, description, req.params.id, req.user.user_id]
    );
    
    res.json({ success: true, message: 'Work experience updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update work experience' });
  }
});

// Delete work experience
router.delete('/:id', protect, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM work_experience WHERE experience_id = ? AND user_id = ?',
      [req.params.id, req.user.user_id]
    );
    
    res.json({ success: true, message: 'Work experience deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete work experience' });
  }
});

module.exports = router;