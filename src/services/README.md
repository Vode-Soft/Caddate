# 🔧 Services Documentation

Bu klasör, uygulamanın çeşitli servislerini içerir.

## 📁 Dosya Yapısı

```
src/services/
├── api.js                    # Ana API servisi
├── socketService.js          # Socket.io bağlantı servisi
├── pushNotificationService.js # Push notification servisi
├── cameraService.js          # Kamera ve medya servisi
└── README.md                 # Bu dosya
```

## 🔌 API Service

### Temel Kullanım

```javascript
import apiService from '../services/api';

// Token'ı ayarla
await apiService.setToken(token);

// GET isteği
const response = await apiService.get('/users/profile');

// POST isteği
const response = await apiService.post('/users/profile', userData);
```

### Özellikler

- ✅ Otomatik token yönetimi
- ✅ Token süresi kontrolü
- ✅ Hata yönetimi
- ✅ Network durumu kontrolü
- ✅ Request/Response logging

## 🔔 Push Notification Service

### Temel Kullanım

```javascript
import pushNotificationService from '../services/pushNotificationService';

// İzinleri iste
const hasPermission = await pushNotificationService.requestPermissions();

// Token'ı kaydet
await pushNotificationService.registerToken();

// Test bildirimi gönder
await pushNotificationService.sendTestNotification();
```

### Özellikler

- ✅ Expo push notifications
- ✅ FCM token yönetimi
- ✅ Bildirim dinleyicileri
- ✅ Yerel bildirimler
- ✅ Badge yönetimi

## 📷 Camera Service

### Temel Kullanım

```javascript
import cameraService from '../services/cameraService';

// İzinleri iste
const permissions = await cameraService.requestAllPermissions();

// Fotoğraf çek
const result = await cameraService.takePhoto();

// Galeriden seç
const result = await cameraService.pickImage();
```

### Özellikler

- ✅ Kamera ve galeri erişimi
- ✅ Çoklu fotoğraf seçimi
- ✅ Video kaydı
- ✅ Medya kütüphanesi entegrasyonu
- ✅ Dosya boyutu formatlaması

## 🔌 Socket Service

### Temel Kullanım

```javascript
import socketService from '../services/socketService';

// Bağlan
socketService.connect();

// Event dinle
socketService.on('new_message', (data) => {
  console.log('Yeni mesaj:', data);
});

// Event gönder
socketService.emit('send_message', messageData);
```

### Özellikler

- ✅ Gerçek zamanlı iletişim
- ✅ Otomatik yeniden bağlanma
- ✅ Event yönetimi
- ✅ Bağlantı durumu takibi

## 🛠️ Geliştirme Notları

### Hata Yönetimi

Tüm servisler tutarlı hata yönetimi sağlar:

```javascript
try {
  const result = await service.method();
  if (result.success) {
    // Başarılı işlem
  } else {
    // Hata mesajı
    console.error(result.message);
  }
} catch (error) {
  // Beklenmeyen hata
  console.error('Service error:', error);
}
```

### Logging

Servisler detaylı logging sağlar:

```javascript
// API istekleri
console.log('🌐 API Request:', url, data);

// Socket bağlantıları
console.log('🔌 Socket connected:', socketId);

// Push notifications
console.log('📱 Push notification sent:', messageId);
```

### Test Edilebilirlik

Tüm servisler test edilebilir şekilde tasarlanmıştır:

```javascript
// Mock servisler
jest.mock('../services/api');
jest.mock('../services/socketService');

// Test örnekleri
expect(apiService.get).toHaveBeenCalledWith('/users/profile');
expect(socketService.emit).toHaveBeenCalledWith('message', data);
```

## 📋 Best Practices

1. **Error Handling**: Her servis çağrısında hata kontrolü yapın
2. **Loading States**: Kullanıcı arayüzünde loading durumlarını gösterin
3. **Permissions**: İzinleri önceden kontrol edin
4. **Memory Management**: Event listener'ları temizleyin
5. **Security**: Hassas verileri güvenli şekilde saklayın

## 🔄 Güncellemeler

- **v1.0.0**: Temel servisler eklendi
- **v1.1.0**: Push notification servisi eklendi
- **v1.2.0**: Camera servisi eklendi
- **v1.3.0**: Gelişmiş hata yönetimi ve logging
