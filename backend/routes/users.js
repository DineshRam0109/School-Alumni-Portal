const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Protected routes (all require authentication)

// Profile routes
router.put('/profile', protect, userController.updateProfile);

router.post('/profile-picture', 
  protect, 
  upload.uploadProfilePicture.single('profile_picture'), 
  userController.uploadProfilePicture
);

// Change password - accessible to all authenticated users (alumni, school_admin, super_admin)
router.put('/change-password', protect, userController.changePassword);

// Get user by ID
router.get('/:id', protect, userController.getUserById);

// Admin routes
router.get('/', protect, authorize('super_admin', 'school_admin'), userController.getAllUsers);

// Delete routes
router.delete('/alumni/:userId', protect, authorize('school_admin'), userController.deleteAlumni);
router.delete('/:id', protect, authorize('super_admin'), userController.deleteUser);

module.exports = router;