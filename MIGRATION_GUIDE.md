# 🚀 CaddateApp Migration Guide

Bu rehber, yeni özelliklerin veritabanına nasıl ekleneceğini açıklar.

## 📋 Ön Gereksinimler

- PostgreSQL 12+ 
- Node.js 16+
- npm veya yarn

## 🔧 Kurulum

### 1. Dependencies Yükle

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ..
npm install
```

### 2. Environment Variables Ayarla

```bash
# Backend için
cp backend/config.env.example backend/config.env
# config.env dosyasını düzenleyin

# Frontend için
cp .env.example .env
# .env dosyasını düzenleyin
```

### 3. Veritabanı Migration'ları Çalıştır

```bash
# Tüm migration'ları çalıştır
cd backend
node scripts/runAllMigrations.js

# Veya tek tek çalıştır
node scripts/addConfessionsTables.js
node scripts/addFriendSuggestionsTables.js
node scripts/addPushNotificationTables.js
node scripts/addAnalyticsTables.js
```

## 📊 Yeni Tablolar

### Confessions Sistemi
- `confessions` - İtiraf içerikleri
- `confession_likes` - İtiraf beğenileri

### Friend Suggestions Sistemi
- `user_likes` - Kullanıcı beğenileri
- `user_passes` - Geçilen kullanıcılar
- `user_blocks` - Engellenen kullanıcılar

### Push Notifications Sistemi
- `push_tokens` - FCM token'ları
- `push_notification_history` - Bildirim geçmişi
- `notification_settings` - Bildirim ayarları

### Analytics Sistemi
- `user_activities` - Kullanıcı aktiviteleri
- `app_metrics` - Uygulama metrikleri
- `daily_stats` - Günlük istatistikler

## 🧪 Test Çalıştırma

```bash
# Backend testleri
cd backend
npm test

# Frontend testleri
cd ..
npm test

# Coverage raporu
npm run test:coverage
```

## 🔍 Kontrol Listesi

- [ ] Dependencies yüklendi
- [ ] Environment variables ayarlandı
- [ ] Migration'lar çalıştırıldı
- [ ] Testler geçti
- [ ] API endpoint'leri çalışıyor
- [ ] Frontend servisleri çalışıyor

## 🚨 Sorun Giderme

### Migration Hataları
```bash
# Veritabanı bağlantısını kontrol et
node scripts/test_db.js

# Tabloları manuel oluştur
psql -U postgres -d caddate_db -f backend/scripts/MIGRATION_ALL_TABLES.sql
```

### Test Hataları
```bash
# Test veritabanını temizle
npm run test:clean

# Test veritabanını yeniden oluştur
npm run test:setup
```

### API Hataları
```bash
# Server'ı yeniden başlat
npm run dev

# Log'ları kontrol et
tail -f logs/app.log
```

## 📞 Destek

Sorunlar için:
- 📧 Email: support@caddate.com
- 📱 Discord: CaddateApp#1234
- 📖 Documentation: https://docs.caddate.com
