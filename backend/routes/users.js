const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const schoolAdminController = require('../controllers/schoolAdminController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Protected routes (all require authentication)
router.put('/profile', protect, userController.updateProfile);

router.post('/profile-picture', 
  protect, 
  upload.uploadProfilePicture.single('profile_picture'), 
  userController.uploadProfilePicture
);

router.put('/change-password', protect, userController.changePassword);

// Get user by ID (includes check for school admin)
router.get('/:id', protect, userController.getUserById);

// Admin routes
router.get('/', protect, authorize('super_admin', 'school_admin'), userController.getAllUsers);
router.delete('/:id', protect, authorize('super_admin'), userController.deleteUser);

module.exports = router;