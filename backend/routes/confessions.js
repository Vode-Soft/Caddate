const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createConfession,
  getConfessions,
  likeConfession,
  unlikeConfession,
  getUserConfessions,
  deleteConfession
} = require('../controllers/confessionController');

// Tüm route'lar authentication gerektirir
router.use(authenticateToken);

// İtiraf oluştur
router.post('/', createConfession);

// İtirafları listele
router.get('/', getConfessions);

// Kullanıcının itiraflarını getir
router.get('/my', getUserConfessions);

// İtiraf beğen
router.post('/:confessionId/like', likeConfession);

// İtiraf beğenisini geri al
router.delete('/:confessionId/like', unlikeConfession);

// İtiraf sil
router.delete('/:confessionId', deleteConfession);

module.exports = router;
