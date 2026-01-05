const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const schoolController = require('../controllers/schoolController');
const upload = require('../middleware/upload');

// Public routes

router.get('/:id/analytics', protect, schoolController.getSchoolAnalyticsById);

router.get('/', schoolController.getAllSchools);
router.get('/:id', schoolController.getSchoolById);
router.get('/:id/alumni', protect, schoolController.getSchoolAlumni);
router.get('/:id/statistics', protect, schoolController.getSchoolStatistics);

// NEW: Get alumni grouped by batches
router.get('/:id/batches', protect, schoolController.getAlumniBatches);

// Protected routes - School Admin and Super Admin
router.put('/:id', protect, authorize('school_admin', 'super_admin'), schoolController.updateSchool);
router.post('/:id/assign-admin', protect, authorize('super_admin'), schoolController.assignSchoolAdmin);

// School logo upload - School Admin only
router.put('/:id/logo', 
  protect, 
  authorize('school_admin'), 
  upload.uploadSchoolLogo.single('logo'), 
  schoolController.updateSchoolLogo
);

// Super Admin only routes
router.post('/', protect, authorize('super_admin'), schoolController.createSchool);


module.exports = router;