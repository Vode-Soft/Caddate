const pushNotificationService = require('../services/pushNotificationService');

class PushNotificationController {
  // FCM token'ı güncelle
  async updateToken(req, res) {
    try {
      const { token } = req.body;
      const userId = req.user.id;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'FCM token gereklidir'
        });
      }

      const result = await pushNotificationService.updateUserToken(userId, token);

      if (result.success) {
        res.json({
          success: true,
          message: 'FCM token güncellendi'
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message || 'FCM token güncellenemedi'
        });
      }
    } catch (error) {
      console.error('Update FCM token error:', error);
      res.status(500).json({
        success: false,
        message: 'FCM token güncellenirken bir hata oluştu'
      });
    }
  }

  // FCM token'ı sil
  async removeToken(req, res) {
    try {
      const userId = req.user.id;

      const result = await pushNotificationService.removeUserToken(userId);

      if (result.success) {
        res.json({
          success: true,
          message: 'FCM token silindi'
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message || 'FCM token silinemedi'
        });
      }
    } catch (error) {
      console.error('Remove FCM token error:', error);
      res.status(500).json({
        success: false,
        message: 'FCM token silinirken bir hata oluştu'
      });
    }
  }

  // Test push notification gönder
  async sendTestNotification(req, res) {
    try {
      const userId = req.user.id;
      const { title = 'Test Bildirimi', body = 'Bu bir test bildirimidir.' } = req.body;

      const notification = {
        title,
        body,
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      };

      const result = await pushNotificationService.sendToUser(userId, notification);

      if (result.success) {
        res.json({
          success: true,
          message: 'Test bildirimi gönderildi'
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message || 'Test bildirimi gönderilemedi'
        });
      }
    } catch (error) {
      console.error('Send test notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Test bildirimi gönderilirken bir hata oluştu'
      });
    }
  }

  // Bildirim ayarlarını getir
  async getNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      const { pool } = require('../config/database');

      const result = await pool.query(
        'SELECT push_notifications_enabled, email_notifications_enabled FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      const settings = result.rows[0];

      res.json({
        success: true,
        data: {
          pushNotifications: settings.push_notifications_enabled || false,
          emailNotifications: settings.email_notifications_enabled || false
        }
      });
    } catch (error) {
      console.error('Get notification settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Bildirim ayarları alınırken bir hata oluştu'
      });
    }
  }

  // Bildirim ayarlarını güncelle
  async updateNotificationSettings(req, res) {
    try {
      const { pushNotifications, emailNotifications } = req.body;
      const userId = req.user.id;

      const { pool } = require('../config/database');

      await pool.query(
        'UPDATE users SET push_notifications_enabled = $1, email_notifications_enabled = $2 WHERE id = $3',
        [pushNotifications, emailNotifications, userId]
      );

      res.json({
        success: true,
        message: 'Bildirim ayarları güncellendi'
      });
    } catch (error) {
      console.error('Update notification settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Bildirim ayarları güncellenirken bir hata oluştu'
      });
    }
  }
}

module.exports = new PushNotificationController();
