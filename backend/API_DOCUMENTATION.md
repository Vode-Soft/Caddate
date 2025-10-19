# 🔌 CaddateApp Backend API Documentation

Bu dokümantasyon, CaddateApp backend API'sinin tüm endpoint'lerini ve kullanım örneklerini içerir.

## 📋 İçindekiler

- [Authentication](#authentication)
- [Users](#users)
- [Confessions](#confessions)
- [Push Notifications](#push-notifications)
- [Friend Suggestions](#friend-suggestions)
- [Analytics](#analytics)
- [Error Handling](#error-handling)

## 🔐 Authentication

### POST /api/auth/register
Kullanıcı kaydı oluşturur.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Kullanıcı başarıyla kaydedildi",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /api/auth/login
Kullanıcı girişi yapar.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Giriş başarılı",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "jwt_token_here"
  }
}
```

## 👥 Users

### GET /api/users/profile
Kullanıcının profil bilgilerini getirir.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "profilePicture": "https://example.com/photo.jpg",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### PUT /api/users/profile
Kullanıcı profilini günceller.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Hello world!"
}
```

## 📝 Confessions

### POST /api/confessions
Yeni itiraf oluşturur.

**Request Body:**
```json
{
  "content": "Bu bir test itirafıdır.",
  "isAnonymous": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "İtirafınız başarıyla paylaşıldı",
  "data": {
    "confession": {
      "id": 1,
      "content": "Bu bir test itirafıdır.",
      "isAnonymous": true,
      "likesCount": 0,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### GET /api/confessions
İtirafları listeler.

**Query Parameters:**
- `page` (optional): Sayfa numarası (default: 1)
- `limit` (optional): Sayfa başına kayıt (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "confessions": [
      {
        "id": 1,
        "content": "Test confession",
        "isAnonymous": true,
        "authorName": "Anonim",
        "likesCount": 5,
        "timeAgo": "2 saat önce"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalCount": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /api/confessions/:confessionId/like
İtirafı beğenir.

**Response:**
```json
{
  "success": true,
  "message": "İtiraf beğenildi"
}
```

## 🔔 Push Notifications

### POST /api/push-notifications/token
FCM token'ı günceller.

**Request Body:**
```json
{
  "token": "expo_push_token_here"
}
```

### POST /api/push-notifications/test
Test bildirimi gönderir.

**Request Body:**
```json
{
  "title": "Test Bildirimi",
  "body": "Bu bir test bildirimidir."
}
```

### GET /api/push-notifications/settings
Bildirim ayarlarını getirir.

**Response:**
```json
{
  "success": true,
  "data": {
    "pushNotifications": true,
    "emailNotifications": false
  }
}
```

## 👥 Friend Suggestions

### GET /api/friend-suggestions
Arkadaş önerilerini getirir.

**Query Parameters:**
- `limit` (optional): Öneri sayısı (default: 10)
- `offset` (optional): Başlangıç noktası (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": 2,
        "firstName": "Jane",
        "lastName": "Doe",
        "profilePicture": "https://example.com/photo.jpg",
        "age": 25,
        "distance": 500,
        "mutualFriendsCount": 3,
        "suggestionReason": "location"
      }
    ],
    "totalCount": 5
  }
}
```

### POST /api/friend-suggestions/:suggestedUserId/like
Önerilen kullanıcıyı beğenir.

**Response:**
```json
{
  "success": true,
  "message": "Kullanıcı beğenildi",
  "isMatch": false
}
```

## 📊 Analytics

### GET /api/analytics/dashboard
Dashboard analytics verilerini getirir.

**Query Parameters:**
- `period` (optional): Zaman aralığı (1d, 7d, 30d, 90d)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "userStats": {
      "totalUsers": 1000,
      "newUsers": 50,
      "activeUsers": 200,
      "premiumUsers": 100
    },
    "activityStats": {
      "dailyActivities": [...],
      "popularActivities": [...],
      "avgActivitiesPerUser": 5.2
    },
    "revenueStats": {
      "totalRevenue": 5000.00,
      "monthlyRevenue": [...],
      "popularPlans": [...]
    }
  }
}
```

## ❌ Error Handling

### Hata Formatı

Tüm API endpoint'leri tutarlı hata formatı kullanır:

```json
{
  "success": false,
  "message": "Hata mesajı",
  "error": "Detaylı hata bilgisi"
}
```

### HTTP Status Kodları

- `200`: Başarılı
- `201`: Oluşturuldu
- `400`: Hatalı istek
- `401`: Yetkisiz erişim
- `403`: Yasak
- `404`: Bulunamadı
- `500`: Sunucu hatası

### Yaygın Hata Mesajları

```json
{
  "success": false,
  "message": "Token süresi dolmuş, lütfen yeniden giriş yapın"
}
```

```json
{
  "success": false,
  "message": "Bu işlem için yetkiniz yok"
}
```

```json
{
  "success": false,
  "message": "Kullanıcı bulunamadı"
}
```

## 🔒 Güvenlik

### Authentication
- JWT token tabanlı kimlik doğrulama
- Token süresi: 24 saat
- Otomatik token yenileme

### Rate Limiting
- API endpoint'leri için rate limiting
- IP bazlı kısıtlamalar
- Kullanıcı bazlı kısıtlamalar

### Data Validation
- Tüm input'lar validate edilir
- SQL injection koruması
- XSS koruması

## 📱 Mobile App Integration

### Token Yönetimi

```javascript
// Token'ı kaydet
await AsyncStorage.setItem('auth_token', token);

// Token'ı kullan
apiService.setToken(token);

// Otomatik token kontrolü
const isValid = await apiService.refreshTokenIfNeeded();
```

### Error Handling

```javascript
try {
  const response = await apiService.get('/users/profile');
  if (response.success) {
    // Başarılı işlem
  } else {
    // API hatası
    console.error(response.message);
  }
} catch (error) {
  // Network hatası
  console.error('Network error:', error.message);
}
```

## 🧪 Testing

### Test Endpoint'leri

```bash
# Health check
GET /health

# Test kullanıcısı oluştur
POST /api/test/create-user

# Test verilerini temizle
DELETE /api/test/cleanup
```

### Test Data

```json
{
  "testUser": {
    "email": "test@example.com",
    "password": "testpassword123",
    "firstName": "Test",
    "lastName": "User"
  }
}
```

## 📈 Performance

### Optimizasyonlar

- Database query optimizasyonu
- Response caching
- Image compression
- Lazy loading

### Monitoring

- Response time tracking
- Error rate monitoring
- Database performance metrics
- Memory usage tracking

## 🔄 Versioning

API versiyonlama:

- **v1**: Mevcut API
- **v2**: Gelecek major güncellemeler

Version header:
```
API-Version: v1
```

## 📞 Support

API ile ilgili sorular için:

- 📧 Email: api-support@caddate.com
- 📱 Discord: CaddateApp#1234
- 📖 Documentation: https://docs.caddate.com
