# Google Maps API Key Kurulumu

## 🔑 Android Harita Sorunu Çözümü

Android'de harita görünmemesinin ana nedeni **Google Maps API key** eksikliğidir.

## 📋 Adım Adım Kurulum

### 1. Google Cloud Console'a Giriş
1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Google hesabınızla giriş yapın
3. Yeni proje oluşturun: "CaddateApp"

### 2. Billing Hesabı Aktifleştirin
- Google Maps API ücretsiz değil, billing hesabı gerekli
- Kredi kartı bilgileri gerekli (ilk $200 ücretsiz)

### 3. API'leri Etkinleştirin
Sol menüden "APIs & Services" > "Library":
- **Maps SDK for Android** ✅
- **Maps SDK for iOS** ✅ (opsiyonel)
- **Places API** ✅ (opsiyonel)

### 4. API Key Oluşturun
1. "APIs & Services" > "Credentials"
2. "Create Credentials" > "API Key"
3. API key'inizi kopyalayın

### 5. API Key'i Uygulamaya Ekleyin
`app.json` dosyasında:
```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "BURAYA_GERÇEK_API_KEY_YAZIN"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "BURAYA_GERÇEK_API_KEY_YAZIN"
        }
      }
    }
  }
}
```

### 6. Güvenlik Ayarları (Önerilen)
API key'inizi kısıtlayın:
- **Application restrictions**: Android apps
- **Package name**: com.yourcompany.caddateapp
- **SHA-1 certificate fingerprint**: Expo development build için

## 🚀 Test Etme

```bash
# Uygulamayı yeniden başlatın
npx expo start --clear

# Android'de test edin
npx expo run:android
```

## 💰 Maliyet Bilgisi

- **İlk $200**: Ücretsiz (aylık)
- **Maps SDK for Android**: $7 per 1000 requests
- **Maps SDK for iOS**: $7 per 1000 requests
- **Places API**: $17 per 1000 requests

## 🔧 Alternatif Çözümler

### 1. Geçici Test için
Şu anda test API key kullanılıyor. Gerçek key olmadan harita görünmeyebilir.

### 2. Development Build
```bash
npx expo install expo-dev-client
npx expo run:android
```

### 3. Web Haritası
Web sürümünde Google Maps çalışır (farklı API key gerekli).

## 📞 Sorun Giderme

### Hata: "Google Maps API key not found"
- `app.json` dosyasında API key'i kontrol edin
- Uygulamayı yeniden başlatın

### Hata: "This API project is not authorized"
- API'lerin etkinleştirildiğinden emin olun
- Billing hesabının aktif olduğunu kontrol edin

### Harita yüklenmiyor
- İnternet bağlantısını kontrol edin
- API key'in doğru olduğundan emin olun
- Console loglarını kontrol edin

## ✅ Başarı Kontrolü

Android'de harita görünüyorsa:
- ✅ Google Maps API key çalışıyor
- ✅ Konum servisleri aktif
- ✅ Yakındaki kullanıcılar görünüyor
- ✅ Konum paylaşımı çalışıyor

---

**Not**: Bu adımları tamamladıktan sonra Android'de harita tam olarak çalışacaktır.
