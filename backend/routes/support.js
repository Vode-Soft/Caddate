const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

// Tüm route'lar authentication gerektirir
router.use(authenticateToken);

// Kullanıcı routes
router.post('/tickets', supportController.createSupportTicket);
router.get('/tickets/my', supportController.getUserTickets);

// Admin routes (ek olarak admin yetkisi gerektirir)
router.get('/tickets', requireAdmin, supportController.getAllTickets);
router.get('/tickets/stats', requireAdmin, supportController.getTicketStats);
router.put('/tickets/:id', requireAdmin, supportController.updateTicket);
router.delete('/tickets/:id', requireAdmin, supportController.deleteTicket);

module.exports = router;
