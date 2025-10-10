# 🗺️ Harita Entegrasyonu Kurulum Rehberi

## 📋 Genel Bakış

Bu proje, platform-specific harita entegrasyonu kullanır:
- **iOS**: Apple Maps (MapKit JS)
- **Android**: Google Maps (WebView)

## 🔧 Kurulum Adımları

### 1. Google Maps API Anahtarı (Android için)

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. "APIs & Services" > "Credentials" bölümüne gidin
4. "Create Credentials" > "API Key" seçin
5. API anahtarınızı kopyalayın

### 2. API Anahtarını Yapılandırma

`src/components/WebMapView.js` dosyasında aşağıdaki satırı bulun:

```javascript
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Bu anahtarı değiştirin
```

Kendi API anahtarınızla değiştirin:

```javascript
const GOOGLE_MAPS_API_KEY = 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
```

### 3. Gerekli API'leri Etkinleştirme

Google Cloud Console'da aşağıdaki API'leri etkinleştirin:
- Maps JavaScript API
- Places API (opsiyonel)
- Geocoding API (opsiyonel)

### 4. Güvenlik Ayarları

API anahtarınızı güvenli hale getirmek için:

1. **HTTP referrers (web sitesi)** kısıtlaması ekleyin
2. **Android uygulamaları** kısıtlaması ekleyin (SHA-1 fingerprint ile)
3. **iOS uygulamaları** kısıtlaması ekleyin (Bundle ID ile)

## 🚀 Kullanım

### Temel Kullanım

```javascript
import PlatformMapView from '../components/PlatformMapView';

<PlatformMapView
  ref={mapRef}
  style={{ flex: 1 }}
  region={region}
  markers={markers}
  onRegionChange={handleRegionChange}
  onMapReady={handleMapReady}
  mapType="standard"
  showsUserLocation={true}
  showsCompass={true}
  showsScale={true}
/>
```

### Marker Ekleme

```javascript
const markers = [
  {
    id: 'user',
    coordinate: {
      latitude: 40.9884,
      longitude: 29.0255,
    },
    title: 'Sizin Konumunuz',
    description: 'Doğruluk: 5m'
  },
  {
    id: 'friend1',
    coordinate: {
      latitude: 40.9894,
      longitude: 29.0265,
    },
    title: 'Ahmet Yılmaz',
    description: '150m uzaklıkta'
  }
];
```

### Harita Türü Değiştirme

```javascript
const [mapType, setMapType] = useState('standard');

// Kullanılabilir türler:
// - 'standard' (varsayılan)
// - 'satellite' (uydu)
// - 'hybrid' (hibrit)
```

## 🔧 Gelişmiş Yapılandırma

### Android WebView Ayarları

`src/components/WebMapView.js` dosyasında WebView özelliklerini özelleştirebilirsiniz:

```javascript
<WebView
  source={{ html: generateMapHTML() }}
  style={{ flex: 1 }}
  onMessage={handleWebViewMessage}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  startInLoadingState={true}
  scalesPageToFit={false}
  scrollEnabled={false}
  bounces={false}
  showsHorizontalScrollIndicator={false}
  showsVerticalScrollIndicator={false}
/>
```

### iOS Apple Maps Ayarları

`src/components/AppleMapView.js` dosyasında MapKit ayarlarını özelleştirebilirsiniz:

```javascript
const mapOptions = {
  center: new mapkit.Coordinate(lat, lng),
  region: new mapkit.CoordinateRegion(center, span),
  mapType: 'standard', // 'standard', 'satellite', 'hybrid'
  showsUserLocation: true,
  showsBuildings: true,
  showsTraffic: false,
  showsPointsOfInterest: true,
  showsCompass: true,
  showsScale: true
};
```

## 🐛 Sorun Giderme

### Yaygın Sorunlar

1. **"Google Maps API key not found" hatası**
   - API anahtarınızı kontrol edin
   - API'lerin etkin olduğundan emin olun

2. **"Apple Maps not loading" hatası**
   - İnternet bağlantınızı kontrol edin
   - MapKit JS yüklenme durumunu kontrol edin

3. **Marker'lar görünmüyor**
   - Marker koordinatlarını kontrol edin
   - Harita bölgesini kontrol edin

### Debug Modu

Geliştirme sırasında console log'larını aktifleştirin:

```javascript
// WebView'da console log'ları görmek için
const handleWebViewMessage = (event) => {
  console.log('WebView Message:', event.nativeEvent.data);
  // ... diğer kodlar
};
```

## 📱 Platform Farkları

### iOS (Apple Maps)
- ✅ Yerel Apple Maps entegrasyonu
- ✅ Daha iyi performans
- ✅ iOS native görünüm
- ❌ Sadece iOS'ta çalışır

### Android (Google Maps WebView)
- ✅ Google Maps'in tüm özellikleri
- ✅ Cross-platform uyumluluk
- ✅ Zengin API desteği
- ❌ WebView tabanlı (native değil)

## 🔒 Güvenlik

1. **API Anahtarı Güvenliği**
   - API anahtarınızı public repository'de paylaşmayın
   - Environment variables kullanın
   - Kısıtlamalar ekleyin

2. **Rate Limiting**
   - API kullanım limitlerini kontrol edin
   - Gereksiz istekleri önleyin

## 📚 Ek Kaynaklar

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Apple MapKit JS](https://developer.apple.com/documentation/mapkitjs)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.