const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');


// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/school-admin-login', authController.schoolAdminLogin);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/school-admin-forgot-password', authController.schoolAdminForgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Protected routes
router.get('/me', protect, authController.getMe);


module.exports = router;