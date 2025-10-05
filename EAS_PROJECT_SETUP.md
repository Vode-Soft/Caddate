# EAS Project Setup - Push Notifications

Bu uygulama push notification'lar için Expo Application Services (EAS) projectId gerektirir.

## ProjectId Nasıl Alınır

### 1. EAS CLI ile Proje Oluşturma

```bash
# EAS CLI'yi global olarak kurun (eğer kurulu değilse)
npm install -g eas-cli

# EAS'e giriş yapın
eas login

# Proje oluşturun
eas project:create
```

### 2. ProjectId'yi App Config'e Ekleme

EAS projesi oluşturulduktan sonra, `app.config.js` dosyasındaki projectId'yi güncelleyin:

```javascript
extra: {
  eas: {
    projectId: "your-actual-project-id-here" // Buraya gerçek projectId'yi yazın
  }
}
```

### 3. Alternatif: Development'ta Push Notification'ları Devre Dışı Bırakma

Development ortamında push notification'ları kullanmak istemiyorsanız, notification service zaten hata durumunda uygulamanın çökmesini engelleyecek şekilde yapılandırılmıştır.

## Production Build

Production build için mutlaka geçerli bir EAS projectId gereklidir:

```bash
# Production build
eas build --platform all
```

## Troubleshooting

- **"No projectId found" hatası**: `app.config.js`'te projectId'nin doğru ayarlandığından emin olun
- **Development'ta hata**: Bu normal, development'ta push notification'lar çalışmayacak
- **Production'da çalışmıyor**: EAS projectId'nin doğru ve geçerli olduğundan emin olun
