const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);

// Protected routes
router.post('/', protect, eventController.createEvent);
router.put('/:id', protect, eventController.updateEvent);
router.delete('/:id', protect, eventController.deleteEvent);
router.post('/:id/register', protect, eventController.registerForEvent);
router.delete('/:id/cancel', protect, eventController.cancelRegistration);
router.get('/my/events', protect, eventController.getMyEvents);

// Upload event image - FIXED
router.post('/:id/upload-image', 
  protect, 
  upload.uploadEventImage.single('event_image'),
  upload.handleMulterError,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload an image'
        });
      }

      const imagePath = `/uploads/events/${req.file.filename}`;

      await require('../config/database').query(
        'UPDATE events SET event_image = ? WHERE event_id = ?',
        [imagePath, id]
      );

      res.json({
        success: true,
        message: 'Event image uploaded successfully',
        image_url: imagePath
      });
    } catch (error) {
      console.error('Upload event image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload event image'
      });
    }
  }
);

module.exports = router;