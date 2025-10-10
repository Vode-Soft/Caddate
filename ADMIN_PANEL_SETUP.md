# CaddateApp Admin Panel - Kurulum Kılavuzu 🚀

Bu dokümanda admin panel sistemini nasıl kuracağınızı ve kullanmaya başlayacağınızı bulacaksınız.

## 📋 İçindekiler

1. [Backend Kurulumu](#backend-kurulumu)
2. [Database Ayarları](#database-ayarları)
3. [Admin Kullanıcısı Oluşturma](#admin-kullanıcısı-oluşturma)
4. [Frontend Kurulumu](#frontend-kurulumu)
5. [İlk Giriş](#ilk-giriş)
6. [Özellikler](#özellikler)

## 🔧 Backend Kurulumu

### 1. Yeni Dosyaları Kontrol Edin

Backend'e şu dosyalar eklendi:

```
backend/
├── controllers/
│   ├── adminController.js          # Admin işlemleri
│   └── subscriptionController.js   # Abonelik işlemleri
├── middleware/
│   ├── adminAuth.js                # Admin yetkilendirme
│   └── premiumAuth.js              # Premium kontrol
├── models/
│   └── Subscription.js             # Abonelik modeli
├── routes/
│   ├── admin.js                    # Admin route'ları
│   └── subscriptions.js            # Abonelik route'ları
└── scripts/
    ├── addAdminRole.js             # Admin rolü ekleme
    └── addSubscriptionTables.js    # Abonelik tabloları
```

### 2. Database Tablolarını Oluşturun

Terminal'de backend klasöründe:

```bash
cd backend

# Admin role tablosunu ekle
node scripts/addAdminRole.js

# Abonelik tablolarını ekle
node scripts/addSubscriptionTables.js
```

Bu scriptler şu tabloları oluşturacak:

**Admin Sistemi için:**
- `users` tablosuna `role` ve `admin_level` kolonları
- `users` tablosuna `is_premium`, `premium_until`, `premium_features` kolonları

**Abonelik Sistemi için:**
- `subscription_plans` - Abonelik planları
- `user_subscriptions` - Kullanıcı abonelikleri
- `payment_history` - Ödeme geçmişi
- `feature_usage` - Özellik kullanım takibi

### 3. Server'ı Yeniden Başlatın

Backend güncellendiği için server'ı yeniden başlatın:

```bash
# Eğer çalışıyorsa durdurun (Ctrl+C)
# Sonra tekrar başlatın
node server.js
```

## 💾 Database Ayarları

### Admin Kullanıcısı Oluşturma

#### Yöntem 1: Script ile (Önerilen)

`backend/scripts/addAdminRole.js` dosyasını açın ve email adresinizi değiştirin:

```javascript
// 48. satırda
const adminEmail = 'admin@caddate.com';  // Buraya kendi email'inizi yazın
```

Sonra çalıştırın:

```bash
node scripts/addAdminRole.js
```

#### Yöntem 2: SQL ile

PostgreSQL'e bağlanın ve şu komutu çalıştırın:

```sql
-- Önce kullanıcı oluşturun (eğer yoksa)
INSERT INTO users (email, password, first_name, last_name)
VALUES ('admin@caddate.com', 'hashed_password', 'Admin', 'User');

-- Sonra admin yapın
UPDATE users 
SET role = 'super_admin', admin_level = 100 
WHERE email = 'admin@caddate.com';
```

⚠️ **Önemli:** Mevcut bir kullanıcınız varsa, sadece UPDATE kısmını çalıştırın.

### Admin Rolleri

- **user** (0) - Normal kullanıcı
- **admin** (50) - Admin (çoğu özelliğe erişim)
- **super_admin** (100) - Süper Admin (tüm özelliklere erişim)

## 🌐 Frontend Kurulumu

### 1. Bağımlılıkları Yükleyin

```bash
cd admin-panel
npm install
```

### 2. Environment Dosyasını Kontrol Edin

`admin-panel/.env` dosyasını kontrol edin:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=CaddateApp Admin Panel
```

### 3. Admin Panel'i Başlatın

```bash
npm run dev
```

Admin panel http://localhost:3001 adresinde çalışacaktır.

## 🔐 İlk Giriş

1. **Backend'in çalıştığından emin olun:**
   ```bash
   cd backend
   node server.js
   ```

2. **Admin panel'i açın:**
   - Tarayıcınızda http://localhost:3001/login adresine gidin

3. **Giriş yapın:**
   - Email: Admin yaptığınız kullanıcının email'i
   - Şifre: O kullanıcının şifresi

4. **Dashboard'a yönlendirileceksiniz** 🎉

## ✨ Özellikler

### 1. Dashboard
- **İstatistikler:**
  - Toplam/Aktif/Premium kullanıcılar
  - Gelir raporları (30 gün)
  - Fotoğraf/Mesaj sayıları
  - Araç istatistikleri
  - Güvenlik özeti
- **Grafikler:**
  - 30 günlük kullanıcı artış grafiği
  - Abonelik durumu
  - İçerik özeti

### 2. Kullanıcı Yönetimi
- Kullanıcı listeleme ve arama
- Filtreleme (Aktif, Premium, Banlı)
- Kullanıcı detayları görüntüleme
- Ban/Aktif etme
- Kullanıcı düzenleme
- Abonelik bilgileri
- Araç bilgileri
- Fotoğraflar
- Güvenlik geçmişi

### 3. Abonelik Yönetimi
- Abonelik listesi
- Gelir istatistikleri
- Aktif/İptal/Süresi Dolmuş filtreleme
- Abonelik detayları
- Ödeme bilgileri

### 4. Araç Yönetimi
- Araç listeleme
- Onaylama/Reddetme
- Araç silme
- Filtreleme (Tümü, Onaylı, Bekleyen)

### 5. Fotoğraf Moderasyonu
- Fotoğraf galerisi görünümü
- Fotoğraf silme
- Beğeni ve yorum sayıları
- Kullanıcı bilgileri

### 6. Mesaj İzleme
- Tüm mesajları görüntüleme
- Gönderen/Alıcı bilgileri
- Mesaj durumu (Okundu/Okunmadı)

### 7. Güvenlik
- Güvenlik olayları
- Başarısız giriş denemeleri
- Şüpheli aktiviteler
- IP adresi takibi
- Aktivite geçmişi

## 🔒 API Endpoints

### Public (Kimlik Doğrulama Gerektirmeyen)
```
GET  /api/subscriptions/plans - Abonelik planlarını listele
```

### Authenticated (Giriş Yapılmış Kullanıcılar)
```
GET  /api/subscriptions/my-subscription - Aktif aboneliğim
GET  /api/subscriptions/history - Abonelik geçmişim
POST /api/subscriptions/create - Yeni abonelik
POST /api/subscriptions/cancel/:id - Abonelik iptali
GET  /api/subscriptions/payment-history - Ödeme geçmişi
GET  /api/subscriptions/premium-status - Premium durum kontrolü
```

### Admin Only (Sadece Admin)
```
GET  /api/admin/dashboard/stats - Dashboard istatistikleri
GET  /api/admin/users - Kullanıcı listesi
GET  /api/admin/users/:id - Kullanıcı detayları
PUT  /api/admin/users/:id - Kullanıcı güncelleme
POST /api/admin/users/:id/toggle-ban - Ban/Aktif etme
GET  /api/admin/vehicles - Araç listesi
POST /api/admin/vehicles/:id/verify - Araç onaylama
DELETE /api/admin/vehicles/:id - Araç silme
GET  /api/admin/photos - Fotoğraf listesi
DELETE /api/admin/photos/:id - Fotoğraf silme
GET  /api/admin/messages - Mesaj listesi
GET  /api/admin/security/events - Güvenlik olayları
GET  /api/subscriptions/admin/all - Tüm abonelikler
GET  /api/subscriptions/admin/stats - Abonelik istatistikleri
```

### Super Admin Only (Sadece Süper Admin)
```
DELETE /api/admin/users/:id - Kullanıcı silme
```

## 🎯 Örnek Abonelik Planları

Script çalıştırıldığında otomatik olarak şu planlar oluşturulur:

1. **Temel Premium** - ₺49.90/ay
   - Sınırsız mesaj
   - Profil boost
   - Reklamsız
   - Aylık 1 boost

2. **Altın Premium** - ₺99.90/ay (Popüler)
   - Tüm Temel özellikler
   - Beğenileri görme
   - Geri alma
   - Aylık 3 boost
   - Günlük 5 super like

3. **Platin Premium** - ₺149.90/ay
   - Tüm Altın özellikler
   - Passport (konum değiştirme)
   - Aylık 10 boost
   - Günlük 10 super like
   - Öncelikli mesajlaşma

4. **3 Aylık Altın** - ₺249.90 (İndirimli)

5. **6 Aylık Platin** - ₺699.90 (En Avantajlı)

## 🛠️ Premium Özellik Middleware Kullanımı

Backend route'larınızda premium kontrol eklemek için:

```javascript
const { requirePremium, requirePremiumFeature } = require('../middleware/premiumAuth');

// Genel premium kontrolü
router.get('/premium-content', authenticateToken, requirePremium, async (req, res) => {
  // Sadece premium kullanıcılar erişebilir
});

// Belirli bir özellik kontrolü
router.post('/send-super-like', 
  authenticateToken, 
  requirePremiumFeature('super_like_per_day'), 
  async (req, res) => {
    // Sadece bu özelliğe sahip premium kullanıcılar erişebilir
});
```

## 🐛 Sorun Giderme

### Backend'e bağlanamıyorum
1. Backend'in çalıştığından emin olun (`node server.js`)
2. Port'un açık olduğunu kontrol edin (3000)
3. CORS ayarlarını kontrol edin
4. `.env` dosyasındaki `VITE_API_URL` değerini kontrol edin

### Admin girişi yapamıyorum
1. Kullanıcınızın `admin` veya `super_admin` rolü olduğundan emin olun:
   ```sql
   SELECT id, email, role, admin_level FROM users WHERE email = 'youremail@example.com';
   ```
2. Eğer role NULL ise, script'i tekrar çalıştırın:
   ```bash
   node backend/scripts/addAdminRole.js
   ```

### İstatistikler yüklenmiyor
1. Backend console'da hata mesajları var mı kontrol edin
2. Browser console'da (F12) network sekmesinde API çağrılarını inceleyin
3. Database bağlantısının çalıştığından emin olun

### Tablolar oluşturulmadı
1. PostgreSQL'in çalıştığından emin olun
2. Database'e bağlantı bilgilerini kontrol edin
3. Script'leri tekrar çalıştırın:
   ```bash
   node backend/scripts/addAdminRole.js
   node backend/scripts/addSubscriptionTables.js
   ```

## 📱 Kullanım İpuçları

1. **Dashboard'u sık kontrol edin** - Gerçek zamanlı istatistikler için
2. **Düzenli güvenlik kontrolü** - Şüpheli aktiviteleri takip edin
3. **Araç onaylarını hızlı yapın** - Kullanıcı deneyimi için önemli
4. **Ban işlemlerinde sebep yazın** - Kayıt için önemli

## 🎨 Tema Özelleştirme

Admin panelin temasını değiştirmek için `admin-panel/src/App.jsx` dosyasındaki theme objesini düzenleyin:

```javascript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Ana renk
    },
    secondary: {
      main: '#dc004e', // İkincil renk
    },
  },
});
```

## 📊 Production Build

Production için build almak:

```bash
cd admin-panel
npm run build
```

Build dosyaları `admin-panel/dist/` klasöründe oluşturulur.

Bu dosyaları bir web server'da (nginx, Apache, vb.) host edebilirsiniz.

## ✅ Kurulum Checklist

- [ ] Backend script'leri çalıştırıldı
- [ ] Database tabloları oluşturuldu
- [ ] En az bir admin kullanıcısı var
- [ ] Backend çalışıyor (port 3000)
- [ ] Admin panel npm install tamamlandı
- [ ] Admin panel çalışıyor (port 3001)
- [ ] Admin girişi yapabiliyorum
- [ ] Dashboard yükleniyor
- [ ] İstatistikler görünüyor

## 🎉 Tamamdır!

Artık tam fonksiyonel bir admin paneliniz var! Herhangi bir sorun yaşarsanız yukarıdaki "Sorun Giderme" bölümüne bakın.

Happy coding! 🚀

