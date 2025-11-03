const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Subscription tabloları migration başlatılıyor...');
    
    await client.query('BEGIN');
    
    // 1. Subscription plans tablosunu oluştur
    console.log('📋 subscription_plans tablosu oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        name_tr VARCHAR(100),
        description TEXT,
        description_tr TEXT,
        price DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'TRY',
        duration_days INTEGER NOT NULL,
        features JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. User subscriptions tablosunu oluştur
    console.log('👤 user_subscriptions tablosu oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES subscription_plans(id),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending', 'failed')),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        amount_paid DECIMAL(10, 2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'TRY',
        auto_renew BOOLEAN DEFAULT true,
        cancelled_at TIMESTAMP,
        cancelled_reason TEXT,
        is_admin_given BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 3. Payment history tablosunu oluştur
    console.log('💳 payment_history tablosu oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subscription_id INTEGER REFERENCES user_subscriptions(id),
        plan_id INTEGER REFERENCES subscription_plans(id),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'TRY',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        payment_gateway VARCHAR(50),
        gateway_response JSONB,
        is_admin_given BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 4. Feature usage tablosunu oluştur
    console.log('⚡ feature_usage tablosu oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS feature_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        feature_name VARCHAR(100) NOT NULL,
        usage_count INTEGER DEFAULT 1,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, feature_name)
      )
    `);
    
    // 5. Users tablosuna premium alanları ekle
    console.log('🔧 users tablosuna premium alanları ekleniyor...');
    
    // Önce mevcut kolonları kontrol et
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    
    // is_premium alanı
    if (!existingColumns.includes('is_premium')) {
      await client.query('ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT false');
      console.log('  ✅ is_premium alanı eklendi');
    } else {
      console.log('  ℹ️  is_premium alanı zaten mevcut');
    }
    
    // premium_until alanı
    if (!existingColumns.includes('premium_until')) {
      await client.query('ALTER TABLE users ADD COLUMN premium_until TIMESTAMP');
      console.log('  ✅ premium_until alanı eklendi');
    } else {
      console.log('  ℹ️  premium_until alanı zaten mevcut');
    }
    
    // premium_features alanı
    if (!existingColumns.includes('premium_features')) {
      await client.query('ALTER TABLE users ADD COLUMN premium_features JSONB DEFAULT \'{}\'');
      console.log('  ✅ premium_features alanı eklendi');
    } else {
      console.log('  ℹ️  premium_features alanı zaten mevcut');
    }
    
    // role alanı
    if (!existingColumns.includes('role')) {
      await client.query('ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT \'user\' CHECK (role IN (\'user\', \'admin\', \'super_admin\'))');
      console.log('  ✅ role alanı eklendi');
    } else {
      console.log('  ℹ️  role alanı zaten mevcut');
    }
    
    // 6. Indexleri oluştur
    console.log('📊 Indexler oluşturuluyor...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status)',
      'CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON user_subscriptions(end_date)',
      'CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(subscription_id)',
      'CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON feature_usage(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name)'
    ];
    
    for (const indexQuery of indexes) {
      await client.query(indexQuery);
    }
    console.log('  ✅ Tüm indexler oluşturuldu');
    
    // 7. Örnek planları ekle
    console.log('📦 Örnek subscription planları ekleniyor...');
    
    const plans = [
      {
        name: 'Basic',
        name_tr: 'Temel',
        description: 'Basic features for new users',
        description_tr: 'Yeni kullanıcılar için temel özellikler',
        price: 0.00,
        currency: 'TRY',
        duration_days: 30,
        features: JSON.stringify({
          unlimited_swipes: true,
          basic_filters: true,
          profile_views: 10
        }),
        is_active: true,
        display_order: 1
      },
      {
        name: 'Premium',
        name_tr: 'Premium',
        description: 'Premium features with advanced options',
        description_tr: 'Gelişmiş seçeneklerle premium özellikler',
        price: 29.99,
        currency: 'TRY',
        duration_days: 30,
        features: JSON.stringify({
          unlimited_swipes: true,
          advanced_filters: true,
          unlimited_profile_views: true,
          super_likes: 5,
          boost: 1,
          see_who_liked_you: true
        }),
        is_active: true,
        display_order: 2
      },
      {
        name: 'VIP',
        name_tr: 'VIP',
        description: 'All features with maximum benefits',
        description_tr: 'Maksimum faydalarla tüm özellikler',
        price: 49.99,
        currency: 'TRY',
        duration_days: 30,
        features: JSON.stringify({
          unlimited_swipes: true,
          advanced_filters: true,
          unlimited_profile_views: true,
          unlimited_super_likes: true,
          unlimited_boost: true,
          see_who_liked_you: true,
          priority_support: true,
          exclusive_features: true
        }),
        is_active: true,
        display_order: 3
      },
      {
        name: 'Premium 3 Months',
        name_tr: 'Premium 3 Aylık',
        description: '3 months premium subscription with discount',
        description_tr: 'İndirimli 3 aylık premium abonelik',
        price: 79.99,
        currency: 'TRY',
        duration_days: 90,
        features: JSON.stringify({
          unlimited_swipes: true,
          advanced_filters: true,
          unlimited_profile_views: true,
          super_likes: 15,
          boost: 3,
          see_who_liked_you: true
        }),
        is_active: true,
        display_order: 4
      },
      {
        name: 'VIP 6 Months',
        name_tr: 'VIP 6 Aylık',
        description: '6 months VIP subscription with maximum discount',
        description_tr: 'Maksimum indirimli 6 aylık VIP abonelik',
        price: 199.99,
        currency: 'TRY',
        duration_days: 180,
        features: JSON.stringify({
          unlimited_swipes: true,
          advanced_filters: true,
          unlimited_profile_views: true,
          unlimited_super_likes: true,
          unlimited_boost: true,
          see_who_liked_you: true,
          priority_support: true,
          exclusive_features: true
        }),
        is_active: true,
        display_order: 5
      }
    ];
    
    for (const plan of plans) {
      await client.query(`
        INSERT INTO subscription_plans (name, name_tr, description, description_tr, price, currency, duration_days, features, is_active, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `, [
        plan.name, plan.name_tr, plan.description, plan.description_tr,
        plan.price, plan.currency, plan.duration_days, plan.features,
        plan.is_active, plan.display_order
      ]);
    }
    console.log('  ✅ 5 adet subscription planı eklendi');
    
    await client.query('COMMIT');
    console.log('✅ Migration başarıyla tamamlandı!');
    
    // Tablo durumunu kontrol et
    console.log('\n📊 Tablo durumu:');
    const tableChecks = [
      { name: 'subscription_plans', query: 'SELECT COUNT(*) as count FROM subscription_plans' },
      { name: 'user_subscriptions', query: 'SELECT COUNT(*) as count FROM user_subscriptions' },
      { name: 'payment_history', query: 'SELECT COUNT(*) as count FROM payment_history' },
      { name: 'feature_usage', query: 'SELECT COUNT(*) as count FROM feature_usage' }
    ];
    
    for (const check of tableChecks) {
      const result = await client.query(check.query);
      console.log(`  ${check.name}: ${result.rows[0].count} kayıt`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration hatası:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Migration'ı çalıştır
runMigration()
  .then(() => {
    console.log('🎉 Migration işlemi tamamlandı!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration başarısız:', error);
    process.exit(1);
  });
