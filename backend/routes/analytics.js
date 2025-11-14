const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('super_admin', 'school_admin'), analyticsController.getDashboardStats);
router.get('/users', protect, authorize('super_admin'), analyticsController.getUserAnalytics);
router.get('/schools/:id', protect, authorize('super_admin', 'school_admin'), analyticsController.getSchoolAnalytics);
router.get('/events', protect, authorize('super_admin', 'school_admin'), analyticsController.getEventAnalytics);
router.get('/jobs', protect, authorize('super_admin', 'school_admin'), analyticsController.getJobAnalytics);
router.post('/export', protect, authorize('super_admin'), analyticsController.exportReport);
router.post('/reports/generate', protect, authorize('super_admin', 'school_admin'), analyticsController.generateComprehensiveReport);

module.exports = router;