# 🔒 Güvenlik Sayfası - Özellikler ve Kullanım

## ✅ Eklenen Özellikler

### 📊 İstatistik Kartları
1. **Toplam Olay Sayısı**
   - Son 7 gündeki tüm güvenlik olayları
   - Gerçek zamanlı güncelleme

2. **Başarısız Giriş Denemeleri**
   - Başarısız login sayısı
   - Önceki haftaya göre trend (↑ veya ↓)
   - Kırmızı uyarı rengi

3. **Şüpheli Aktiviteler**
   - Tespit edilen şüpheli olaylar
   - Trend analizi
   - Turuncu uyarı rengi

4. **Bloklu IP Sayısı**
   - Aktif IP yasakları
   - Kırmızı renk vurgusu

### 🔍 Filtreleme Özellikleri
- **Aktivite Türü:**
  - Tümü
  - Başarısız Giriş
  - Başarılı Giriş
  - Şüpheli Aktivite
  - Şifre Değişikliği
  - Hesap Banlandı

- **Tarih Aralığı:**
  - Son 24 Saat
  - Son 7 Gün (varsayılan)
  - Son 30 Gün
  - Son 90 Gün

- **IP Arama:**
  - Belirli IP adresini arama
  - Gerçek zamanlı filtreleme

### 🚨 Uyarı Sistemi
- Şüpheli aktivite tespit edildiğinde sarı uyarı kutusu
- "Dikkat!" mesajı ile bilgilendirme
- İstatistik bazlı otomatik uyarılar

### 🛠️ Aksiyon Butonları
1. **Yenile Butonu**
   - Verileri gerçek zamanlı güncelleme
   - Başarı bildirimi

2. **Rapor İndir**
   - CSV formatında export
   - Tarih, kullanıcı, aktivite, IP bilgileri
   - Otomatik dosya indirme

### 📋 Detaylı Tablo
- **Tarih/Saat:** Tam timestamp bilgisi
- **Kullanıcı:** Ad, soyad ve email
- **Aktivite Türü:** Renkli chip'ler
- **Açıklama:** Olay detayı
- **IP Adresi:** Konum ikonu ile
- **İşlemler:** IP engelleme butonu

### 🎨 Görsel İyileştirmeler
- Modern card tasarımı
- Gradient arka planlar
- Icon'lu istatistikler
- Smooth animasyonlar
- Dark tema uyumlu

---

## 🚀 Gelecekte Eklenebilecek Özellikler

### 1. 🌍 IP Coğrafi Konum Haritası
```jsx
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

// IP lokasyonlarını haritada göster
<MapContainer>
  {ipLocations.map(loc => (
    <Marker position={[loc.lat, loc.lng]} />
  ))}
</MapContainer>
```

### 2. 📈 Gerçek Zamanlı Dashboard
```jsx
// WebSocket ile canlı güvenlik feed
useEffect(() => {
  const socket = io('http://localhost:3000');
  socket.on('security_event', (event) => {
    setLiveEvents(prev => [event, ...prev]);
  });
}, []);
```

### 3. 🤖 Otomatik Tehdit Tespiti
- Machine learning ile şüpheli pattern tespiti
- Otomatik IP ban (threshold'a göre)
- Email/SMS uyarı sistemi

### 4. 📊 Gelişmiş Analitik
```jsx
import { LineChart, BarChart } from 'recharts';

// Zaman bazlı grafik
<LineChart data={hourlySecurityEvents}>
  <Line dataKey="failed_logins" stroke="#ef4444" />
  <Line dataKey="suspicious" stroke="#f59e0b" />
</LineChart>
```

### 5. 🔐 IP Kara Liste Yönetimi
```jsx
// Ayrı bir tab veya modal
<BlacklistManager>
  - Manuel IP ekleme
  - Toplu IP import (CSV)
  - Whitelist yönetimi
  - Geçici vs kalıcı ban
  - Ban süresi ayarlama
</BlacklistManager>
```

### 6. 📧 Bildirim Ayarları
```jsx
<NotificationSettings>
  - Email bildirimleri
  - Slack/Discord entegrasyonu
  - Threshold ayarları
  - Hangi olaylarda bildirim
</NotificationSettings>
```

### 7. 🔍 Detaylı Log Görüntüleyici
```jsx
<LogViewer>
  - User agent bilgisi
  - Browser fingerprint
  - Cihaz bilgisi
  - Referrer URL
  - Full request headers
</LogViewer>
```

### 8. 📱 Mobil Bildirimler
- Push notification
- Kritik olaylar için anında uyarı
- Admin mobil app entegrasyonu

### 9. 🎯 Kullanıcı Risk Skoru
```jsx
// Her kullanıcı için risk skoru
<UserRiskScore>
  - Başarısız giriş sayısı
  - IP değişim sıklığı
  - Şüpheli aktivite geçmişi
  - Risk skoru: 0-100
</UserRiskScore>
```

### 10. 🔄 Otomatik Aksiyon Kuralları
```jsx
<AutomationRules>
  - 5 başarısız girişte hesabı kilitle
  - 10 başarısız girişte IP'yi banla
  - Yeni IP'den girişte 2FA zorunlu
  - Farklı ülkeden girişte email doğrulama
</AutomationRules>
```

---

## 🛠️ Backend Geliştirmeleri

### Yeni Tablolar

#### 1. blocked_ips
```sql
CREATE TABLE blocked_ips (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) UNIQUE NOT NULL,
  reason TEXT,
  blocked_by_admin_id INTEGER REFERENCES users(id),
  blocked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL,
  is_permanent BOOLEAN DEFAULT false
);
```

#### 2. security_rules
```sql
CREATE TABLE security_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- 'auto_ban', 'auto_lock', 'notify'
  condition_type VARCHAR(50) NOT NULL, -- 'failed_login_count', 'suspicious_activity'
  threshold INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. security_alerts
```sql
CREATE TABLE security_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id INTEGER REFERENCES users(id),
  ip_address VARCHAR(45),
  is_resolved BOOLEAN DEFAULT false,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📝 Kullanım Örnekleri

### CSV Export Kullanımı
```javascript
// Rapor indir butonuna tıklayın
// Otomatik olarak şu formatta CSV indirilir:
// Tarih,Kullanıcı,Email,Aktivite,Açıklama,IP
// 09/10/2025 14:30:00,Ahmet Yılmaz,ahmet@example.com,Başarısız Giriş,Hatalı şifre,192.168.1.1
```

### Filtreleme Örneği
```javascript
// Son 24 saatte başarısız giriş denemeleri
1. Aktivite Türü: "Başarısız Giriş"
2. Tarih Aralığı: "Son 24 Saat"
3. Tablo otomatik güncellenir
```

### IP Arama
```javascript
// Belirli bir IP'nin tüm aktivitelerini görme
1. IP arama kutusuna: "192.168.1.100"
2. Enter'a basın
3. O IP'nin tüm olayları listelenir
```

---

## 🎯 Best Practices

1. **Düzenli Kontrol:** Günde en az 1 kez güvenlik sayfasını kontrol edin
2. **Rapor Yedekleme:** Haftalık CSV raporları indirip arşivleyin
3. **Threshold Ayarları:** 5+ başarısız girişi takip edin
4. **IP Analizi:** Aynı IP'den çok sayıda farklı kullanıcı girişi şüphelidir
5. **Trend Takibi:** Artış trendlerine dikkat edin

---

## 🚨 Acil Durum Prosedürü

### Şüpheli Aktivite Tespit Edildiğinde:
1. ✅ Olayı detaylı inceleyin
2. ✅ Kullanıcı hesabını geçici kilitleyin
3. ✅ IP adresini engelleyin
4. ✅ Kullanıcıya email/SMS gönderin
5. ✅ Olay raporunu kaydedin
6. ✅ Gerekirse polise bildirin

### Saldırı Algılandığında:
1. 🚨 Tüm şüpheli IP'leri hemen engelleyin
2. 🚨 Etkilenen kullanıcılara bildirim gönderin
3. 🚨 2FA'yı tüm kullanıcılar için zorunlu yapın
4. 🚨 Şifre sıfırlama linklerini geçersiz kılın
5. 🚨 Database yedeklerini kontrol edin

---

## 📞 Destek

Güvenlik ile ilgili sorularınız için:
- Backend log'larını kontrol edin
- `security_history` tablosunu inceleyin
- Admin panel'de detaylı raporları görüntüleyin

**Kritik Güvenlik Sorunları:**
Acil durumlarda backend'i durdurun ve database'i yedekleyin!

