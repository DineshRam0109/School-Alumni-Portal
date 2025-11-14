const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { protect } = require('../middleware/auth');

router.get('/alumni', protect, searchController.searchAlumni);
router.get('/batch-mates', protect, searchController.findBatchMates);
router.get('/filters', protect, searchController.getSearchFilters);

module.exports = router;