const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getFriendSuggestions,
  likeSuggestion,
  passSuggestion,
  getSuggestionStats
} = require('../controllers/friendSuggestionsController');

// Tüm route'lar authentication gerektirir
router.use(authenticateToken);

// Arkadaş önerilerini getir
router.get('/', getFriendSuggestions);

// Önerilen kullanıcıyı beğen
router.post('/:suggestedUserId/like', likeSuggestion);

// Önerilen kullanıcıyı geç
router.post('/:suggestedUserId/pass', passSuggestion);

// Öneri istatistiklerini getir
router.get('/stats', getSuggestionStats);

module.exports = router;
