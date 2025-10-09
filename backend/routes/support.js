const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Kullanıcı routes
router.post('/tickets', auth, supportController.createSupportTicket);
router.get('/tickets/my', auth, supportController.getUserTickets);

// Admin routes
router.get('/tickets', auth, adminAuth, supportController.getAllTickets);
router.get('/tickets/stats', auth, adminAuth, supportController.getTicketStats);
router.put('/tickets/:id', auth, adminAuth, supportController.updateTicket);
router.delete('/tickets/:id', auth, adminAuth, supportController.deleteTicket);

module.exports = router;

