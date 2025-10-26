# 🛡️ Kız Kullanıcıları Koruma Sistemi

Bu sistem, kız kullanıcıları spam ve istismardan korumak için geliştirilmiş kapsamlı bir güvenlik sistemidir.

## 🎯 Sistem Özellikleri

### 1. **Rate Limiting & Günlük Limitler**
- **Yeni kullanıcılar**: 10 beğeni/gün
- **Doğrulanmış kullanıcılar**: 25 beğeni/gün  
- **Premium kullanıcılar**: 50 beğeni/gün
- **Kız kullanıcılar**: Sınırsız (onlar beğenebilir)

### 2. **Akıllı Filtreleme Sistemi**
- Aynı kullanıcıya tekrar beğeni gönderemez
- 24 saat bekleme süresi
- Karşılıklı beğeni yoksa 48 saat bekleme
- Spam tespit edilirse 7 gün bekleme

### 3. **Kullanıcı Doğrulama Sistemi**
- Email doğrulama (zorunlu)
- Telefon doğrulama (opsiyonel)
- Kimlik doğrulama (premium)
- Sosyal medya bağlantısı (güven artırır)

### 4. **Öncelik Sistemi**
- Doğrulanmış erkekler önce gösterilir
- Premium erkekler önce gösterilir
- Aktif kullanıcılar önce gösterilir
- Spam yapmayan kullanıcılar önce gösterilir

## 📁 Dosya Yapısı

```
backend/
├── controllers/
│   ├── antiSpamController.js          # Anti-spam ana controller
│   ├── verificationController.js      # Kullanıcı doğrulama
│   ├── smartFilteringController.js    # Akıllı filtreleme
│   └── reportingController.js          # Şikayet sistemi
├── routes/
│   ├── antiSpam.js                     # Anti-spam route'ları
│   ├── verification.js                 # Doğrulama route'ları
│   └── reporting.js                    # Şikayet route'ları
└── scripts/
    ├── addVerificationTables.js        # Doğrulama tabloları
    └── addReportingTables.js           # Raporlama tabloları
```

## 🚀 Kurulum

### 1. Veritabanı Tablolarını Ekleyin
```bash
# Doğrulama tabloları
node backend/scripts/addVerificationTables.js

# Raporlama tabloları  
node backend/scripts/addReportingTables.js
```

### 2. Route'ları Aktif Edin
Route'lar `server.js` dosyasında otomatik olarak eklenmiştir:
- `/api/anti-spam` - Anti-spam sistemi
- `/api/verification` - Doğrulama sistemi
- `/api/reporting` - Şikayet sistemi

## 🔧 API Endpoints

### Anti-Spam Sistemi
```javascript
// Spam durumu kontrol et
GET /api/anti-spam/spam-status

// Günlük beğeni limiti
GET /api/anti-spam/daily-limit

// Öncelikli eşleşmeler (kız kullanıcılar için)
GET /api/anti-spam/prioritized-matches
```

### Doğrulama Sistemi
```javascript
// Doğrulama seviyesi
GET /api/verification/level

// Telefon doğrulama kodu gönder
POST /api/verification/send-phone-code
{
  "phoneNumber": "+905551234567"
}

// Telefon doğrulama kodunu kontrol et
POST /api/verification/verify-phone-code
{
  "code": "123456"
}

// Profil tamamlama oranı
POST /api/verification/calculate-completeness

// Beğeni limiti
GET /api/verification/like-limit

// Doğrulama önerileri
GET /api/verification/suggestions
```

### Şikayet Sistemi
```javascript
// Kullanıcı şikayeti oluştur
POST /api/reporting/report-user
{
  "reportedUserId": 123,
  "reportType": "spam",
  "description": "Spam yapıyor",
  "evidence": null
}

// Şikayet listesi (admin)
GET /api/reporting/reports?status=pending

// Şikayet çözümle (admin)
POST /api/reporting/resolve-report/123
{
  "resolution": "Şikayet geçerli",
  "action": "warn"
}
```

## 🎯 Kullanım Senaryoları

### 1. Kız Kullanıcı Girişi
```javascript
// Kız kullanıcı giriş yaptığında
const prioritizedMatches = await antiSpamController.getPrioritizedMatches(userId, 20);
// Doğrulanmış, premium erkekler önce gösterilir
```

### 2. Erkek Kullanıcı Beğeni Yapmaya Çalışır
```javascript
// Beğeni yapmadan önce kontrol
const spamCheck = await antiSpamController.canLikeUser(userId, targetUserId);
if (!spamCheck.allowed) {
  return res.status(429).json({
    message: spamCheck.reason,
    waitTime: spamCheck.waitTime
  });
}
```

### 3. Spam Tespit Edilir
```javascript
// Otomatik spam tespiti
const spamPatterns = await reportingController.detectSpamPatterns(userId);
if (spamPatterns.isSpam) {
  // Kullanıcıyı uyar veya yasakla
}
```

## 📊 Veritabanı Tabloları

### Yeni Tablolar
- `phone_verifications` - Telefon doğrulama kodları
- `verification_history` - Doğrulama geçmişi
- `user_reports` - Kullanıcı şikayetleri
- `user_bans` - Kullanıcı yasakları
- `user_warnings` - Kullanıcı uyarıları

### Güncellenen Tablolar
- `users` tablosuna eklenen alanlar:
  - `phone_verified` - Telefon doğrulaması
  - `phone_number` - Telefon numarası
  - `profile_completeness` - Profil tamamlama oranı
  - `verification_level` - Doğrulama seviyesi

## 🛡️ Güvenlik Önlemleri

### 1. Otomatik Aksiyonlar
- 5+ şikayet → 7 gün yasak
- 10+ şikayet → Kalıcı yasak
- Kritik şikayetler → Hemen yasak

### 2. Spam Tespit Algoritması
- Günlük beğeni sayısı
- Karşılıklı beğeni oranı
- Şikayet sayısı
- Aktivite paterni

### 3. Doğrulama Seviyeleri
- **Seviye 0-2**: 10 beğeni/gün
- **Seviye 3-4**: 25 beğeni/gün
- **Seviye 5-7**: 50 beğeni/gün
- **Seviye 8+**: Sınırsız

## 📈 Performans Optimizasyonu

### 1. Indexler
```sql
CREATE INDEX idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX idx_user_bans_user ON user_bans(user_id);
CREATE INDEX idx_users_verification ON users(verification_level);
```

### 2. Caching
- Doğrulama seviyeleri cache'lenir
- Spam skorları cache'lenir
- Günlük limitler cache'lenir

## 🔍 Monitoring

### 1. Admin Panel
- Şikayet listesi
- Spam tespit raporları
- Kullanıcı yasakları
- Doğrulama istatistikleri

### 2. Loglar
- Tüm şikayetler loglanır
- Spam tespitleri loglanır
- Otomatik aksiyonlar loglanır

## 🚨 Acil Durum Prosedürü

### Spam Saldırısı Tespit Edildiğinde:
1. ✅ Etkilenen kullanıcıları tespit et
2. ✅ Spam yapan hesapları yasakla
3. ✅ Kız kullanıcılara bildirim gönder
4. ✅ Admin panel'de rapor oluştur
5. ✅ Gerekirse sistemi geçici olarak durdur

### Kritik Şikayet Geldiğinde:
1. 🚨 Hemen kullanıcıyı yasakla
2. 🚨 Tüm admin'lere bildirim gönder
3. 🚨 Olayı detaylı logla
4. 🚨 Gerekirse polise bildir

## 📞 Destek

Sistem ile ilgili sorularınız için:
- Backend log'larını kontrol edin
- Admin panel'de raporları görüntüleyin
- `user_reports` tablosunu inceleyin

**Kritik Güvenlik Sorunları:**
Acil durumlarda backend'i durdurun ve database'i yedekleyin!

---

## 🎉 Sonuç

Bu sistem ile:
- ✅ Kız kullanıcılar spam'den korunur
- ✅ Kaliteli eşleşmeler artar
- ✅ Spam yapanlar otomatik tespit edilir
- ✅ Güvenli bir ortam sağlanır
- ✅ Admin kontrolü artar

Sistem sürekli geliştirilmekte ve yeni güvenlik önlemleri eklenmektedir.
