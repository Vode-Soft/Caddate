const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  likeUser,
  unlikeUser,
  getMatches,
  getLikesReceived,
  getSuggestedMatches,
  getMatchStats
} = require('../controllers/matchController');

// Tüm route'lar authentication gerektiriyor
router.use(authenticateToken);

// Kullanıcıyı beğen
router.post('/like', likeUser);

// Beğeniyi geri al
router.delete('/unlike/:unlikedUserId', unlikeUser);

// Eşleşme listesini getir (karşılıklı eşleşmeler)
router.get('/', getMatches);

// Seni beğenenleri getir
router.get('/likes-received', getLikesReceived);

// Eşleşme önerileri getir
router.get('/suggestions', getSuggestedMatches);

// Eşleşme istatistikleri
router.get('/stats', getMatchStats);

module.exports = router;

