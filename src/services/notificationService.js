import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import apiService from './api';

// Bildirim ayarlarını yapılandır
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.expoPushToken = null;
  }

  // Servisi başlat
  async initialize() {
    try {
      console.log('🔔 NotificationService: Başlatılıyor...');
      
      // İzinleri kontrol et ve al
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('🔔 NotificationService: Bildirim izni verilmedi');
        return false;
      }
      
      // Expo push token'ı al
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.log('🔔 NotificationService: Project ID bulunamadı');
        return false;
      }
      
      this.expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      console.log('🔔 NotificationService: Expo Push Token:', this.expoPushToken.data);
      
      // Token'ı backend'e gönder
      await this.sendTokenToBackend(this.expoPushToken.data);
      
      this.isInitialized = true;
      console.log('🔔 NotificationService: Başarıyla başlatıldı');
      return true;
      
    } catch (error) {
      console.error('🔔 NotificationService: Başlatma hatası:', error);
      return false;
    }
  }

  // Push token'ı backend'e gönder
  async sendTokenToBackend(token) {
    try {
      const userToken = await apiService.getStoredToken();
      if (userToken) {
        apiService.setToken(userToken);
        const response = await apiService.post('/notifications/register-token', {
          pushToken: token,
          platform: Platform.OS
        });
        
        if (response.success) {
          console.log('🔔 NotificationService: Token backend\'e gönderildi');
        } else {
          console.log('🔔 NotificationService: Token gönderilemedi:', response.message);
        }
      }
    } catch (error) {
      console.error('🔔 NotificationService: Token gönderme hatası:', error);
    }
  }

  // Test bildirimi gönder
  async sendTestNotification() {
    try {
      if (!this.isInitialized) {
        console.log('🔔 NotificationService: Servis başlatılmamış');
        return false;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Bildirimi",
          body: "Bu bir test bildirimidir!",
          data: { type: 'test' },
        },
        trigger: { seconds: 1 },
      });

      console.log('🔔 NotificationService: Test bildirimi gönderildi');
      return true;
    } catch (error) {
      console.error('🔔 NotificationService: Test bildirimi hatası:', error);
      return false;
    }
  }

  // Yerel bildirim gönder
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Hemen gönder
      });
      
      console.log('🔔 NotificationService: Yerel bildirim gönderildi:', title);
      return true;
    } catch (error) {
      console.error('🔔 NotificationService: Yerel bildirim hatası:', error);
      return false;
    }
  }

  // Bildirim dinleyicisi ekle
  addNotificationListener(listener) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  // Bildirim tıklama dinleyicisi ekle
  addNotificationResponseListener(listener) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Bildirim dinleyicisini kaldır
  removeNotificationListener(subscription) {
    Notifications.removeNotificationSubscription(subscription);
  }

  // Tüm bildirimleri temizle
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('🔔 NotificationService: Tüm bildirimler temizlendi');
      return true;
    } catch (error) {
      console.error('🔔 NotificationService: Bildirim temizleme hatası:', error);
      return false;
    }
  }

  // Badge sayısını ayarla
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('🔔 NotificationService: Badge sayısı ayarlandı:', count);
      return true;
    } catch (error) {
      console.error('🔔 NotificationService: Badge ayarlama hatası:', error);
      return false;
    }
  }

  // Servis durumunu kontrol et
  isServiceInitialized() {
    return this.isInitialized;
  }

  // Expo push token'ı al
  getExpoPushToken() {
    return this.expoPushToken;
  }
}

// Singleton instance oluştur
const notificationService = new NotificationService();

export default notificationService;
