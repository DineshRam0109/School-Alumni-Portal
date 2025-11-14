const express = require('express');
const router = express.Router();
const schoolAdminController = require('../controllers/schoolAdminController');
const { protect, authorize } = require('../middleware/auth');

// Public profile view - MUST come BEFORE router.use(protect)
// This allows any authenticated user to view school admin profiles
router.get('/profile/:id', protect, schoolAdminController.getSchoolAdminById);

// PROTECTED ROUTES - Require school_admin or super_admin role
router.use(protect);
router.use(authorize('school_admin', 'super_admin'));

// School Admin Dashboard & Info
router.get('/my-school', schoolAdminController.getMySchool);
router.get('/statistics', schoolAdminController.getSchoolStatistics);
router.get('/analytics', schoolAdminController.getSchoolAnalytics);

// Alumni Management
router.get('/unverified-alumni', schoolAdminController.getUnverifiedAlumni);
router.put('/verify/:educationId', schoolAdminController.verifyAlumni);
router.get('/alumni', schoolAdminController.getSchoolAlumni);

// Events Management
router.get('/events', schoolAdminController.getSchoolEvents);

// Reports & Export
router.post('/export', schoolAdminController.exportSchoolReport);

module.exports = router;