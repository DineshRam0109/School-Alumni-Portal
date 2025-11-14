const express = require('express');
const router = express.Router();
const groupChatController = require('../controllers/groupChatController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(protect);

// Group management routes
router.get('/', groupChatController.getMyGroups);
router.post('/', 
  upload.uploadGroupAvatar.single('group_avatar'),
  upload.handleMulterError,
  groupChatController.createGroup
);
router.get('/:id', groupChatController.getGroupDetails);
router.put('/:id', 
  upload.uploadGroupAvatar.single('group_avatar'),
  upload.handleMulterError,
  groupChatController.updateGroup
);
router.delete('/:id', groupChatController.deleteGroup);
router.delete('/:id/leave', groupChatController.leaveGroup);

// Group member management
router.post('/:id/members', groupChatController.addGroupMembers);
router.delete('/:id/members/:userId', groupChatController.removeMember);
router.put('/:id/members/:userId/role', groupChatController.updateMemberRole);

// Group messaging routes
router.post('/:id/messages', 
  upload.uploadGroupMessageAttachments.array('attachments', 5),
  upload.handleMulterError,
  groupChatController.sendGroupMessage
);
router.get('/:id/messages', groupChatController.getGroupMessages);
router.delete('/messages/:messageId', groupChatController.deleteGroupMessage);

module.exports = router;