const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  updateToken,
  removeToken,
  sendTestNotification,
  getNotificationSettings,
  updateNotificationSettings
} = require('../controllers/pushNotificationController');

// Tüm route'lar authentication gerektirir
router.use(authenticateToken);

// FCM token'ı güncelle
router.post('/token', updateToken);

// FCM token'ı sil
router.delete('/token', removeToken);

// Test bildirimi gönder
router.post('/test', sendTestNotification);

// Bildirim ayarlarını getir
router.get('/settings', getNotificationSettings);

// Bildirim ayarlarını güncelle
router.put('/settings', updateNotificationSettings);

module.exports = router;
