-- CaddateApp Admin Role Migration
-- Bu SQL'i pgAdmin'de çalıştırın

BEGIN;

-- 1. Users tablosuna role kolonu ekle
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. Users tablosuna admin_level kolonu ekle
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0;

-- 3. Role index'i ekle
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 4. İlk admin kullanıcısını güncelle (email'i kendi email'inize değiştirin)
-- NOT: Önce kendi email adresinizle kayıtlı bir kullanıcınız olmalı
-- UPDATE users 
-- SET role = 'super_admin', admin_level = 100 
-- WHERE email = 'admin@caddate.com';

COMMIT;

-- Kontrol sorguları:
SELECT id, email, first_name, last_name, role, admin_level, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- Email adresinizi bulup admin yapmak için:
-- 1. Önce kullanıcılarınızı listeleyin:
SELECT id, email, first_name, last_name, role FROM users;

-- 2. Sonra kendi ID'nizi kullanarak admin yapın:
-- UPDATE users SET role = 'super_admin', admin_level = 100 WHERE id = YOUR_ID;

