const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get connections (multiple versions)
router.get('/', connectionController.getMyConnections); // Use the detailed one as default
router.get('/with-details', connectionController.getConnectionsWithDetails);

// Get connection requests
router.get('/pending', connectionController.getPendingRequests);

// Connection status
router.get('/status/:userId', connectionController.getConnectionStatus);

// Send connection request
router.post('/send', connectionController.sendRequest);

// Manage connection requests
router.put('/:id/accept', connectionController.acceptRequest);
router.put('/:id/reject', connectionController.rejectRequest);
router.put('/:id/respond', connectionController.respondToRequest);

// Remove/cancel connections
router.delete('/:id', connectionController.removeConnection);
router.delete('/request/:id/cancel', connectionController.cancelRequest);

module.exports = router;