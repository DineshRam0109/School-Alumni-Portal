const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobById);

// Protected routes
router.post('/', protect, jobController.createJob);
router.delete('/:id', protect, jobController.deleteJob);


module.exports = router;