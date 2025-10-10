const { pool } = require('../config/database');

class LocationHistory {
  // Konum geçmişi kaydet
  static async create(userId, locationData) {
    const { latitude, longitude, accuracy, address, city, country } = locationData;
    
    const query = `
      INSERT INTO location_history (user_id, latitude, longitude, accuracy, address, city, country, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, created_at
    `;
    
    const values = [userId, latitude, longitude, accuracy, address, city, country];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Kullanıcının konum geçmişini getir
  static async getByUserId(userId, limit = 100, offset = 0) {
    const query = `
      SELECT 
        id,
        latitude,
        longitude,
        accuracy,
        address,
        city,
        country,
        created_at
      FROM location_history 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Son N günün konum geçmişini getir
  static async getByUserIdAndDays(userId, days = 7) {
    const query = `
      SELECT 
        id,
        latitude,
        longitude,
        accuracy,
        address,
        city,
        country,
        created_at
      FROM location_history 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Konum geçmişini temizle (eski kayıtları sil)
  static async cleanupOldRecords(daysToKeep = 30) {
    const query = `
      DELETE FROM location_history 
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      RETURNING COUNT(*) as deleted_count
    `;
    
    try {
      const result = await pool.query(query);
      return parseInt(result.rows[0].deleted_count);
    } catch (error) {
      throw error;
    }
  }

  // Kullanıcının konum geçmişi sayısını getir
  static async getCountByUserId(userId) {
    const query = 'SELECT COUNT(*) as count FROM location_history WHERE user_id = $1';
    
    try {
      const result = await pool.query(query, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw error;
    }
  }

  // Belirli bir tarih aralığındaki konum geçmişini getir
  static async getByDateRange(userId, startDate, endDate) {
    const query = `
      SELECT 
        id,
        latitude,
        longitude,
        accuracy,
        address,
        city,
        country,
        created_at
      FROM location_history 
      WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      ORDER BY created_at DESC
    `;
    
    try {
      const result = await pool.query(query, [userId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = LocationHistory;
