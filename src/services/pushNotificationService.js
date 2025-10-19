import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import apiService from './api';

// Bildirim davranışını yapılandır
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Push notification izinlerini iste
  async requestPermissions() {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('❌ Push notification izni verilmedi');
          return false;
        }
        
        console.log('✅ Push notification izni verildi');
        return true;
      } else {
        console.log('⚠️ Fiziksel cihaz gerekli');
        return false;
      }
    } catch (error) {
      console.error('❌ Push notification izin hatası:', error);
      return false;
    }
  }

  // Expo push token'ı al
  async getExpoPushToken() {
    try {
      if (!Device.isDevice) {
        console.log('⚠️ Fiziksel cihaz gerekli');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      console.log('📱 Expo push token alındı:', token.data);
      this.expoPushToken = token.data;
      return token.data;
    } catch (error) {
      console.error('❌ Expo push token alma hatası:', error);
      return null;
    }
  }

  // FCM token'ı backend'e gönder
  async registerToken() {
    try {
      const token = await this.getExpoPushToken();
      if (!token) {
        console.log('⚠️ Token alınamadı');
        return false;
      }

      // Backend'e token'ı gönder
      const response = await apiService.post('/push-notifications/token', { token });
      
      if (response.success) {
        console.log('✅ FCM token backend\'e gönderildi');
        return true;
      } else {
        console.log('❌ FCM token backend\'e gönderilemedi:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ FCM token kayıt hatası:', error);
      return false;
    }
  }

  // Bildirim dinleyicilerini başlat
  startNotificationListeners() {
    // Bildirim geldiğinde
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Bildirim alındı:', notification);
      // Burada bildirim geldiğinde yapılacak işlemler
    });

    // Bildirime tıklandığında
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Bildirime tıklandı:', response);
      // Burada bildirime tıklandığında yapılacak işlemler
      this.handleNotificationResponse(response);
    });
  }

  // Bildirim yanıtını işle
  handleNotificationResponse(response) {
    const data = response.notification.request.content.data;
    
    if (data.type === 'confession') {
      // İtiraf bildirimi
      console.log('📝 İtiraf bildirimi işlendi');
    } else if (data.type === 'message') {
      // Mesaj bildirimi
      console.log('💬 Mesaj bildirimi işlendi');
    } else if (data.type === 'friend_request') {
      // Arkadaşlık isteği bildirimi
      console.log('👥 Arkadaşlık isteği bildirimi işlendi');
    }
  }

  // Bildirim dinleyicilerini durdur
  stopNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  // Test bildirimi gönder
  async sendTestNotification() {
    try {
      const response = await apiService.post('/push-notifications/test', {
        title: 'Test Bildirimi',
        body: 'Bu bir test bildirimidir.'
      });
      
      if (response.success) {
        console.log('✅ Test bildirimi gönderildi');
        return true;
      } else {
        console.log('❌ Test bildirimi gönderilemedi:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Test bildirimi gönderme hatası:', error);
      return false;
    }
  }

  // Bildirim ayarlarını getir
  async getNotificationSettings() {
    try {
      const response = await apiService.get('/push-notifications/settings');
      
      if (response.success) {
        return response.data;
      } else {
        console.log('❌ Bildirim ayarları alınamadı:', response.message);
        return null;
      }
    } catch (error) {
      console.error('❌ Bildirim ayarları alma hatası:', error);
      return null;
    }
  }

  // Bildirim ayarlarını güncelle
  async updateNotificationSettings(settings) {
    try {
      const response = await apiService.put('/push-notifications/settings', settings);
      
      if (response.success) {
        console.log('✅ Bildirim ayarları güncellendi');
        return true;
      } else {
        console.log('❌ Bildirim ayarları güncellenemedi:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Bildirim ayarları güncelleme hatası:', error);
      return false;
    }
  }

  // Yerel bildirim gönder
  async scheduleLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Hemen gönder
      });
      
      console.log('📱 Yerel bildirim gönderildi');
      return true;
    } catch (error) {
      console.error('❌ Yerel bildirim gönderme hatası:', error);
      return false;
    }
  }

  // Bildirim badge'ini temizle
  async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('✅ Bildirim badge temizlendi');
    } catch (error) {
      console.error('❌ Badge temizleme hatası:', error);
    }
  }

  // Tüm bildirimleri temizle
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('✅ Tüm bildirimler temizlendi');
    } catch (error) {
      console.error('❌ Bildirim temizleme hatası:', error);
    }
  }
}

// Singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
