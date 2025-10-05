const { pool } = require('../config/database');

// Bildirimleri getir
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.is_read,
        n.is_sent,
        n.sent_at,
        n.read_at,
        n.created_at,
        n.updated_at,
        s.first_name as sender_first_name,
        s.last_name as sender_last_name,
        s.profile_picture as sender_profile_picture
      FROM notifications n
      LEFT JOIN users s ON s.id = n.sender_id
      WHERE n.user_id = $1
    `;
    
    const queryParams = [userId];
    
    if (unreadOnly === 'true') {
      query += ' AND n.is_read = false';
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT $2 OFFSET $3';
    queryParams.push(limit, offset);
    
    const result = await pool.query(query, queryParams);
    
    const notifications = result.rows.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.is_read,
      isSent: notification.is_sent,
      sentAt: notification.sent_at,
      readAt: notification.read_at,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at,
      sender: notification.sender_first_name ? {
        firstName: notification.sender_first_name,
        lastName: notification.sender_last_name,
        profilePicture: notification.sender_profile_picture
      } : null
    }));
    
    // Toplam sayıyı al
    let countQuery = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
    const countParams = [userId];
    
    if (unreadOnly === 'true') {
      countQuery += ' AND is_read = false';
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page * limit < totalCount,
          hasPrevPage: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirimler alınırken hata oluştu'
    });
  }
};

// Bildirimi okundu olarak işaretle
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING id, read_at
    `;
    
    const result = await pool.query(query, [notificationId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bildirim bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Bildirim okundu olarak işaretlendi',
      data: {
        notificationId: result.rows[0].id,
        readAt: result.rows[0].read_at
      }
    });
    
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirim işaretlenirken hata oluştu'
    });
  }
};

// Tüm bildirimleri okundu olarak işaretle
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
      RETURNING COUNT(*) as updated_count
    `;
    
    const result = await pool.query(query, [userId]);
    const updatedCount = parseInt(result.rows[0].updated_count);
    
    res.json({
      success: true,
      message: `${updatedCount} bildirim okundu olarak işaretlendi`,
      data: {
        updatedCount
      }
    });
    
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirimler işaretlenirken hata oluştu'
    });
  }
};

// Bildirimi sil
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    const query = `
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await pool.query(query, [notificationId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bildirim bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Bildirim silindi',
      data: {
        deletedNotificationId: result.rows[0].id
      }
    });
    
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirim silinirken hata oluştu'
    });
  }
};

// Okunmuş bildirimleri sil
const deleteReadNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      DELETE FROM notifications 
      WHERE user_id = $1 AND is_read = true
      RETURNING COUNT(*) as deleted_count
    `;
    
    const result = await pool.query(query, [userId]);
    const deletedCount = parseInt(result.rows[0].deleted_count);
    
    res.json({
      success: true,
      message: `${deletedCount} okunmuş bildirim silindi`,
      data: {
        deletedCount
      }
    });
    
  } catch (error) {
    console.error('Delete read notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirimler silinirken hata oluştu'
    });
  }
};

// Bildirim istatistiklerini getir
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
        COUNT(CASE WHEN is_sent = false THEN 1 END) as unsent_count,
        COUNT(CASE WHEN type = 'friend_request' THEN 1 END) as friend_request_count,
        COUNT(CASE WHEN type = 'message' THEN 1 END) as message_count,
        COUNT(CASE WHEN type = 'like' THEN 1 END) as like_count,
        COUNT(CASE WHEN type = 'comment' THEN 1 END) as comment_count,
        COUNT(CASE WHEN type = 'system' THEN 1 END) as system_count
      FROM notifications 
      WHERE user_id = $1
    `;
    
    const result = await pool.query(statsQuery, [userId]);
    const stats = result.rows[0];
    
    res.json({
      success: true,
      data: {
        totalNotifications: parseInt(stats.total_notifications) || 0,
        unreadCount: parseInt(stats.unread_count) || 0,
        unsentCount: parseInt(stats.unsent_count) || 0,
        byType: {
          friendRequest: parseInt(stats.friend_request_count) || 0,
          message: parseInt(stats.message_count) || 0,
          like: parseInt(stats.like_count) || 0,
          comment: parseInt(stats.comment_count) || 0,
          system: parseInt(stats.system_count) || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Bildirim istatistikleri alınırken hata oluştu'
    });
  }
};

// Bildirim oluştur (internal use)
const createNotification = async (userId, type, title, message, data = {}, senderId = null) => {
  try {
    const query = `
      INSERT INTO notifications (user_id, sender_id, type, title, message, data, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, created_at
    `;
    
    const result = await pool.query(query, [userId, senderId, type, title, message, JSON.stringify(data)]);
    
    return {
      success: true,
      data: {
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at
      }
    };
  } catch (error) {
    console.error('Create notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Bildirim gönder (internal use)
const sendNotification = async (notificationId) => {
  try {
    const query = `
      UPDATE notifications 
      SET is_sent = true, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, sent_at
    `;
    
    const result = await pool.query(query, [notificationId]);
    
    return {
      success: true,
      data: {
        id: result.rows[0].id,
        sentAt: result.rows[0].sent_at
      }
    };
  } catch (error) {
    console.error('Send notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Push token kaydet
const registerPushToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pushToken, deviceType, deviceId } = req.body;
    
    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token gerekli'
      });
    }

    // Push token tablosunu oluştur (eğer yoksa)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        push_token TEXT NOT NULL,
        device_type VARCHAR(20),
        device_id VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, push_token)
      )
    `);

    // Mevcut token'ı kontrol et
    const existingToken = await pool.query(
      'SELECT id FROM push_tokens WHERE user_id = $1 AND push_token = $2',
      [userId, pushToken]
    );

    if (existingToken.rows.length > 0) {
      // Token zaten mevcut, güncelle
      await pool.query(
        'UPDATE push_tokens SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [existingToken.rows[0].id]
      );
    } else {
      // Yeni token ekle
      await pool.query(
        'INSERT INTO push_tokens (user_id, push_token, device_type, device_id) VALUES ($1, $2, $3, $4)',
        [userId, pushToken, deviceType, deviceId]
      );
    }

    res.json({
      success: true,
      message: 'Push token başarıyla kaydedildi'
    });

  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Push token kaydedilirken hata oluştu'
    });
  }
};

// Push notification gönder
const sendPushNotification = async (req, res) => {
  try {
    const { userId, title, body, data = {} } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'userId, title ve body gerekli'
      });
    }

    // Kullanıcının push token'ını al
    const userResult = await pool.query(
      'SELECT push_token FROM users WHERE id = $1 AND push_token IS NOT NULL',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı veya push token yok'
      });
    }

    const pushToken = userResult.rows[0].push_token;

    // Expo push notification gönder
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result.data && result.data[0] && result.data[0].status === 'ok') {
      // Bildirimi veritabanına kaydet
      await createNotification({
        user_id: userId,
        type: 'push',
        title: title,
        message: body,
        data: JSON.stringify(data)
      });

      res.json({
        success: true,
        message: 'Push notification gönderildi',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Push notification gönderilemedi',
        error: result
      });
    }

  } catch (error) {
    console.error('Push notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Push notification gönderilirken hata oluştu',
      error: error.message
    });
  }
};

// Toplu push notification gönder
const sendBulkPushNotification = async (req, res) => {
  try {
    const { userIds, title, body, data = {} } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'userIds (array), title ve body gerekli'
      });
    }

    // Kullanıcıların push token'larını al
    const placeholders = userIds.map((_, index) => `$${index + 1}`).join(',');
    const userResult = await pool.query(
      `SELECT id, push_token FROM users WHERE id IN (${placeholders}) AND push_token IS NOT NULL`,
      userIds
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hiçbir kullanıcı bulunamadı veya push token yok'
      });
    }

    // Her kullanıcı için push notification hazırla
    const messages = userResult.rows.map(user => ({
      to: user.push_token,
      sound: 'default',
      title: title,
      body: body,
      data: { ...data, userId: user.id },
      badge: 1
    }));

    // Expo push notification gönder
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Başarılı gönderimleri say
    const successCount = result.data ? result.data.filter(item => item.status === 'ok').length : 0;

    // Bildirimleri veritabanına kaydet
    for (const user of userResult.rows) {
      await createNotification({
        user_id: user.id,
        type: 'push',
        title: title,
        message: body,
        data: JSON.stringify({ ...data, userId: user.id })
      });
    }

    res.json({
      success: true,
      message: `${successCount}/${userResult.rows.length} push notification gönderildi`,
      data: {
        total: userResult.rows.length,
        success: successCount,
        failed: userResult.rows.length - successCount,
        details: result
      }
    });

  } catch (error) {
    console.error('Bulk push notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu push notification gönderilirken hata oluştu',
      error: error.message
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  getNotificationStats,
  createNotification,
  sendNotification,
  registerPushToken,
  sendPushNotification,
  sendBulkPushNotification
};
