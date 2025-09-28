# Caddate

Mobil sosyal uygulama projesi - React Native (Expo) frontend ve Node.js backend ile geliştirilmiştir.

## Özellikler

- 🔐 Kullanıcı kayıt/giriş sistemi
- 📧 Email doğrulama
- 🔒 2FA güvenlik sistemi
- 📱 Real-time mesajlaşma
- 🗺️ Harita ve konum paylaşımı
- 👥 Arkadaş sistemi
- 📸 Fotoğraf paylaşımı
- 🔔 Bildirim sistemi

## Teknolojiler

### Frontend
- React Native (Expo)
- React Navigation
- Socket.io Client
- React Native Maps
- Expo Location

### Backend
- Node.js
- Express.js
- PostgreSQL
- Socket.io
- JWT Authentication
- Bcrypt

## Kurulum

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
npm install
npx expo start
```

## Veritabanı

PostgreSQL veritabanı kullanılmaktadır. `backend/database/schema.sql` dosyasından tablolar oluşturulabilir.
