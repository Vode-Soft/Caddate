const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const antiSpamController = require('../controllers/antiSpamController');

// Kullanıcının spam durumunu kontrol et
router.get('/spam-status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const spamStatus = await antiSpamController.checkSpamStatus(userId);
    
    res.json({
      success: true,
      data: spamStatus
    });
  } catch (error) {
    console.error('Spam status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Spam durumu kontrol edilemedi'
    });
  }
});

// Günlük beğeni limitini kontrol et
router.get('/daily-limit', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limitCheck = await antiSpamController.checkDailyLikeLimit(userId);
    
    res.json({
      success: true,
      data: limitCheck
    });
  } catch (error) {
    console.error('Daily limit check error:', error);
    res.status(500).json({
      success: false,
      message: 'Günlük limit kontrol edilemedi'
    });
  }
});

// Kullanıcıyı spam olarak işaretle (admin only)
router.post('/mark-spam', auth, async (req, res) => {
  try {
    const { targetUserId, reason } = req.body;
    
    // Admin kontrolü (isteğe bağlı)
    if (!req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }
    
    const result = await antiSpamController.markAsSpam(targetUserId, reason);
    
    res.json({
      success: result.success,
      message: result.message,
      spamScore: result.spamScore
    });
  } catch (error) {
    console.error('Mark spam error:', error);
    res.status(500).json({
      success: false,
      message: 'Spam işaretleme başarısız'
    });
  }
});

// Kız kullanıcılar için öncelikli eşleşmeler
router.get('/prioritized-matches', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;
    
    const result = await antiSpamController.getPrioritizedMatches(userId, parseInt(limit));
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.matches || []
    });
  } catch (error) {
    console.error('Prioritized matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Öncelikli eşleşmeler alınamadı'
    });
  }
});

module.exports = router;
