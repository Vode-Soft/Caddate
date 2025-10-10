# 🚀 Production Build Rehberi - React Native Maps

## 📋 Gereksinimler

### 1. Google Maps API Key
```bash
# Google Cloud Console'dan API key alın
# https://console.cloud.google.com/
```

### 2. Gerekli API'ler
- Maps JavaScript API
- Maps SDK for Android
- Maps SDK for iOS
- Places API (opsiyonel)

## 🔧 Kurulum Adımları

### 1. Google Maps API Key Alın
1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. "APIs & Services" > "Credentials" bölümüne gidin
4. "Create Credentials" > "API Key" seçin
5. API anahtarınızı kopyalayın

### 2. API Key'i Yapılandırın
`app.json` dosyasında API key'i güncelleyin:

```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_ACTUAL_GOOGLE_MAPS_API_KEY"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ACTUAL_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

### 3. Production Build Oluşturun

#### iOS Build:
```bash
# iOS için prebuild
npx expo prebuild --platform ios --clean

# iOS build
npx expo run:ios
```

#### Android Build:
```bash
# Android için prebuild
npx expo prebuild --platform android --clean

# Android build
npx expo run:android
```

## 🎯 Platform-Specific Ayarlar

### iOS (Apple Maps)
```javascript
// MapScreen.js'de
<MapView
  provider={PROVIDER_DEFAULT} // Apple Maps
  // ... diğer props
>
```

### Android (Google Maps)
```javascript
// MapScreen.js'de
<MapView
  provider={PROVIDER_GOOGLE} // Google Maps
  // ... diğer props
>
```

## 🔒 Güvenlik Ayarları

### API Key Kısıtlamaları
1. **HTTP referrers (web sitesi)** kısıtlaması
2. **Android uygulamaları** kısıtlaması (SHA-1 fingerprint)
3. **iOS uygulamaları** kısıtlaması (Bundle ID)

### SHA-1 Fingerprint (Android)
```bash
# Debug keystore için
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release keystore için
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

## 📱 Test Etme

### Development Build
```bash
# Development build oluştur
npx expo install --fix
npx expo prebuild
npx expo run:ios
npx expo run:android
```

### Production Build
```bash
# EAS Build ile
npx eas build --platform ios
npx eas build --platform android
```

## 🐛 Sorun Giderme

### 1. "Google Maps API key not found" Hatası
- API key'in doğru yapılandırıldığından emin olun
- API'lerin etkin olduğunu kontrol edin
- Billing hesabının aktif olduğunu kontrol edin

### 2. "RNMapsAirModule could not be found" Hatası
- `npx expo prebuild --clean` çalıştırın
- Native modüllerin doğru yüklendiğini kontrol edin

### 3. Build Hatası
- `node_modules` ve `ios/android` klasörlerini silin
- `npx expo prebuild --clean` çalıştırın
- Yeniden build yapın

## 💰 Maliyet

### Google Maps Pricing
- **Maps JavaScript API**: $7/1000 requests
- **Maps SDK for Android**: $7/1000 requests
- **Maps SDK for iOS**: $7/1000 requests
- **Places API**: $17/1000 requests

### Ücretsiz Limit
- Aylık $200 kredi (yaklaşık 28,000 request)

## 🎉 Sonuç

Production build ile:
- ✅ **iOS**: Native Apple Maps
- ✅ **Android**: Native Google Maps
- ✅ **Marker desteği**
- ✅ **Kullanıcı konumu**
- ✅ **Harita türü değiştirme**
- ✅ **Gerçek zamanlı güncellemeler**

## 📚 Ek Kaynaklar

- [Expo Maps Documentation](https://docs.expo.dev/versions/latest/sdk/maps/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Google Maps Platform](https://developers.google.com/maps)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## 🚀 Hızlı Başlangıç

```bash
# 1. API key'i app.json'a ekleyin
# 2. Prebuild yapın
npx expo prebuild --clean

# 3. Build yapın
npx expo run:ios
npx expo run:android

# 4. Test edin!
```

Artık production-ready harita uygulamanız hazır! 🗺️✨
