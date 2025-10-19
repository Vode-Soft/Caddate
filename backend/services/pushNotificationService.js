const admin = require('firebase-admin');

class PushNotificationService {
  constructor() {
    this.isConfigured = false;
    this.app = null;
  }

  // Firebase Admin SDK yapılandırması
  configure(serviceAccount) {
    try {
      if (!this.app) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      }
      this.isConfigured = true;
      console.log('✅ Firebase Admin SDK yapılandırıldı');
    } catch (error) {
      console.error('❌ Firebase Admin SDK yapılandırılamadı:', error.message);
      this.isConfigured = false;
    }
  }

  // Tek kullanıcıya push notification gönder
  async sendToUser(userId, notification) {
    if (!this.isConfigured) {
      console.log('⚠️ Push notification servisi yapılandırılmamış');
      return { success: false, message: 'Push notification servisi yapılandırılmamış' };
    }

    try {
      // Kullanıcının FCM token'ını al
      const { pool } = require('../config/database');
      const result = await pool.query(
        'SELECT push_token FROM users WHERE id = $1 AND push_token IS NOT NULL',
        [userId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Kullanıcının FCM token\'ı bulunamadı' };
      }

      const pushToken = result.rows[0].push_token;

      const message = {
        token: pushToken,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#FF6B6B',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('📱 Push notification gönderildi:', response);
      
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ Push notification gönderme hatası:', error);
      return { success: false, message: error.message };
    }
  }

  // Birden fazla kullanıcıya push notification gönder
  async sendToMultipleUsers(userIds, notification) {
    if (!this.isConfigured) {
      console.log('⚠️ Push notification servisi yapılandırılmamış');
      return { success: false, message: 'Push notification servisi yapılandırılmamış' };
    }

    try {
      const { pool } = require('../config/database');
      const result = await pool.query(
        'SELECT push_token FROM users WHERE id = ANY($1) AND push_token IS NOT NULL',
        [userIds]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Hiçbir kullanıcının FCM token\'ı bulunamadı' };
      }

      const tokens = result.rows.map(row => row.push_token);

      const message = {
        tokens: tokens,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#FF6B6B',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log('📱 Push notifications gönderildi:', response);
      
      return { 
        success: true, 
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      console.error('❌ Push notification gönderme hatası:', error);
      return { success: false, message: error.message };
    }
  }

  // Tüm kullanıcılara push notification gönder
  async sendToAllUsers(notification) {
    if (!this.isConfigured) {
      console.log('⚠️ Push notification servisi yapılandırılmamış');
      return { success: false, message: 'Push notification servisi yapılandırılmamış' };
    }

    try {
      const { pool } = require('../config/database');
      const result = await pool.query(
        'SELECT push_token FROM users WHERE push_token IS NOT NULL'
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Hiçbir kullanıcının FCM token\'ı bulunamadı' };
      }

      const tokens = result.rows.map(row => row.push_token);

      const message = {
        tokens: tokens,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#FF6B6B',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log('📱 Push notifications gönderildi:', response);
      
      return { 
        success: true, 
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      };
    } catch (error) {
      console.error('❌ Push notification gönderme hatası:', error);
      return { success: false, message: error.message };
    }
  }

  // Topic'e push notification gönder
  async sendToTopic(topic, notification) {
    if (!this.isConfigured) {
      console.log('⚠️ Push notification servisi yapılandırılmamış');
      return { success: false, message: 'Push notification servisi yapılandırılmamış' };
    }

    try {
      const message = {
        topic: topic,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#FF6B6B',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('📱 Topic push notification gönderildi:', response);
      
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ Topic push notification gönderme hatası:', error);
      return { success: false, message: error.message };
    }
  }

  // Kullanıcının FCM token'ını güncelle
  async updateUserToken(userId, token) {
    try {
      const { pool } = require('../config/database');
      await pool.query(
        'UPDATE users SET push_token = $1, push_token_updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [token, userId]
      );
      console.log('📱 FCM token güncellendi:', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ FCM token güncelleme hatası:', error);
      return { success: false, message: error.message };
    }
  }

  // Kullanıcının FCM token'ını sil
  async removeUserToken(userId) {
    try {
      const { pool } = require('../config/database');
      await pool.query(
        'UPDATE users SET push_token = NULL, push_token_updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
      console.log('📱 FCM token silindi:', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ FCM token silme hatası:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new PushNotificationService();
