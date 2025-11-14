const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Auth-specific rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  message: 'Too many attempts, please try again later'
});

// Public routes with rate limiting
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/school-admin-login', authLimiter, authController.schoolAdminLogin); // NEW
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/school-admin-forgot-password', authLimiter, authController.schoolAdminForgotPassword); // NEW
router.post('/reset-password/:token', authLimiter, authController.resetPassword);

// Protected routes
router.get('/me', protect, authController.getMe);

module.exports = router;