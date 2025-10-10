const { pool } = require('../config/database');

class PhotoComment {
  // Yorum oluştur
  static async create(commentData) {
    const { photo_id, user_id, comment } = commentData;
    
    const query = `
      INSERT INTO photo_comments (photo_id, user_id, comment, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, photo_id, user_id, comment, created_at
    `;
    
    const values = [photo_id, user_id, comment];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Fotoğrafın yorumlarını getir
  static async getByPhotoId(photoId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        c.id,
        c.photo_id,
        c.user_id,
        c.comment,
        c.created_at,
        c.updated_at,
        u.first_name,
        u.last_name,
        u.profile_picture
      FROM photo_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.photo_id = $1
      ORDER BY c.created_at ASC
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await pool.query(query, [photoId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Kullanıcının yorumlarını getir
  static async getByUserId(userId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        c.id,
        c.photo_id,
        c.user_id,
        c.comment,
        c.created_at,
        c.updated_at,
        p.photo_url,
        u.first_name,
        u.last_name,
        u.profile_picture
      FROM photo_comments c
      JOIN photos p ON c.photo_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Yorumu güncelle
  static async update(commentId, userId, comment) {
    const query = `
      UPDATE photo_comments 
      SET comment = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING id, photo_id, user_id, comment, updated_at
    `;
    
    try {
      const result = await pool.query(query, [comment, commentId, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Yorumu sil
  static async delete(commentId, userId) {
    const query = `
      DELETE FROM photo_comments 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, [commentId, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Fotoğrafın yorum sayısını getir
  static async getCountByPhotoId(photoId) {
    const query = 'SELECT COUNT(*) as count FROM photo_comments WHERE photo_id = $1';
    
    try {
      const result = await pool.query(query, [photoId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw error;
    }
  }

  // Kullanıcının yorum sayısını getir
  static async getCountByUserId(userId) {
    const query = 'SELECT COUNT(*) as count FROM photo_comments WHERE user_id = $1';
    
    try {
      const result = await pool.query(query, [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw error;
    }
  }

  // Yorumu ID ile getir
  static async getById(commentId) {
    const query = `
      SELECT 
        c.id,
        c.photo_id,
        c.user_id,
        c.comment,
        c.created_at,
        c.updated_at,
        u.first_name,
        u.last_name,
        u.profile_picture
      FROM photo_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    
    try {
      const result = await pool.query(query, [commentId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PhotoComment;
