const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');


const { protect, authorize } = require('../middleware/auth');

// All routes require super admin authentication
router.use(protect);
router.use(authorize('super_admin'));

// Dashboard
router.get('/dashboard', superAdminController.getDashboardStats);

// School Admins Management
router.get('/school-admins', superAdminController.getAllSchoolAdmins);
router.post('/school-admins', superAdminController.createSchoolAdmin);
router.put('/school-admins/:adminId', superAdminController.updateSchoolAdmin);
router.delete('/school-admins/:adminId', superAdminController.deleteSchoolAdmin);

// Schools Management
router.get('/schools', superAdminController.getAllSchools);
router.post('/schools', superAdminController.createSchool);
router.put('/schools/:schoolId', superAdminController.updateSchool);
router.delete('/schools/:schoolId', superAdminController.deleteSchool);

// FIXED: Single alumni route - remove duplicate
router.get('/schools/:schoolId/alumni', superAdminController.getSchoolAlumni);

// Alumni Management (View only - Super admin doesn't create alumni)
router.get('/alumni', superAdminController.getAllAlumni);

module.exports = router;