# 💎 Premium Özellikler - Uygulama Dokümantasyonu

## 📋 Özet

Premium sistem kontrol edildi, tutarsızlıklar giderildi ve route'lara premium kontrolleri eklendi.

## ✅ Yapılan Düzenlemeler

### 1. Premium Özellik Setleri Birleştirildi ✓

**Sorun:** İki farklı premium özellik seti vardı:
- `insert_subscription_plans.sql` - Eski set (12 özellik)
- `addSubscriptionTables.js` - Yeni set (13 özellik)

**Çözüm:** 
- `insert_subscription_plans.sql` dosyası `addSubscriptionTables.js` ile tutarlı hale getirildi
- Artık tek bir tutarlı premium özellik seti kullanılıyor

### 2. Premium Özellik İsimleri (Toplam: 13)

Aktif premium özellikler:

1. `unlimited_messages` - Sınırsız mesajlaşma
2. `profile_boost` - Profil boost
3. `hide_ads` - Reklamları gizle
4. `see_who_liked` - Beğenileri görme
5. `unlimited_swipes` - Sınırsız kaydırma
6. `rewind` - Geri alma (beğeniyi geri al)
7. `passport` - Passport (konum değiştirme)
8. `boost_per_month` - Aylık boost sayısı (1, 3 veya 10)
9. `super_like_per_day` - Günlük super like sayısı (5 veya 10)
10. `priority_support` - Öncelikli destek
11. `message_before_match` - Eşleşmeden önce mesaj
12. `priority_likes` - Öncelikli beğeniler
13. `exclusive_badge` - Özel rozet

### 3. Premium Planlar (Toplam: 5)

1. **Basic Premium** - ₺49.90/ay
   - unlimited_messages, profile_boost, hide_ads, unlimited_swipes
   - boost_per_month: 1

2. **Gold Premium** - ₺99.90/ay (Popüler)
   - Basic + see_who_liked, rewind
   - boost_per_month: 3, super_like_per_day: 5, priority_support

3. **Platinum Premium** - ₺149.90/ay
   - Gold + passport, message_before_match, priority_likes, exclusive_badge
   - boost_per_month: 10, super_like_per_day: 10

4. **3 Month Gold** - ₺249.90 (90 gün)
   - Gold Premium özellikleri

5. **6 Month Platinum** - ₺699.90 (180 gün)
   - Platinum Premium özellikleri

### 4. Route'lara Premium Kontrolleri Eklendi ✓

#### `/api/matches` Route'ları

```javascript
// Beğeniyi geri al - Premium: rewind özelliği
router.delete('/unlike/:unlikedUserId', requirePremiumFeature('rewind'), unlikeUser);

// Seni beğenenleri getir - Premium: see_who_liked özelliği
router.get('/likes-received', requirePremiumFeature('see_who_liked'), getLikesReceived);
```

#### `/api/chat` Route'ları

**Not:** Mesajlaşma için route seviyesinde premium kontrolü yok. Controller'da ücretsiz kullanıcılar için günlük 20 mesaj limiti kontrolü yapılıyor. Premium kullanıcılar (`unlimited_messages: true`) sınırsız mesaj gönderebilir.

```javascript
// Mesaj gönder (Premium kontrolü controller'da - ücretsiz: 20 mesaj/gün, premium: sınırsız)
router.post('/send', sendMessage);

// Özel mesaj gönder (Premium kontrolü controller'da - ücretsiz: 20 mesaj/gün, premium: sınırsız)
router.post('/private/send', sendPrivateMessage);
```

## 🔧 Kullanım

### Premium Kontrolü Ekleme

Route'lara premium kontrolü eklemek için:

```javascript
const { requirePremium, requirePremiumFeature } = require('../middleware/premiumAuth');

// Genel premium kontrolü
router.get('/premium-endpoint', authenticateToken, requirePremium, handler);

// Belirli özellik kontrolü
router.post('/super-like', 
  authenticateToken, 
  requirePremiumFeature('super_like_per_day'), 
  handler
);
```

### Premium Durumu Kontrolü

Controller'da premium durumunu kontrol etmek için:

```javascript
const Subscription = require('../models/Subscription');

const premiumStatus = await Subscription.checkUserPremiumStatus(userId);
if (premiumStatus.isPremium) {
  // Premium özellikleri kullan
  const hasFeature = premiumStatus.features['unlimited_messages'];
}
```

## 📝 Notlar

1. **Passport Özelliği:** Şu anda ayrı bir endpoint yok. Normal konum güncellemesi serbest, ancak çok uzak mesafeye atlama (passport) için ayrı bir endpoint oluşturulabilir.

2. **Super Like & Boost:** Şu anda controller'larda super like ve boost endpoint'leri yok. İleride eklenecekse premium kontrolleri eklenebilir.

3. **Unlimited Messages:** Ücretsiz kullanıcılar için mesaj limiti controller'da kontrol edilebilir. Premium kontrolü route seviyesinde yapılıyor.

## 🚀 Gelecek Geliştirmeler

- [ ] Super like endpoint'i ve premium kontrolü
- [ ] Boost endpoint'i ve premium kontrolü  
- [ ] Passport (konum değiştirme) endpoint'i
- [ ] Premium özellik kullanım takibi (feature_usage tablosu)
- [ ] Frontend'de premium özellik bildirimleri

## 📚 İlgili Dosyalar

- `backend/middleware/premiumAuth.js` - Premium middleware
- `backend/models/Subscription.js` - Subscription model
- `backend/scripts/addSubscriptionTables.js` - Ana script (kullanılmalı)
- `backend/scripts/insert_subscription_plans.sql` - SQL dosyası (tutarlı hale getirildi)

