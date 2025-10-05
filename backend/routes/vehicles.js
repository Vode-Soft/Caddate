const express = require('express');
const router = express.Router();
const { VehicleController, upload } = require('../controllers/vehicleController');
const { authenticateToken } = require('../middleware/auth');

// Tüm route'lar authentication gerektirir
router.use(authenticateToken);

// GET /api/vehicles - Kullanıcının tüm araçlarını getir
router.get('/', VehicleController.getUserVehicles);

// GET /api/vehicles/primary - Ana aracı getir
router.get('/primary', VehicleController.getPrimaryVehicle);

// POST /api/vehicles - Yeni araç bilgisi ekle
router.post('/', VehicleController.addVehicle);

// PUT /api/vehicles/:id - Araç bilgisi güncelle
router.put('/:id', VehicleController.updateVehicle);

// PUT /api/vehicles/:id/primary - Ana araç olarak işaretle
router.put('/:id/primary', VehicleController.setPrimaryVehicle);

// POST /api/vehicles/:id/photo - Araç fotoğrafı yükle
router.post('/:id/photo', upload.single('photo'), VehicleController.uploadVehiclePhoto);

// DELETE /api/vehicles/:id - Araç bilgisi sil
router.delete('/:id', VehicleController.deleteVehicle);

module.exports = router;
