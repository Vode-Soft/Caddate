import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';

class CameraService {
  constructor() {
    this.isInitialized = false;
    this.permissions = {
      camera: false,
      mediaLibrary: false,
      audio: false
    };
  }

  // Tüm izinleri iste
  async requestAllPermissions() {
    try {
      console.log('📷 Kamera servisi izinleri isteniyor...');

      // Kamera izni
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      this.permissions.camera = cameraPermission.status === 'granted';

      // Medya kütüphanesi izni
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      this.permissions.mediaLibrary = mediaPermission.status === 'granted';

      // Mikrofon izni (video için)
      const audioPermission = await Camera.requestMicrophonePermissionsAsync();
      this.permissions.audio = audioPermission.status === 'granted';

      console.log('📷 İzin durumu:', this.permissions);

      if (!this.permissions.camera) {
        Alert.alert(
          'Kamera İzni Gerekli',
          'Fotoğraf çekmek için kamera iznine ihtiyacımız var.',
          [{ text: 'Tamam' }]
        );
        return false;
      }

      if (!this.permissions.mediaLibrary) {
        Alert.alert(
          'Galeri İzni Gerekli',
          'Fotoğrafları kaydetmek için galeri iznine ihtiyacımız var.',
          [{ text: 'Tamam' }]
        );
        return false;
      }

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('📷 İzin alma hatası:', error);
      Alert.alert('Hata', 'İzinler alınırken bir hata oluştu.');
      return false;
    }
  }

  // Mevcut izinleri kontrol et
  async checkPermissions() {
    try {
      const cameraPermission = await Camera.getCameraPermissionsAsync();
      const mediaPermission = await MediaLibrary.getPermissionsAsync();
      const audioPermission = await Camera.getMicrophonePermissionsAsync();

      this.permissions = {
        camera: cameraPermission.status === 'granted',
        mediaLibrary: mediaPermission.status === 'granted',
        audio: audioPermission.status === 'granted'
      };

      return this.permissions;
    } catch (error) {
      console.error('📷 İzin kontrol hatası:', error);
      return this.permissions;
    }
  }

  // Fotoğraf çek
  async takePhoto(options = {}) {
    try {
      if (!this.isInitialized) {
        const hasPermissions = await this.requestAllPermissions();
        if (!hasPermissions) return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
        exif: false,
        ...options
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📷 Fotoğraf çekildi:', asset.uri);
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          type: asset.type,
          fileName: asset.fileName
        };
      }

      return null;
    } catch (error) {
      console.error('📷 Fotoğraf çekme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
      return null;
    }
  }

  // Galeriden fotoğraf seç
  async pickImage(options = {}) {
    try {
      if (!this.isInitialized) {
        const hasPermissions = await this.requestAllPermissions();
        if (!hasPermissions) return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
        exif: false,
        ...options
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📷 Fotoğraf seçildi:', asset.uri);
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          type: asset.type,
          fileName: asset.fileName
        };
      }

      return null;
    } catch (error) {
      console.error('📷 Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
      return null;
    }
  }

  // Çoklu fotoğraf seç
  async pickMultipleImages(options = {}) {
    try {
      if (!this.isInitialized) {
        const hasPermissions = await this.requestAllPermissions();
        if (!hasPermissions) return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: false,
        exif: false,
        ...options
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('📷 Çoklu fotoğraf seçildi:', result.assets.length);
        return result.assets.map(asset => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          type: asset.type,
          fileName: asset.fileName
        }));
      }

      return null;
    } catch (error) {
      console.error('📷 Çoklu fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraflar seçilirken bir hata oluştu.');
      return null;
    }
  }

  // Video kaydet
  async recordVideo(options = {}) {
    try {
      if (!this.isInitialized) {
        const hasPermissions = await this.requestAllPermissions();
        if (!hasPermissions) return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // 60 saniye
        ...options
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('📹 Video kaydedildi:', asset.uri);
        return {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          duration: asset.duration,
          fileSize: asset.fileSize,
          type: asset.type,
          fileName: asset.fileName
        };
      }

      return null;
    } catch (error) {
      console.error('📹 Video kaydetme hatası:', error);
      Alert.alert('Hata', 'Video kaydedilirken bir hata oluştu.');
      return null;
    }
  }

  // Dosya boyutunu formatla
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Dosya tipini kontrol et
  isValidImageType(uri) {
    const validTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const extension = uri.toLowerCase().substring(uri.lastIndexOf('.'));
    return validTypes.includes(extension);
  }

  // Dosya boyutunu kontrol et (MB cinsinden)
  isValidFileSize(fileSize, maxSizeMB = 10) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return fileSize <= maxSizeBytes;
  }

  // Fotoğrafı galeriye kaydet
  async saveToGallery(uri) {
    try {
      if (!this.permissions.mediaLibrary) {
        Alert.alert('İzin Gerekli', 'Fotoğrafı kaydetmek için galeri iznine ihtiyacımız var.');
        return false;
      }

      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('📷 Fotoğraf galeriye kaydedildi:', asset.id);
      return true;
    } catch (error) {
      console.error('📷 Galeriye kaydetme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf galeriye kaydedilemedi.');
      return false;
    }
  }

  // Galeriden fotoğraf sil
  async deleteFromGallery(assetId) {
    try {
      if (!this.permissions.mediaLibrary) {
        Alert.alert('İzin Gerekli', 'Fotoğrafı silmek için galeri iznine ihtiyacımız var.');
        return false;
      }

      await MediaLibrary.deleteAssetsAsync([assetId]);
      console.log('📷 Fotoğraf galeriden silindi:', assetId);
      return true;
    } catch (error) {
      console.error('📷 Galeriden silme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf galeriden silinemedi.');
      return false;
    }
  }

  // Galeri fotoğraflarını getir
  async getGalleryPhotos(options = {}) {
    try {
      if (!this.permissions.mediaLibrary) {
        Alert.alert('İzin Gerekli', 'Fotoğrafları görüntülemek için galeri iznine ihtiyacımız var.');
        return null;
      }

      const result = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 100,
        ...options
      });

      console.log('📷 Galeri fotoğrafları getirildi:', result.assets.length);
      return result.assets;
    } catch (error) {
      console.error('📷 Galeri fotoğrafları getirme hatası:', error);
      Alert.alert('Hata', 'Galeri fotoğrafları getirilemedi.');
      return null;
    }
  }
}

export default new CameraService();