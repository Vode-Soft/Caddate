const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const verificationController = require('../controllers/verificationController');

// Kullanıcının doğrulama seviyesini kontrol et
router.get('/level', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const verificationLevel = await verificationController.getVerificationLevel(userId);
    
    res.json({
      success: true,
      data: verificationLevel
    });
  } catch (error) {
    console.error('Verification level check error:', error);
    res.status(500).json({
      success: false,
      message: 'Doğrulama seviyesi kontrol edilemedi'
    });
  }
});

// Telefon doğrulama kodu gönder
router.post('/send-phone-code', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user.id;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Telefon numarası gerekli'
      });
    }

    const result = await verificationController.sendPhoneVerificationCode(userId, phoneNumber);
    
    res.json({
      success: result.success,
      message: result.message,
      code: result.code // Test için
    });

  } catch (error) {
    console.error('Send phone code error:', error);
    res.status(500).json({
      success: false,
      message: 'Kod gönderilemedi'
    });
  }
});

// Telefon doğrulama kodunu kontrol et
router.post('/verify-phone-code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Doğrulama kodu gerekli'
      });
    }

    const result = await verificationController.verifyPhoneCode(userId, code);
    
    res.json({
      success: result.success,
      message: result.message
    });

  } catch (error) {
    console.error('Verify phone code error:', error);
    res.status(500).json({
      success: false,
      message: 'Kod doğrulanamadı'
    });
  }
});

// Profil tamamlama oranını hesapla
router.post('/calculate-completeness', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const completeness = await verificationController.calculateProfileCompleteness(userId);
    
    res.json({
      success: true,
      completeness: completeness,
      message: 'Profil tamamlama oranı hesaplandı'
    });

  } catch (error) {
    console.error('Calculate completeness error:', error);
    res.status(500).json({
      success: false,
      message: 'Profil tamamlama oranı hesaplanamadı'
    });
  }
});

// Doğrulama seviyesine göre beğeni limitini al
router.get('/like-limit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limitInfo = await verificationController.getLikeLimitByVerification(userId);
    
    res.json({
      success: true,
      data: limitInfo
    });

  } catch (error) {
    console.error('Get like limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Beğeni limiti alınamadı'
    });
  }
});

// Doğrulama önerileri
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const suggestions = await verificationController.getVerificationSuggestions(userId);
    
    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('Get verification suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Doğrulama önerileri alınamadı'
    });
  }
});

module.exports = router;
