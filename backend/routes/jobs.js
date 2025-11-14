const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController'); // Fixed import name
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobById);

// Protected routes
router.post('/', protect, jobController.createJob);
router.put('/:id', protect, jobController.updateJob);
router.delete('/:id', protect, jobController.deleteJob);

// Job applications
router.post('/:id/apply', 
  protect, 
  upload.uploadResume.single('resume'),
  upload.handleMulterError,
  jobController.applyForJob
);

router.get('/my/applications', protect, jobController.getMyApplications);
router.get('/:id/applications', protect, jobController.getJobApplications);
router.patch('/applications/:id/status', protect, jobController.updateApplicationStatus);

// Additional job features
router.post('/:id/refer', protect, jobController.referForJob);
router.post('/alerts', protect, jobController.createJobAlert);
router.get('/companies/alumni', protect, jobController.getCompaniesWithAlumni);

module.exports = router;