const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { protect } = require('../middleware/auth');

router.post('/', protect, achievementController.addAchievement);
router.get('/my', protect, achievementController.getMyAchievements);
router.put('/:id', protect, achievementController.updateAchievement);
router.delete('/:id', protect, achievementController.deleteAchievement);

module.exports = router;