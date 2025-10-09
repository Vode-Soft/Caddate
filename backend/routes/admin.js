const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/adminAuth');

// Tüm route'lar admin yetkisi gerektirir
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Kullanıcı yönetimi
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId', adminController.updateUser);
router.post('/users/:userId/toggle-ban', adminController.toggleUserBan);
router.delete('/users/:userId', requireSuperAdmin, adminController.deleteUser); // Sadece super admin

// Fotoğraf yönetimi
router.get('/photos', adminController.getAllPhotos);
router.delete('/photos/:photoId', adminController.deletePhoto);

// Araç yönetimi
router.get('/vehicles', adminController.getAllVehicles);
router.post('/vehicles/:vehicleId/verify', adminController.verifyVehicle);
router.delete('/vehicles/:vehicleId', adminController.deleteVehicle);

// Mesaj yönetimi
router.get('/messages', adminController.getMessages);

// Güvenlik
router.get('/security/events', adminController.getSecurityEvents);

module.exports = router;

