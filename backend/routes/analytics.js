const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// Tüm analytics route'ları authentication gerektirir
router.use(authenticateToken);

// Dashboard analytics
router.get('/dashboard', analyticsController.getDashboardAnalytics);

// Kullanıcı davranış analizi
router.get('/user-behavior/:userId', analyticsController.getUserBehaviorAnalytics);

// Gerçek zamanlı metrikler
router.get('/real-time', analyticsController.getRealTimeMetrics);

module.exports = router;
