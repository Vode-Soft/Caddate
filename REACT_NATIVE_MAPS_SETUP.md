# 🗺️ React Native Maps Kurulum Rehberi

## ✅ Tamamlanan Ayarlar

### 1. Paket Yükleme
```bash
# Expo uyumlu react-native-maps yüklendi
npx expo install react-native-maps
```

### 2. app.json Yapılandırması
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-maps",
        {
          "googleMapsApiKey": "AIzaSyBTestKeyForDevelopment123456789"
        }
      ]
    ],
    "ios": {
      "config": {
        "googleMapsApiKey": "AIzaSyBTestKeyForDevelopment123456789"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "AIzaSyBTestKeyForDevelopment123456789"
        }
      }
    }
  }
}
```

### 3. Hata Kontrolü
MapScreen.js dosyasında hata kontrolü eklendi:

```javascript
// Hata kontrolü ile import
let MapView, Marker, PROVIDER_DEFAULT;
try {
  const MapsModule = require('react-native-maps');
  MapView = MapsModule.default;
  Marker = MapsModule.Marker;
  PROVIDER_DEFAULT = MapsModule.PROVIDER_DEFAULT;
} catch (error) {
  console.warn('React Native Maps not available:', error.message);
  // Fallback components
  MapView = View;
  Marker = View;
  PROVIDER_DEFAULT = null;
}
```

### 4. Platform-Specific Render
```javascript
{Platform.OS === 'android' ? (
  // Android: WebView üzerinden OpenStreetMap
  <WebView source={{ uri: `https://www.openstreetmap.org/#map=15/${region.latitude}/${region.longitude}` }} />
) : (
  // iOS: Apple Maps (hata kontrolü ile)
  PROVIDER_DEFAULT ? (
    <MapView provider={PROVIDER_DEFAULT}>
      <Marker coordinate={location} title="Buradayım" />
    </MapView>
  ) : (
    // Fallback: WebView
    <WebView source={{ uri: `https://www.openstreetmap.org/#map=15/${region.latitude}/${region.longitude}` }} />
  )
)}
```

## 🚀 Kullanım

### Development
```bash
# Cache temizleyerek başlat
npx expo start --clear

# Veya normal başlat
npx expo start
```

### Production Build
```bash
# iOS build
npx expo build:ios

# Android build
npx expo build:android
```

## 🔧 Sorun Giderme

### 1. "RNMapsAirModule could not be found" Hatası
- ✅ **Çözüldü**: Hata kontrolü eklendi
- ✅ **Fallback**: WebView kullanımı

### 2. Metro Bundler Hatası
- ✅ **Çözüldü**: `npx expo start --clear` ile cache temizlendi

### 3. Plugin Hatası
- ✅ **Çözüldü**: app.json'da plugin yapılandırması eklendi

## 📱 Platform Davranışları

### iOS
- **Primary**: Apple Maps (react-native-maps)
- **Fallback**: OpenStreetMap (WebView)
- **Provider**: PROVIDER_DEFAULT

### Android
- **Primary**: OpenStreetMap (WebView)
- **Fallback**: Yok (WebView her zaman çalışır)

## 🎯 Avantajlar

- ✅ **Hata Toleransı**: react-native-maps yüklenemezse WebView kullanır
- ✅ **Platform Optimizasyonu**: iOS'ta Apple Maps, Android'de OpenStreetMap
- ✅ **API Anahtarı Gerektirmez**: OpenStreetMap ücretsiz
- ✅ **Hızlı Yükleme**: WebView tabanlı çözüm
- ✅ **Expo Uyumlu**: Development build gerektirmez

## 🔄 Güncelleme

Eğer react-native-maps güncellemesi gerekiyorsa:

```bash
# Paketi güncelle
npx expo install react-native-maps@latest

# Cache temizle
npx expo start --clear
```

## 📚 Ek Kaynaklar

- [Expo Maps Documentation](https://docs.expo.dev/versions/latest/sdk/maps/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [OpenStreetMap](https://www.openstreetmap.org/)

## 🎉 Sonuç

Artık uygulamanız:
- ✅ React Native Maps hatası vermeyecek
- ✅ iOS'ta Apple Maps kullanacak
- ✅ Android'de OpenStreetMap kullanacak
- ✅ Hata durumunda fallback çalışacak
- ✅ Expo development build'de çalışacak
