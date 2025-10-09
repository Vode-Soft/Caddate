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
        console.log('🔔 NotificationService: İzin isteniyor...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('🔔 NotificationService: Bildirim izni verilmedi');
        return false;
      }
      
      console.log('🔔 NotificationService: Bildirim izni alındı');
      
      // Expo push token'ı al (sadece production build'de)
      // Development modunda push notification token'a gerek yok
      if (__DEV__) {
        console.log('🔔 NotificationService: Development modu - Push token atlanıyor');
        this.isInitialized = true;
        return true;
      }
      
      // Production build için Expo Push Token alma
      let projectId;
      try {
        projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                    Constants.manifest?.extra?.eas?.projectId ||
                    Constants.manifest2?.extra?.expoClient?.extra?.eas?.projectId;
        
        // Sahte/test UUID'leri filtrele
        const testUUIDs = [
          '12345678-1234-1234-1234-123456789abc',
          '00000000-0000-0000-0000-000000000000',
          'your-project-id'
        ];
        
        if (!projectId || testUUIDs.includes(projectId)) {
          console.warn('🔔 NotificationService: Geçerli Project ID bulunamadı');
          projectId = undefined;
        } else {
          console.log('🔔 NotificationService: Project ID bulundu:', projectId);
        }
      } catch (error) {
        console.warn('🔔 NotificationService: Project ID alma hatası:', error.message);
        projectId = undefined;
      }
      
      // Expo Push Token alma (sadece geçerli projectId varsa)
      if (!projectId) {
        console.warn('🔔 NotificationService: Project ID yok, push notification kullanılamayacak');
        console.warn('🔔 NotificationService: Gerçek bir EAS projesi oluşturup projectId\'yi app.config.js\'e eklemeniz gerekiyor');
        this.isInitialized = true;
        return true;
      }
      
      try {
        this.expoPushToken = await Notifications.getExpoPushTokenAsync({ projectId });
        console.log('🔔 NotificationService: Expo Push Token alındı:', this.expoPushToken.data);
        
        // Token'ı backend'e gönder
        if (this.expoPushToken?.data) {
          await this.sendTokenToBackend(this.expoPushToken.data);
        }
      } catch (tokenError) {
        console.error('🔔 NotificationService: Push token alma hatası:', tokenError);
        // Token alınamazsa bile servis çalışmaya devam etsin
        console.warn('🔔 NotificationService: Push notification devre dışı, yerel bildirimler çalışacak');
      }
      
      this.isInitialized = true;
      console.log('🔔 NotificationService: Başarıyla başlatıldı');
      return true;
      
    } catch (error) {
      console.error('🔔 NotificationService: Başlatma hatası:', error);
      // Development modunda hataları göz ardı et
      if (__DEV__) {
        console.warn('🔔 NotificationService: Development modunda hata göz ardı edildi');
        this.isInitialized = true;
        return true;
      }
      return false;
    }
  }

  // Push token'ı backend'e gönder
  async sendTokenToBackend(token) {
    if (!token) {
      console.log('🔔 NotificationService: Token boş, backend\'e gönderilmedi');
      return;
    }

    try {
      console.log('🔔 NotificationService: Token backend\'e gönderiliyor...');
      
      // API token'ını kontrol et
      const userToken = await apiService.getStoredToken();
      
      if (!userToken) {
        console.log('🔔 NotificationService: Kullanıcı token\'ı yok, backend\'e gönderilemedi (kullanıcı giriş yapmamış olabilir)');
        return;
      }
      
      // API token'ını set et
      apiService.setToken(userToken);
      
      // Backend'e gönder
      const response = await apiService.post('/notifications/register-token', {
        pushToken: token,
        platform: Platform.OS
      });
      
      if (response?.success) {
        console.log('🔔 NotificationService: Token başarıyla backend\'e gönderildi');
      } else {
        console.warn('🔔 NotificationService: Token gönderilemedi:', response?.message || 'Bilinmeyen hata');
      }
    } catch (error) {
      console.error('🔔 NotificationService: Token gönderme hatası:', error.message);
      // Backend hatası olsa bile servis çalışmaya devam etsin
      console.warn('🔔 NotificationService: Backend hatası göz ardı edildi, servis çalışmaya devam ediyor');
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
