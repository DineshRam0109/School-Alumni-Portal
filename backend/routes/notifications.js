const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { protect } = require('../middleware/auth');

// Get user notifications
router.get('/', protect, async (req, res) => {
  try {
    const [notifications] = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.user_id]
    );
    
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const [count] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.user_id]
    );
    
    res.json({ success: true, unread_count: count[0].count });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch count' });
  }
});

// Mark as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [req.params.id, req.user.user_id]
    );
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// Mark all as read
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.user_id]
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

// Delete single notification
router.delete('/:id', protect, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM notifications WHERE notification_id = ? AND user_id = ?',
      [req.params.id, req.user.user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Notification deleted successfully' 
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete notification' 
    });
  }
});

// Delete all notifications for user
router.delete('/delete-all', protect, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM notifications WHERE user_id = ?',
      [req.user.user_id]
    );

    res.json({ 
      success: true, 
      message: 'All notifications deleted successfully' 
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete notifications' 
    });
  }
});

module.exports = router;