-- Test Verisi Ekleme Script'i
-- Bu SQL'i pgAdmin'de çalıştırarak test verileri ekleyebilirsiniz

BEGIN;

-- 1. Test Kullanıcıları Ekle (şifreler: "test123")
-- Bcrypt hash for "test123": $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.9E8k9e

INSERT INTO users (email, password, first_name, last_name, birth_date, gender, is_active, role, admin_level, created_at)
VALUES 
  ('test1@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.9E8k9e', 'Ahmet', 'Yılmaz', '1990-01-15', 'male', true, 'user', 0, NOW() - INTERVAL '10 days'),
  ('test2@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.9E8k9e', 'Ayşe', 'Demir', '1992-03-20', 'female', true, 'user', 0, NOW() - INTERVAL '8 days'),
  ('test3@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.9E8k9e', 'Mehmet', 'Kaya', '1988-07-10', 'male', true, 'user', 0, NOW() - INTERVAL '5 days'),
  ('test4@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.9E8k9e', 'Fatma', 'Şahin', '1995-11-25', 'female', true, 'user', 0, NOW() - INTERVAL '3 days'),
  ('test5@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.9E8k9e', 'Ali', 'Çelik', '1991-05-18', 'male', false, 'user', 0, NOW() - INTERVAL '1 day')
ON CONFLICT (email) DO NOTHING;

-- 2. Güvenlik Olayları Ekle (Login attemptler, vb.)
INSERT INTO security_history (user_id, activity_type, description, ip_address, created_at)
SELECT 
  u.id,
  CASE 
    WHEN random() < 0.3 THEN 'login_success'
    WHEN random() < 0.5 THEN 'login_failed'
    WHEN random() < 0.7 THEN 'password_change'
    ELSE 'suspicious_activity'
  END,
  CASE 
    WHEN random() < 0.3 THEN 'Başarılı giriş yapıldı'
    WHEN random() < 0.5 THEN 'Başarısız giriş denemesi'
    WHEN random() < 0.7 THEN 'Şifre değiştirildi'
    ELSE 'Şüpheli aktivite tespit edildi'
  END,
  '192.168.1.' || floor(random() * 255)::text,
  NOW() - (random() * INTERVAL '14 days')
FROM users u
CROSS JOIN generate_series(1, 3) -- Her kullanıcı için 3 güvenlik olayı
WHERE u.email LIKE 'test%@example.com';

-- 3. Fotoğraflar Ekle
INSERT INTO photos (user_id, photo_url, photo_type, caption, created_at)
SELECT 
  u.id,
  '/uploads/photos/test-photo-' || u.id || '-' || gs || '.jpg',
  CASE WHEN gs = 1 THEN 'profile' ELSE 'gallery' END,
  'Test fotoğraf ' || gs,
  NOW() - (random() * INTERVAL '20 days')
FROM users u
CROSS JOIN generate_series(1, 2) gs
WHERE u.email LIKE 'test%@example.com';

-- 4. Mesajlar Ekle
INSERT INTO messages (sender_id, receiver_id, message, message_type, is_read, created_at)
SELECT 
  u1.id as sender_id,
  u2.id as receiver_id,
  'Merhaba! Test mesajı ' || gs,
  'text',
  random() < 0.5,
  NOW() - (random() * INTERVAL '10 days')
FROM users u1
CROSS JOIN users u2
CROSS JOIN generate_series(1, 2) gs
WHERE u1.id != u2.id
  AND u1.email LIKE 'test%@example.com'
  AND u2.email LIKE 'test%@example.com'
LIMIT 20;

-- 5. Araçlar Ekle
INSERT INTO user_vehicles (user_id, plate_number, brand, model, year, color, fuel_type, is_verified, created_at)
SELECT 
  u.id,
  '34 ABC ' || LPAD((1000 + u.id)::text, 3, '0'),
  CASE floor(random() * 5)::int
    WHEN 0 THEN 'BMW'
    WHEN 1 THEN 'Mercedes'
    WHEN 2 THEN 'Audi'
    WHEN 3 THEN 'Volkswagen'
    ELSE 'Renault'
  END,
  'Model ' || (2015 + floor(random() * 9))::int,
  2015 + floor(random() * 9)::int,
  CASE floor(random() * 5)::int
    WHEN 0 THEN 'Siyah'
    WHEN 1 THEN 'Beyaz'
    WHEN 2 THEN 'Gri'
    WHEN 3 THEN 'Mavi'
    ELSE 'Kırmızı'
  END,
  CASE floor(random() * 3)::int
    WHEN 0 THEN 'benzin'
    WHEN 1 THEN 'dizel'
    ELSE 'hibrit'
  END,
  random() < 0.7, -- %70 oranında onaylı
  NOW() - (random() * INTERVAL '15 days')
FROM users u
WHERE u.email LIKE 'test%@example.com'
ON CONFLICT (user_id, plate_number) DO NOTHING;

-- 6. Aktiviteler Ekle
INSERT INTO activities (user_id, type, title, description, created_at)
SELECT 
  u.id,
  CASE floor(random() * 4)::int
    WHEN 0 THEN 'profile_update'
    WHEN 1 THEN 'photo_upload'
    WHEN 2 THEN 'message_sent'
    ELSE 'friend_request'
  END,
  CASE floor(random() * 4)::int
    WHEN 0 THEN 'Profil güncellendi'
    WHEN 1 THEN 'Yeni fotoğraf eklendi'
    WHEN 2 THEN 'Mesaj gönderildi'
    ELSE 'Arkadaşlık isteği gönderildi'
  END,
  'Test aktivite açıklaması',
  NOW() - (random() * INTERVAL '7 days')
FROM users u
CROSS JOIN generate_series(1, 3)
WHERE u.email LIKE 'test%@example.com';

-- 7. Profil Ziyaretleri Ekle
INSERT INTO profile_visits (visitor_id, profile_id, created_at)
SELECT 
  u1.id,
  u2.id,
  NOW() - (random() * INTERVAL '5 days')
FROM users u1
CROSS JOIN users u2
WHERE u1.id != u2.id
  AND u1.email LIKE 'test%@example.com'
  AND u2.email LIKE 'test%@example.com'
ON CONFLICT (visitor_id, profile_id, DATE(created_at)) DO NOTHING;

COMMIT;

-- Kontrol Sorguları
SELECT 'Test Users' as info, COUNT(*) as count FROM users WHERE email LIKE 'test%@example.com'
UNION ALL
SELECT 'Security Events', COUNT(*) FROM security_history
UNION ALL
SELECT 'Photos', COUNT(*) FROM photos
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM user_vehicles
UNION ALL
SELECT 'Activities', COUNT(*) FROM activities;

-- Test kullanıcı bilgileri
SELECT 
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active,
  created_at
FROM users 
WHERE email LIKE 'test%@example.com'
ORDER BY created_at DESC;

-- NOT: Test kullanıcılarının şifresi "test123"

