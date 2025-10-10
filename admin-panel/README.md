# CaddateApp Admin Panel 🚗

Modern, responsive ve kullanıcı dostu web tabanlı admin paneli.

## 🌟 Özellikler

### 📊 Dashboard
- Gerçek zamanlı istatistikler
- Kullanıcı artış grafikleri
- Gelir raporları
- Güvenlik özeti
- İçerik özeti

### 👥 Kullanıcı Yönetimi
- Kullanıcı listeleme ve arama
- Kullanıcı detayları
- Ban/Aktif etme
- Filtreleme (Aktif, Premium, Banlı)
- Kullanıcı düzenleme

### 💎 Abonelik Yönetimi
- Abonelik listesi
- Gelir istatistikleri
- Plan yönetimi
- Durum takibi
- Ödeme geçmişi

### 🚗 Araç Yönetimi
- Araç listeleme
- Onaylama/Reddetme
- Araç silme
- Filtreleme (Tümü, Onaylı, Bekleyen)

### 📸 Fotoğraf Moderasyonu
- Fotoğraf galerisi
- Fotoğraf silme
- Beğeni ve yorum sayıları
- Kullanıcı bilgileri

### 💬 Mesaj İzleme
- Mesaj geçmişi
- Gönderen/Alıcı bilgileri
- Mesaj durumu (Okundu/Okunmadı)

### 🔒 Güvenlik
- Güvenlik olayları
- Başarısız giriş denemeleri
- Şüpheli aktiviteler
- IP adresi takibi

## 🚀 Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
cd admin-panel
npm install
```

### 2. Backend'i Hazırlayın

Backend'de admin sistemi için gerekli tabloları oluşturun:

```bash
cd backend
node scripts/addAdminRole.js
node scripts/addSubscriptionTables.js
```

### 3. Admin Kullanıcısı Oluşturun

`backend/scripts/addAdminRole.js` dosyasında `adminEmail` değişkenini kendi email adresinize değiştirin veya doğrudan veritabanından bir kullanıcıya admin rolü verin:

```sql
UPDATE users 
SET role = 'super_admin', admin_level = 100 
WHERE email = 'admin@caddate.com';
```

### 4. Environment Ayarları

`.env` dosyasını kontrol edin:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=CaddateApp Admin Panel
```

### 5. Uygulamayı Başlatın

```bash
npm run dev
```

Admin panel http://localhost:3001 adresinde çalışacaktır.

## 📱 Kullanım

### Giriş Yapma

1. http://localhost:3001/login adresine gidin
2. Admin email ve şifrenizi girin
3. Dashboard'a yönlendirileceksiniz

⚠️ **Önemli:** Sadece `admin` veya `super_admin` rolüne sahip kullanıcılar giriş yapabilir.

### Sayfa Navigasyonu

Sol menüden istediğiniz sayfaya geçebilirsiniz:
- **Dashboard** - Genel bakış ve istatistikler
- **Kullanıcılar** - Kullanıcı yönetimi
- **Abonelikler** - Premium abonelik yönetimi
- **Araçlar** - Araç onaylama ve yönetimi
- **Fotoğraflar** - İçerik moderasyonu
- **Mesajlar** - Mesaj izleme
- **Güvenlik** - Güvenlik olayları

## 🛠️ Teknolojiler

- **React 18** - UI framework
- **Material-UI (MUI)** - Komponent kütüphanesi
- **React Router** - Routing
- **Axios** - HTTP client
- **Recharts** - Grafik kütüphanesi
- **date-fns** - Tarih formatlama
- **React Toastify** - Bildirimler
- **Vite** - Build tool

## 🎨 Tema

Admin panel modern, profesyonel bir tema kullanır:
- Ana renk: Mavi (#1976d2)
- İkincil renk: Pembe (#dc004e)
- Arka plan: Açık gri (#f5f5f5)

## 📦 Build

Production build için:

```bash
npm run build
```

Build dosyaları `dist/` klasöründe oluşturulur.

Preview için:

```bash
npm run preview
```

## 🔐 Güvenlik

- JWT token tabanlı kimlik doğrulama
- Otomatik token yenileme
- Rol tabanlı yetkilendirme (Admin, Super Admin)
- Güvenli API çağrıları
- XSS koruması

## 🌐 API Endpoints

Admin panel aşağıdaki API endpoint'lerini kullanır:

- `POST /api/auth/login` - Giriş
- `GET /api/admin/dashboard/stats` - Dashboard istatistikleri
- `GET /api/admin/users` - Kullanıcı listesi
- `GET /api/admin/users/:id` - Kullanıcı detayları
- `PUT /api/admin/users/:id` - Kullanıcı güncelleme
- `POST /api/admin/users/:id/toggle-ban` - Ban/Aktif etme
- `GET /api/admin/vehicles` - Araç listesi
- `POST /api/admin/vehicles/:id/verify` - Araç onaylama
- `GET /api/admin/photos` - Fotoğraf listesi
- `DELETE /api/admin/photos/:id` - Fotoğraf silme
- `GET /api/admin/messages` - Mesaj listesi
- `GET /api/admin/security/events` - Güvenlik olayları
- `GET /api/subscriptions/admin/all` - Abonelik listesi
- `GET /api/subscriptions/admin/stats` - Abonelik istatistikleri

## 📝 Notlar

- Backend'in `http://localhost:3000` adresinde çalışıyor olması gerekir
- Admin paneli sadece web için tasarlanmıştır (mobil uygulama değil)
- Gerçek veri kullanır, mock data yoktur
- Responsive tasarım - masaüstü, tablet ve mobilde çalışır

## 🆘 Sorun Giderme

### Backend'e bağlanamıyorum
- Backend'in çalıştığından emin olun
- `.env` dosyasındaki `VITE_API_URL` değerini kontrol edin
- CORS ayarlarını kontrol edin

### Admin girişi yapamıyorum
- Kullanıcınızın `admin` veya `super_admin` rolüne sahip olduğundan emin olun
- `backend/scripts/addAdminRole.js` scriptini çalıştırın
- Database'de kullanıcı rolünü manuel olarak güncelleyin

### İstatistikler yüklenmiyor
- Backend API'nin çalıştığından emin olun
- Browser console'da hata mesajlarını kontrol edin
- Network sekmesinde API çağrılarını inceleyin

## 📞 Destek

Sorunlarınız için backend loglarını ve browser console'u kontrol edin.

## 📄 Lisans

Bu proje CaddateApp'in bir parçasıdır.

