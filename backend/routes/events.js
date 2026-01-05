const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', eventController.getAllEvents);

// Protected routes
router.post('/', protect, eventController.createEvent);
router.put('/:id', protect, eventController.updateEvent);
router.delete('/:id', protect, eventController.deleteEvent);
router.post('/:id/register', protect, eventController.registerForEvent);
router.delete('/:id/cancel', protect, eventController.cancelRegistration);
router.get('/my/events', protect, eventController.getMyEvents);  // Specific route FIRST
router.get('/:id', eventController.getEventById);


module.exports = router;