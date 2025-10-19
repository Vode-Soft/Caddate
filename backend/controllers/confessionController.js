const { pool } = require('../config/database');

class ConfessionController {
  // İtiraf oluştur
  async createConfession(req, res) {
    try {
      const { content, isAnonymous = true } = req.body;
      const userId = req.user.id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'İtiraf içeriği boş olamaz'
        });
      }

      if (content.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'İtiraf en fazla 1000 karakter olabilir'
        });
      }

      // İtiraf tablosunu oluştur (yoksa)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS confessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          is_anonymous BOOLEAN DEFAULT true,
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          is_approved BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // İndeksleri oluştur
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_confessions_approved ON confessions(is_approved);
      `);

      // İtirafı kaydet
      const result = await pool.query(
        'INSERT INTO confessions (user_id, content, is_anonymous) VALUES ($1, $2, $3) RETURNING *',
        [userId, content, isAnonymous]
      );

      const confession = result.rows[0];

      res.status(201).json({
        success: true,
        message: 'İtirafınız başarıyla paylaşıldı',
        data: {
          confession: {
            id: confession.id,
            content: confession.content,
            isAnonymous: confession.is_anonymous,
            likesCount: confession.likes_count,
            commentsCount: confession.comments_count,
            createdAt: confession.created_at
          }
        }
      });

    } catch (error) {
      console.error('Create confession error:', error);
      res.status(500).json({
        success: false,
        message: 'İtiraf paylaşılırken bir hata oluştu'
      });
    }
  }

  // İtirafları listele
  async getConfessions(req, res) {
    try {
      const { page = 1, limit = 20, userId } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          c.*,
          u.first_name,
          u.last_name,
          u.profile_picture,
          CASE 
            WHEN c.is_anonymous = true THEN 'Anonim'
            ELSE CONCAT(u.first_name, ' ', u.last_name)
          END as author_name,
          CASE 
            WHEN c.is_anonymous = true THEN null
            ELSE u.profile_picture
          END as author_avatar
        FROM confessions c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.is_approved = true
      `;

      const queryParams = [];
      let paramCount = 0;

      if (userId) {
        query += ` AND c.user_id = $${++paramCount}`;
        queryParams.push(userId);
      }

      query += ` ORDER BY c.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // Toplam sayıyı al
      let countQuery = 'SELECT COUNT(*) FROM confessions WHERE is_approved = true';
      const countParams = [];
      if (userId) {
        countQuery += ' AND user_id = $1';
        countParams.push(userId);
      }

      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      const confessions = result.rows.map(row => ({
        id: row.id,
        content: row.content,
        isAnonymous: row.is_anonymous,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        likesCount: row.likes_count,
        commentsCount: row.comments_count,
        createdAt: row.created_at,
        timeAgo: this.getTimeAgo(row.created_at)
      }));

      res.json({
        success: true,
        data: {
          confessions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNext: offset + confessions.length < totalCount,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get confessions error:', error);
      res.status(500).json({
        success: false,
        message: 'İtiraflar yüklenirken bir hata oluştu'
      });
    }
  }

  // İtiraf beğen
  async likeConfession(req, res) {
    try {
      const { confessionId } = req.params;
      const userId = req.user.id;

      // Beğeni tablosunu oluştur (yoksa)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS confession_likes (
          id SERIAL PRIMARY KEY,
          confession_id INTEGER REFERENCES confessions(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(confession_id, user_id)
        );
      `);

      // Daha önce beğenmiş mi kontrol et
      const existingLike = await pool.query(
        'SELECT id FROM confession_likes WHERE confession_id = $1 AND user_id = $2',
        [confessionId, userId]
      );

      if (existingLike.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu itirafı zaten beğendiniz'
        });
      }

      // Beğeniyi kaydet
      await pool.query(
        'INSERT INTO confession_likes (confession_id, user_id) VALUES ($1, $2)',
        [confessionId, userId]
      );

      // Beğeni sayısını güncelle
      await pool.query(
        'UPDATE confessions SET likes_count = likes_count + 1 WHERE id = $1',
        [confessionId]
      );

      res.json({
        success: true,
        message: 'İtiraf beğenildi'
      });

    } catch (error) {
      console.error('Like confession error:', error);
      res.status(500).json({
        success: false,
        message: 'İtiraf beğenilirken bir hata oluştu'
      });
    }
  }

  // İtiraf beğenisini geri al
  async unlikeConfession(req, res) {
    try {
      const { confessionId } = req.params;
      const userId = req.user.id;

      // Beğeniyi sil
      const result = await pool.query(
        'DELETE FROM confession_likes WHERE confession_id = $1 AND user_id = $2',
        [confessionId, userId]
      );

      if (result.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu itirafı beğenmemişsiniz'
        });
      }

      // Beğeni sayısını güncelle
      await pool.query(
        'UPDATE confessions SET likes_count = likes_count - 1 WHERE id = $1',
        [confessionId]
      );

      res.json({
        success: true,
        message: 'İtiraf beğenisi geri alındı'
      });

    } catch (error) {
      console.error('Unlike confession error:', error);
      res.status(500).json({
        success: false,
        message: 'İtiraf beğenisi geri alınırken bir hata oluştu'
      });
    }
  }

  // Kullanıcının itiraflarını getir
  async getUserConfessions(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `SELECT * FROM confessions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const confessions = result.rows.map(row => ({
        id: row.id,
        content: row.content,
        isAnonymous: row.is_anonymous,
        likesCount: row.likes_count,
        commentsCount: row.comments_count,
        isApproved: row.is_approved,
        createdAt: row.created_at,
        timeAgo: this.getTimeAgo(row.created_at)
      }));

      res.json({
        success: true,
        data: { confessions }
      });

    } catch (error) {
      console.error('Get user confessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Kullanıcı itirafları yüklenirken bir hata oluştu'
      });
    }
  }

  // İtiraf sil
  async deleteConfession(req, res) {
    try {
      const { confessionId } = req.params;
      const userId = req.user.id;

      // İtirafın kullanıcıya ait olup olmadığını kontrol et
      const confession = await pool.query(
        'SELECT user_id FROM confessions WHERE id = $1',
        [confessionId]
      );

      if (confession.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'İtiraf bulunamadı'
        });
      }

      if (confession.rows[0].user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bu itirafı silme yetkiniz yok'
        });
      }

      // İtirafı sil
      await pool.query('DELETE FROM confessions WHERE id = $1', [confessionId]);

      res.json({
        success: true,
        message: 'İtiraf silindi'
      });

    } catch (error) {
      console.error('Delete confession error:', error);
      res.status(500).json({
        success: false,
        message: 'İtiraf silinirken bir hata oluştu'
      });
    }
  }

  // Zaman farkını hesapla
  getTimeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
      return 'Az önce';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} dakika önce`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} saat önce`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} gün önce`;
    }
  }
}

module.exports = new ConfessionController();
