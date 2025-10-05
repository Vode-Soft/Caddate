# CaddateApp Production Deployment Guide

## Socket.io ve Gerçek Zamanlı Özellikler

Bu uygulama socket.io kullanarak gerçek zamanlı özellikler sunar:

### ✅ Mevcut Socket.io Özellikleri

1. **Gerçek Zamanlı Konum Paylaşımı**
   - Kullanıcılar konumlarını gerçek zamanlı olarak paylaşabilir
   - Diğer kullanıcılar yakındaki kişileri görebilir
   - Konum güncellemeleri anlık olarak yayınlanır

2. **Online Kullanıcı Takibi**
   - Hangi kullanıcıların online olduğu takip edilir
   - Kullanıcılar birbirlerini görebilir
   - Bağlantı/bağlantı kesilme durumları anlık bildirilir

3. **Gerçek Zamanlı Mesajlaşma**
   - Genel sohbet odası
   - Özel mesajlaşma
   - Mesajlar anlık olarak iletiliyor

4. **Aktivite Bildirimleri**
   - Kullanıcı aktiviteleri gerçek zamanlı paylaşılır
   - Fotoğraf paylaşımları
   - Beğeni güncellemeleri

## Production Deployment Adımları

### 1. Backend Deployment

```bash
# Backend dizinine git
cd backend

# Production environment değişkenlerini ayarla
export NODE_ENV=production
export PRODUCTION_FRONTEND_URL=https://your-domain.com
export PRODUCTION_API_URL=https://your-api-domain.com

# Dependencies yükle
npm install --production

# Sunucuyu başlat
npm start
```

### 2. Frontend Build

```bash
# Ana dizinde
npm install

# Production build
npx expo build:android
# veya
npx expo build:ios
```

### 3. Environment Variables

Production için gerekli environment değişkenleri:

#### Backend (.env)
```
NODE_ENV=production
PRODUCTION_FRONTEND_URL=https://your-domain.com
PRODUCTION_API_URL=https://your-api-domain.com
DB_HOST=your-production-db-host
DB_PASSWORD=your-production-db-password
JWT_SECRET=your-super-secure-jwt-secret
```

#### Frontend (app.config.js)
```javascript
extra: {
  apiUrl: "https://your-api-domain.com",
  socketUrl: "wss://your-api-domain.com",
  googleMapsApiKey: "your-production-google-maps-key"
}
```

### 4. Socket.io Production Optimizasyonları

Backend'de yapılan optimizasyonlar:

- **CORS**: Production ve development için ayrı origin listesi
- **Timeout**: Production'da daha uzun timeout değerleri
- **Transport**: Production'da sadece WebSocket kullanımı
- **Buffer Size**: Production'da daha büyük buffer boyutu

### 5. SSL/HTTPS Gereksinimleri

Socket.io production'da SSL gerektirir:

- Backend: HTTPS endpoint
- Frontend: WSS (WebSocket Secure) bağlantısı
- SSL sertifikası gerekli

### 6. Test Edilmesi Gerekenler

1. **Konum Paylaşımı**
   - Kullanıcılar konumlarını paylaşabiliyor mu?
   - Yakındaki kullanıcılar görünüyor mu?
   - Konum güncellemeleri gerçek zamanlı mı?

2. **Online Durumu**
   - Kullanıcılar online/offline durumunu görebiliyor mu?
   - Bağlantı kesilme durumları doğru işleniyor mu?

3. **Mesajlaşma**
   - Genel sohbet çalışıyor mu?
   - Özel mesajlar iletiliyor mu?

4. **Socket Bağlantısı**
   - Bağlantı kuruluyor mu?
   - Yeniden bağlanma çalışıyor mu?
   - Hata durumları yönetiliyor mu?

## Güvenlik Notları

1. **JWT Secret**: Production'da güçlü bir JWT secret kullanın
2. **CORS**: Sadece gerekli origin'lere izin verin
3. **Rate Limiting**: Socket.io için rate limiting ekleyin
4. **SSL**: Tüm bağlantılar SSL ile korunmalı

## Monitoring

Production'da socket.io bağlantılarını izlemek için:

1. **Connection Count**: Aktif bağlantı sayısı
2. **Error Rate**: Bağlantı hata oranı
3. **Message Throughput**: Mesaj iletim hızı
4. **Reconnection Rate**: Yeniden bağlanma oranı

## Troubleshooting

### Socket Bağlantı Sorunları
- SSL sertifikası kontrolü
- CORS ayarları kontrolü
- Firewall ayarları kontrolü

### Konum Sorunları
- Google Maps API key kontrolü
- Konum izinleri kontrolü
- GPS doğruluğu kontrolü

### Performance Sorunları
- Socket.io ping/pong ayarları
- Buffer boyutu ayarları
- Connection pooling
