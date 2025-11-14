const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/send', 
  protect, 
  upload.uploadMessageAttachments.array('attachments', 5),
  upload.handleMulterError,
  messageController.sendMessage
);
// All routes require authentication
router.get('/conversations', protect, messageController.getConversations);
router.get('/conversation/:userId', protect, messageController.getConversation);
router.delete('/:id', protect, messageController.deleteMessage);
router.get('/unread-count', protect, messageController.getUnreadCount);

module.exports = router;