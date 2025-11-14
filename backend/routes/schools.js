const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', schoolController.getAllSchools);
router.get('/:id', schoolController.getSchoolById);
router.get('/:id/alumni', protect, schoolController.getSchoolAlumni);
router.get('/:id/statistics', protect, schoolController.getSchoolStatistics);

router.post('/', protect, authorize('super_admin'), schoolController.createSchool);
router.put('/:id', protect, authorize('super_admin', 'school_admin'), schoolController.updateSchool);
router.post('/:id/assign-admin', protect, authorize('super_admin'), schoolController.assignSchoolAdmin);
router.get('/:id/batches', protect, schoolController.getAlumniBatches);

// School Admin routes
router.get('/admin/my-school', protect, authorize('school_admin', 'super_admin'), schoolController.getMySchool);
router.get('/admin/unverified', protect, authorize('school_admin', 'super_admin'), schoolController.getUnverifiedAlumni);
router.put('/admin/verify/:educationId', protect, authorize('school_admin', 'super_admin'), schoolController.verifyAlumniEducation);

module.exports = router;