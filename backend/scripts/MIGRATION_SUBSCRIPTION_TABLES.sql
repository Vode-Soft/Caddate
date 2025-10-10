-- CaddateApp Subscription System Migration
-- Bu SQL'i pgAdmin'de çalıştırın

BEGIN;

-- 1. Abonelik planları tablosu
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_tr VARCHAR(100) NOT NULL,
  description TEXT,
  description_tr TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TRY',
  duration_days INTEGER NOT NULL,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Kullanıcı abonelikleri tablosu
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending', 'failed')),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  amount_paid DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'TRY',
  cancelled_at TIMESTAMP NULL,
  cancelled_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Ödeme geçmişi tablosu
CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TRY',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255) UNIQUE,
  payment_gateway VARCHAR(50),
  gateway_response JSONB DEFAULT '{}',
  refund_amount DECIMAL(10, 2),
  refunded_at TIMESTAMP NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Premium özellikleri kullanım tablosu
CREATE TABLE IF NOT EXISTS feature_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  reset_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, feature_name)
);

-- 5. Users tablosuna premium alanları ekle
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_until TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS premium_features JSONB DEFAULT '{}';

-- 6. İndexler oluştur
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_order ON subscription_plans(display_order);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_dates ON user_subscriptions(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_transaction ON payment_history(transaction_id);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name);

CREATE INDEX IF NOT EXISTS idx_users_premium ON users(is_premium);
CREATE INDEX IF NOT EXISTS idx_users_premium_until ON users(premium_until);

-- 7. Trigger'lar oluştur
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_payment_history_updated_at BEFORE UPDATE ON payment_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_feature_usage_updated_at BEFORE UPDATE ON feature_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Örnek abonelik planları ekle
INSERT INTO subscription_plans (name, name_tr, description, description_tr, price, duration_days, features, is_popular, display_order)
VALUES 
  (
    'Basic Premium',
    'Temel Premium',
    'Essential features for casual users',
    'Günlük kullanıcılar için temel özellikler',
    49.90,
    30,
    '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": false, "unlimited_swipes": true, "rewind": false, "passport": false, "boost_per_month": 1}',
    false,
    1
  ),
  (
    'Gold Premium',
    'Altın Premium',
    'Advanced features for power users',
    'Aktif kullanıcılar için gelişmiş özellikler',
    99.90,
    30,
    '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "passport": false, "boost_per_month": 3, "super_like_per_day": 5, "priority_support": true}',
    true,
    2
  ),
  (
    'Platinum Premium',
    'Platin Premium',
    'All features unlocked',
    'Tüm özellikler açık',
    149.90,
    30,
    '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "passport": true, "boost_per_month": 10, "super_like_per_day": 10, "priority_support": true, "message_before_match": true, "priority_likes": true, "exclusive_badge": true}',
    false,
    3
  ),
  (
    '3 Month Gold',
    '3 Aylık Altın',
    '3 months of Gold Premium with discount',
    '3 ay Altın Premium indirimli',
    249.90,
    90,
    '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "passport": false, "boost_per_month": 3, "super_like_per_day": 5, "priority_support": true}',
    false,
    4
  ),
  (
    '6 Month Platinum',
    '6 Aylık Platin',
    '6 months of Platinum Premium - Best Value',
    '6 ay Platin Premium - En Avantajlı',
    699.90,
    180,
    '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "passport": true, "boost_per_month": 10, "super_like_per_day": 10, "priority_support": true, "message_before_match": true, "priority_likes": true, "exclusive_badge": true}',
    false,
    5
  )
ON CONFLICT DO NOTHING;

COMMIT;

-- Kontrol sorguları:
SELECT id, name_tr, price, duration_days FROM subscription_plans;

SELECT COUNT(*) as total_plans FROM subscription_plans;

