const UserVehicle = require('../models/UserVehicle');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer konfigürasyonu - araç fotoğrafları için
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/vehicles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `vehicle-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
    }
  }
});

class VehicleController {
  // Kullanıcının tüm araçlarını getir
  static async getUserVehicles(req, res) {
    try {
      const userId = req.user.id;
      
      const vehicles = await UserVehicle.findByUserId(userId);
      
      // Fotoğraf URL'lerini tam URL olarak oluştur
      const protocol = req.protocol;
      const host = req.get('host');
      
      const vehiclesWithFullUrls = vehicles.map(vehicle => ({
        ...vehicle,
        photo_url: vehicle.photo_url ? `${protocol}://${host}${vehicle.photo_url}` : null
      }));
      
      res.status(200).json({
        success: true,
        data: vehiclesWithFullUrls,
        message: 'Araç bilgileri başarıyla getirildi'
      });
    } catch (error) {
      console.error('Get user vehicles error:', error);
      res.status(500).json({
        success: false,
        message: 'Araç bilgileri getirilirken bir hata oluştu'
      });
    }
  }

  // Yeni araç bilgisi ekle
  static async addVehicle(req, res) {
    try {
      const userId = req.user.id;
      
      // Frontend'den gelen verileri filtrele - sadece backend'de beklenen alanları al
      const { plate_number, brand, model, year, color, fuel_type, engine_volume, additional_info } = req.body;
      
      const vehicleData = {
        user_id: userId,
        plate_number,
        brand,
        model,
        year,
        color,
        fuel_type,
        engine_volume,
        additional_info
      };

      // Veri doğrulama
      const validationErrors = UserVehicle.validateVehicleData(vehicleData);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz veri',
          errors: validationErrors
        });
      }

      // Plaka numarasını büyük harfe çevir
      vehicleData.plate_number = vehicleData.plate_number.toUpperCase().replace(/\s+/g, ' ');

      // Aynı plaka numarası kontrolü
      const existingVehicle = await UserVehicle.findByPlateNumber(vehicleData.plate_number);
      if (existingVehicle && existingVehicle.user_id === userId) {
        return res.status(400).json({
          success: false,
          message: 'Bu plaka numarası zaten kayıtlı'
        });
      }

      // İlk araçsa ana araç olarak işaretle
      const userVehicles = await UserVehicle.findByUserId(userId);
      if (userVehicles.length === 0) {
        vehicleData.is_primary = true;
      }

      const newVehicle = await UserVehicle.create(vehicleData);
      console.log('New vehicle created:', newVehicle);
      console.log('New vehicle ID:', newVehicle?.id);
      console.log('New vehicle user_id:', newVehicle?.user_id);
      console.log('New vehicle keys:', Object.keys(newVehicle || {}));
      
      res.status(201).json({
        success: true,
        data: newVehicle,
        message: 'Araç bilgisi başarıyla eklendi'
      });
    } catch (error) {
      console.error('Add vehicle error:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'Bu plaka numarası zaten kullanılıyor'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Araç bilgisi eklenirken bir hata oluştu'
      });
    }
  }

  // Araç bilgisi güncelle
  static async updateVehicle(req, res) {
    try {
      const userId = req.user.id;
      const vehicleId = req.params.id;
      
      // Frontend'den gelen verileri filtrele - sadece backend'de beklenen alanları al
      const { plate_number, brand, model, year, color, fuel_type, engine_volume, additional_info } = req.body;
      
      const updateData = {
        plate_number,
        brand,
        model,
        year,
        color,
        fuel_type,
        engine_volume,
        additional_info
      };

      // Araç sahibi kontrolü
      const vehicle = await UserVehicle.findById(vehicleId);
      if (!vehicle || vehicle.user_id !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Araç bilgisi bulunamadı'
        });
      }

      // Plaka numarası güncelleniyorsa doğrula
      if (updateData.plate_number) {
        updateData.plate_number = updateData.plate_number.toUpperCase().replace(/\s+/g, ' ');
        
        const validationErrors = UserVehicle.validateVehicleData({
          ...vehicle,
          ...updateData
        });
        
        if (validationErrors.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Geçersiz veri',
            errors: validationErrors
          });
        }

        // Aynı plaka kontrolü (kendi aracı hariç)
        const existingVehicle = await UserVehicle.findByPlateNumber(updateData.plate_number);
        if (existingVehicle && existingVehicle.id !== parseInt(vehicleId)) {
          return res.status(400).json({
            success: false,
            message: 'Bu plaka numarası zaten kullanılıyor'
          });
        }
      }

      const updatedVehicle = await UserVehicle.update(vehicleId, updateData);
      
      res.status(200).json({
        success: true,
        data: updatedVehicle,
        message: 'Araç bilgisi başarıyla güncellendi'
      });
    } catch (error) {
      console.error('Update vehicle error:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'Bu plaka numarası zaten kullanılıyor'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Araç bilgisi güncellenirken bir hata oluştu'
      });
    }
  }

  // Araç bilgisi sil
  static async deleteVehicle(req, res) {
    try {
      const userId = req.user.id;
      const vehicleId = req.params.id;

      // Araç sahibi kontrolü
      const vehicle = await UserVehicle.findById(vehicleId);
      if (!vehicle || vehicle.user_id !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Araç bilgisi bulunamadı'
        });
      }

      // Ana araç siliniyorsa başka bir aracı ana araç yap
      if (vehicle.is_primary) {
        const userVehicles = await UserVehicle.findByUserId(userId);
        const otherVehicles = userVehicles.filter(v => v.id !== parseInt(vehicleId));
        
        if (otherVehicles.length > 0) {
          await UserVehicle.setPrimary(userId, otherVehicles[0].id);
        }
      }

      await UserVehicle.delete(vehicleId);
      
      res.status(200).json({
        success: true,
        message: 'Araç bilgisi başarıyla silindi'
      });
    } catch (error) {
      console.error('Delete vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Araç bilgisi silinirken bir hata oluştu'
      });
    }
  }

  // Ana araç olarak işaretle
  static async setPrimaryVehicle(req, res) {
    try {
      const userId = req.user.id;
      const vehicleId = req.params.id;

      // Araç sahibi kontrolü
      const vehicle = await UserVehicle.findById(vehicleId);
      if (!vehicle || vehicle.user_id !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Araç bilgisi bulunamadı'
        });
      }

      const updatedVehicle = await UserVehicle.setPrimary(userId, vehicleId);
      
      res.status(200).json({
        success: true,
        data: updatedVehicle,
        message: 'Ana araç başarıyla güncellendi'
      });
    } catch (error) {
      console.error('Set primary vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Ana araç güncellenirken bir hata oluştu'
      });
    }
  }

  // Ana aracı getir
  static async getPrimaryVehicle(req, res) {
    try {
      const userId = req.user.id;
      
      const primaryVehicle = await UserVehicle.findPrimaryByUserId(userId);
      
      res.status(200).json({
        success: true,
        data: primaryVehicle,
        message: 'Ana araç bilgisi başarıyla getirildi'
      });
    } catch (error) {
      console.error('Get primary vehicle error:', error);
      res.status(500).json({
        success: false,
        message: 'Ana araç bilgisi getirilirken bir hata oluştu'
      });
    }
  }

  // Araç fotoğrafı yükle
  static async uploadVehiclePhoto(req, res) {
    try {
      console.log('Upload vehicle photo request:', {
        userId: req.user.id,
        vehicleId: req.params.id,
        vehicleIdType: typeof req.params.id,
        vehicleIdValue: req.params.id,
        file: req.file ? req.file.filename : 'No file'
      });

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Dosya yüklenmedi'
        });
      }

      const userId = req.user.id;
      const vehicleId = req.params.id;
      const photoPath = `/uploads/vehicles/${req.file.filename}`;
      
      // Dinamik URL oluştur
      const protocol = req.protocol;
      const host = req.get('host');
      const fullPhotoUrl = `${protocol}://${host}${photoPath}`;

      // Araç sahibi kontrolü
      console.log('Looking for vehicle with ID:', vehicleId);
      const vehicle = await UserVehicle.findById(vehicleId);
      console.log('Vehicle found:', vehicle);
      console.log('Checking ownership:', {
        vehicleUserId: vehicle?.user_id,
        requestUserId: userId,
        isOwner: vehicle?.user_id === userId,
        vehicleIdType: typeof vehicleId,
        vehicleIdValue: vehicleId
      });
      
      if (!vehicle) {
        console.log('Vehicle not found with ID:', vehicleId);
        console.log('Available vehicles in database:');
        try {
          const allVehicles = await UserVehicle.findByUserId(userId);
          console.log('User vehicles:', allVehicles.map(v => ({ id: v.id, plate: v.plate_number })));
        } catch (err) {
          console.error('Error fetching user vehicles:', err);
        }
        
        // Yüklenen dosyayı sil
        const filePath = path.join(__dirname, '..', photoPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        return res.status(404).json({
          success: false,
          message: `Araç bulunamadı (ID: ${vehicleId}). Lütfen araç listesini yenileyin.`
        });
      }
      
      if (vehicle.user_id !== userId) {
        console.log('Vehicle ownership mismatch:', {
          vehicleUserId: vehicle.user_id,
          requestUserId: userId,
          vehicleId: vehicleId
        });
        
        // Development ortamında daha toleranslı ol
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: Bypassing ownership check');
          // Yüklenen dosyayı sil
          const filePath = path.join(__dirname, '..', photoPath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          
          return res.status(403).json({
            success: false,
            message: 'Development mode: Ownership check bypassed. Vehicle belongs to user ' + vehicle.user_id + ' but request from user ' + userId
          });
        }
        
        // Yüklenen dosyayı sil
        const filePath = path.join(__dirname, '..', photoPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        return res.status(403).json({
          success: false,
          message: 'Bu araca fotoğraf yükleme yetkiniz yok'
        });
      }

      // Eski fotoğrafı sil (varsa)
      if (vehicle.photo_url) {
        const oldFilePath = path.join(__dirname, '..', vehicle.photo_url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Araç fotoğrafını güncelle
      const updatedVehicle = await UserVehicle.update(vehicleId, {
        photo_url: photoPath
      });

      res.status(200).json({
        success: true,
        data: {
          vehicle: {
            ...updatedVehicle,
            photo_url: fullPhotoUrl
          }
        },
        message: 'Araç fotoğrafı başarıyla yüklendi'
      });

    } catch (error) {
      console.error('Upload vehicle photo error:', error);
      res.status(500).json({
        success: false,
        message: 'Araç fotoğrafı yüklenirken bir hata oluştu'
      });
    }
  }
}

module.exports = {
  VehicleController,
  upload
};
