import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

class BiometricService {
  constructor() {
    this.isSupported = false;
    this.hasHardware = false;
    this.isEnrolled = false;
    this.biometricType = null; // 'FaceID', 'TouchID', 'Fingerprint'
  }

  // Biyometrik desteği kontrol et
  async checkAvailability() {
    try {
      console.log('🔐 Biyometrik kimlik doğrulama kontrol ediliyor...');

      this.hasHardware = await LocalAuthentication.hasHardwareAsync();
      this.isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (this.hasHardware) {
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          this.biometricType = 'FaceID';
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          this.biometricType = 'Fingerprint';
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.TOUCH_ID)) {
          this.biometricType = 'TouchID'; // iOS specific
        }
      }
      
      this.isSupported = this.hasHardware && this.isEnrolled;
      
      console.log('🔐 Biyometrik durum:', {
        hasHardware: this.hasHardware,
        isEnrolled: this.isEnrolled,
        biometricType: this.biometricType,
        isSupported: this.isSupported
      });

      return {
        hasHardware: this.hasHardware,
        isEnrolled: this.isEnrolled,
        biometricType: this.biometricType,
        isSupported: this.isSupported
      };

    } catch (error) {
      console.error('🔐 Biyometrik kontrol hatası:', error);
      return { 
        hasHardware: false, 
        isEnrolled: false, 
        biometricType: null, 
        isSupported: false 
      };
    }
  }

  // Biyometrik kimlik doğrulama yap
  async authenticate(promptMessage = 'Kimliğinizi doğrulamak için parmak izinizi veya yüzünüzü kullanın.') {
    try {
      if (!this.isSupported) {
        const availability = await this.checkAvailability();
        if (!availability.isSupported) {
          Alert.alert(
            'Biyometrik Kimlik Doğrulama Mevcut Değil',
            'Bu cihazda biyometrik kimlik doğrulama desteklenmiyor veya ayarlanmamış.'
          );
          return { success: false, error: 'Biometric not available' };
        }
      }

      console.log('🔐 Biyometrik kimlik doğrulama başlatılıyor...');

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage,
        fallbackLabel: 'Şifre Kullan', // Android için
        cancelLabel: 'İptal',
        disableDeviceFallback: true, // Sadece biyometrik veya şifre
      });

      if (result.success) {
        console.log('🔐 Biyometrik kimlik doğrulama başarılı');
        return { success: true };
      } else {
        console.log('🔐 Biyometrik kimlik doğrulama başarısız veya iptal edildi:', result.error);
        Alert.alert(
          'Kimlik Doğrulama Başarısız', 
          'Biyometrik kimlik doğrulama başarısız oldu veya iptal edildi. Lütfen tekrar deneyin veya şifrenizi kullanın.'
        );
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('🔐 Biyometrik kimlik doğrulama hatası:', error);
      Alert.alert('Hata', 'Biyometrik kimlik doğrulama sırasında bir hata oluştu.');
      return { success: false, error: error.message };
    }
  }

  // Biyometrik ayarları kontrol et
  async checkBiometricSettings() {
    try {
      const availability = await this.checkAvailability();
      
      return {
        isAvailable: availability.isSupported,
        biometricType: availability.biometricType,
        hasHardware: availability.hasHardware,
        isEnrolled: availability.isEnrolled,
        canUseBiometric: availability.isSupported
      };
    } catch (error) {
      console.error('🔐 Biyometrik ayarlar kontrol hatası:', error);
      return {
        isAvailable: false,
        biometricType: null,
        hasHardware: false,
        isEnrolled: false,
        canUseBiometric: false
      };
    }
  }

  // Biyometrik kimlik doğrulama geçmişini kaydet
  async logAuthenticationAttempt(success, error = null) {
    try {
      const timestamp = new Date().toISOString();
      const logData = {
        timestamp,
        success,
        error,
        biometricType: this.biometricType,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version
        }
      };

      console.log('🔐 Kimlik doğrulama geçmişi:', logData);
      
      // Burada gerçek bir logging servisi kullanılabilir
      // await loggingService.log('biometric_authentication', logData);
      
      return logData;
    } catch (error) {
      console.error('🔐 Kimlik doğrulama geçmişi kaydetme hatası:', error);
    }
  }

  // Biyometrik kimlik doğrulama istatistikleri
  async getBiometricStats() {
    try {
      const availability = await this.checkAvailability();
      
      return {
        isSupported: availability.isSupported,
        biometricType: availability.biometricType,
        hasHardware: availability.hasHardware,
        isEnrolled: availability.isEnrolled,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('🔐 Biyometrik istatistikler hatası:', error);
      return {
        isSupported: false,
        biometricType: null,
        hasHardware: false,
        isEnrolled: false,
        lastChecked: null
      };
    }
  }

  // Biyometrik kimlik doğrulama önerisi
  async suggestBiometricSetup() {
    try {
      const availability = await this.checkAvailability();
      
      if (!availability.hasHardware) {
        return {
          shouldSuggest: false,
          message: 'Bu cihazda biyometrik kimlik doğrulama donanımı bulunmuyor.'
        };
      }

      if (!availability.isEnrolled) {
        return {
          shouldSuggest: true,
          message: `${availability.biometricType} ayarlanmamış. Güvenliğiniz için biyometrik kimlik doğrulamayı ayarlamanızı öneriyoruz.`,
          action: 'setup_biometric'
        };
      }

      return {
        shouldSuggest: false,
        message: 'Biyometrik kimlik doğrulama zaten ayarlanmış.'
      };
    } catch (error) {
      console.error('🔐 Biyometrik öneri hatası:', error);
      return {
        shouldSuggest: false,
        message: 'Biyometrik kimlik doğrulama durumu kontrol edilemedi.'
      };
    }
  }
}

export default new BiometricService();
