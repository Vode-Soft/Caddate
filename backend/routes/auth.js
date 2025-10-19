const express = require('express');
const { 
  register, 
  login, 
  verifyToken, 
  sendPasswordResetCode, 
  verifyPasswordResetCode, 
  resetPassword 
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - Kullanıcı kayıt
router.post('/register', register);

// POST /api/auth/login - Kullanıcı giriş
router.post('/login', login);

// GET /api/auth/verify - Token doğrulama
router.get('/verify', authenticateToken, verifyToken);

// POST /api/auth/send-password-reset-code - Şifre sıfırlama kodu gönder
router.post('/send-password-reset-code', sendPasswordResetCode);

// POST /api/auth/verify-password-reset-code - Şifre sıfırlama kodunu doğrula
router.post('/verify-password-reset-code', verifyPasswordResetCode);

// POST /api/auth/reset-password - Yeni şifre belirle
router.post('/reset-password', resetPassword);

// POST /api/auth/logout - Kullanıcı çıkış (client-side token silme)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Çıkış başarılı'
  });
});

module.exports = router;
