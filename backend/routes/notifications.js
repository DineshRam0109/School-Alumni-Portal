const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');


// Get unread count - FIRST
router.get('/unread-count', protect, notificationController.getUnreadCount);

// Mark all as read - SECOND
router.put('/mark-all-read', protect, notificationController.markAllAsRead);

// Delete all notifications - THIRD
router.delete('/delete-all', protect, notificationController.deleteAllNotifications);

// Get all notifications - FOURTH
router.get('/', protect, notificationController.getNotifications);

// Single notification operations - LAST (parameterized routes)
router.put('/:id/read', protect, notificationController.markAsRead);
router.delete('/:id', protect, notificationController.deleteNotification);

module.exports = router;
