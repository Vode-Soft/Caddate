const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

// Kullanıcı route'ları - kimlik doğrulama gerekli
router.get('/plans', subscriptionController.getPlans);
router.get('/my-subscription', authenticateToken, subscriptionController.getUserSubscription);
router.get('/history', authenticateToken, subscriptionController.getSubscriptionHistory);
router.post('/create', authenticateToken, subscriptionController.createSubscription);
router.post('/cancel/:subscriptionId', authenticateToken, subscriptionController.cancelSubscription);
router.get('/payment-history', authenticateToken, subscriptionController.getPaymentHistory);
router.get('/premium-status', authenticateToken, subscriptionController.checkPremiumStatus);

// Admin route'ları - admin yetkisi gerekli
router.get('/admin/all', authenticateToken, requireAdmin, subscriptionController.getAllSubscriptions);
router.get('/admin/stats', authenticateToken, requireAdmin, subscriptionController.getSubscriptionStats);

module.exports = router;

