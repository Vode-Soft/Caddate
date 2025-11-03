const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requirePremiumFeature } = require('../middleware/premiumAuth');
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

// Beğeniyi geri al (Premium: rewind özelliği)
router.delete('/unlike/:unlikedUserId', requirePremiumFeature('rewind'), unlikeUser);

// Eşleşme listesini getir (karşılıklı eşleşmeler)
router.get('/', getMatches);

// Seni beğenenleri getir (Premium: see_who_liked özelliği)
router.get('/likes-received', requirePremiumFeature('see_who_liked'), getLikesReceived);

// Eşleşme önerileri getir
router.get('/suggestions', getSuggestedMatches);

// Eşleşme istatistikleri
router.get('/stats', getMatchStats);

module.exports = router;

