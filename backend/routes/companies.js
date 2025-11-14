const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { protect } = require('../middleware/auth');

router.get('/', protect, companyController.getAllCompanies);
router.get('/industries', protect, companyController.getIndustryDistribution);
router.get('/:companyName/alumni', protect, companyController.getCompanyAlumni);

module.exports = router;