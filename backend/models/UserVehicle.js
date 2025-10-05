const { pool } = require('../config/database');

class UserVehicle {
  // Araç bilgisi oluşturma
  static async create(vehicleData) {
    const { 
      user_id, 
      plate_number, 
      brand, 
      model, 
      year, 
      color, 
      fuel_type, 
      engine_volume, 
      additional_info,
      photo_url 
    } = vehicleData;
    
    const query = `
      INSERT INTO user_vehicles (
        user_id, plate_number, brand, model, year, color, 
        fuel_type, engine_volume, additional_info, photo_url, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `;
    
    const values = [
      user_id, plate_number, brand, model, year, color, 
      fuel_type, engine_volume, additional_info, photo_url
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Kullanıcının tüm araçlarını getir
  static async findByUserId(userId) {
    const query = `
      SELECT * FROM user_vehicles 
      WHERE user_id = $1 
      ORDER BY is_primary DESC, created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // ID ile araç bilgisi getir
  static async findById(id) {
    const query = 'SELECT * FROM user_vehicles WHERE id = $1';
    
    try {
      console.log('UserVehicle.findById called with ID:', id, 'Type:', typeof id);
      const result = await pool.query(query, [id]);
      console.log('Query result:', result.rows.length, 'rows found');
      if (result.rows.length > 0) {
        console.log('Vehicle found:', result.rows[0]);
      } else {
        console.log('No vehicle found with ID:', id);
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  // Plaka ile araç bilgisi getir
  static async findByPlateNumber(plateNumber) {
    const query = 'SELECT * FROM user_vehicles WHERE plate_number = $1';
    
    try {
      const result = await pool.query(query, [plateNumber]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Araç bilgisi güncelleme
  static async update(id, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Güncellenecek alanları hazırla
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('Güncellenecek alan bulunamadı');
    }

    const query = `
      UPDATE user_vehicles 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    values.push(id);

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Araç bilgisi silme
  static async delete(id) {
    const query = 'DELETE FROM user_vehicles WHERE id = $1 RETURNING *';
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Ana araç olarak işaretle
  static async setPrimary(userId, vehicleId) {
    try {
      // Önce tüm araçları ana araç olmaktan çıkar
      await pool.query(
        'UPDATE user_vehicles SET is_primary = false WHERE user_id = $1',
        [userId]
      );

      // Seçilen aracı ana araç yap
      const result = await pool.query(
        'UPDATE user_vehicles SET is_primary = true WHERE id = $1 AND user_id = $2 RETURNING *',
        [vehicleId, userId]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Kullanıcının ana aracını getir
  static async findPrimaryByUserId(userId) {
    const query = `
      SELECT * FROM user_vehicles 
      WHERE user_id = $1 AND is_primary = true 
      LIMIT 1
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Plaka doğrulama (esnek format)
  static validatePlateNumber(plateNumber) {
    if (!plateNumber || typeof plateNumber !== 'string') {
      return false;
    }
    
    const plate = plateNumber.trim().toUpperCase();
    
    // Basit doğrulama: 6-12 karakter, harf-rakam karışımı
    if (plate.length < 6 || plate.length > 12) {
      return false;
    }
    
    // Sadece harf, rakam ve boşluk içerebilir
    return /^[A-ZÇĞIİÖŞÜ0-9\s]+$/.test(plate);
  }

  // Araç bilgilerini doğrula
  static validateVehicleData(vehicleData) {
    const errors = [];

    if (!vehicleData.plate_number || !this.validatePlateNumber(vehicleData.plate_number)) {
      errors.push('Geçerli bir plaka numarası giriniz');
    }

    if (!vehicleData.brand || vehicleData.brand.trim().length < 2) {
      errors.push('Marka bilgisi en az 2 karakter olmalıdır');
    }

    if (!vehicleData.model || vehicleData.model.trim().length < 2) {
      errors.push('Model bilgisi en az 2 karakter olmalıdır');
    }

    if (vehicleData.year && (vehicleData.year < 1900 || vehicleData.year > new Date().getFullYear() + 1)) {
      errors.push('Geçerli bir model yılı giriniz');
    }

    return errors;
  }
}

module.exports = UserVehicle;
