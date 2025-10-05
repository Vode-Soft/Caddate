const express = require('express');
const { 
  getProfile,
  getUserProfile, 
  updateProfile, 
  deleteAccount, 
  discoverUsers, 
  getUserById,
  getSettings,
  updateSettings,
  uploadProfilePicture,
  upload,
  searchUsers,
  getNearbyUsers,
  getProfileOptions,
  updateAdvancedProfile,
  getFriends,
  addFriend,
  removeFriend,
  getUserStats
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(authenticateToken);

// GET /api/users/profile - Kendi profili getir
router.get('/profile', getProfile);

// GET /api/users/profile/:userId - Belirli bir kullanıcının profilini getir
router.get('/profile/:userId', getUserProfile);

// PUT /api/users/profile - Profili güncelle
router.put('/profile', updateProfile);

// DELETE /api/users/profile - Hesabı sil
router.delete('/profile', deleteAccount);

// GET /api/users/discover - Diğer kullanıcıları keşfet
router.get('/discover', discoverUsers);

// GET /api/users/settings - Kullanıcı ayarlarını getir
router.get('/settings', getSettings);

// PUT /api/users/settings - Kullanıcı ayarlarını güncelle
router.put('/settings', updateSettings);

// POST /api/users/profile-picture - Profil fotoğrafı yükle
router.post('/profile-picture', (req, res, next) => {
  console.log('📸 Route - Profile picture upload request received');
  console.log('📸 Route - Content-Type:', req.headers['content-type']);
  console.log('📸 Route - Content-Length:', req.headers['content-length']);
  next();
}, upload.single('profile_picture'), (err, req, res, next) => {
  if (err) {
    console.error('📸 Route - Multer error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Dosya yükleme hatası'
    });
  }
  next();
}, uploadProfilePicture);

// GET /api/users/search - Kullanıcı ara
router.get('/search', searchUsers);

// GET /api/users/nearby - Yakındaki kullanıcıları bul
router.get('/nearby', getNearbyUsers);

// GET /api/users/profile-options - Profil seçeneklerini getir
router.get('/profile-options', getProfileOptions);

// PUT /api/users/advanced-profile - Gelişmiş profil güncelle
router.put('/advanced-profile', updateAdvancedProfile);

// GET /api/users/friends - Arkadaş listesi getir
router.get('/friends', getFriends);

// POST /api/users/friends - Arkadaş ekle
router.post('/friends', addFriend);

// DELETE /api/users/friends/:friend_id - Arkadaş çıkar
router.delete('/friends/:friend_id', removeFriend);

// GET /api/users/stats - Kullanıcı istatistiklerini getir
router.get('/stats', getUserStats);

// GET /api/users/:id - Belirli kullanıcının profilini getir
router.get('/:id', getUserById);

module.exports = router;
