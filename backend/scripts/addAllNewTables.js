const { pool } = require('../config/database');

async function addAllNewTables() {
  try {
    console.log('🚀 Tüm yeni tablolar oluşturuluyor...');

    // 1. İtiraf sistemi tabloları
    console.log('\n📝 İtiraf sistemi tabloları...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS confessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT true,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        is_approved BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS confession_likes (
        id SERIAL PRIMARY KEY,
        confession_id INTEGER REFERENCES confessions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(confession_id, user_id)
      );
    `);

    // 2. Arkadaş önerileri sistemi tabloları
    console.log('\n👥 Arkadaş önerileri sistemi tabloları...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        liked_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, liked_user_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_passes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        passed_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, passed_user_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        blocked_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, blocked_user_id)
      );
    `);

    // 3. Push notification sistemi tabloları
    console.log('\n🔔 Push notification sistemi tabloları...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        platform VARCHAR(20) DEFAULT 'expo',
        is_active BOOLEAN DEFAULT true,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_notification_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'opened')),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivered_at TIMESTAMP,
        opened_at TIMESTAMP,
        error_message TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        push_notifications BOOLEAN DEFAULT true,
        email_notifications BOOLEAN DEFAULT true,
        sms_notifications BOOLEAN DEFAULT false,
        new_matches BOOLEAN DEFAULT true,
        new_messages BOOLEAN DEFAULT true,
        new_likes BOOLEAN DEFAULT true,
        new_confessions BOOLEAN DEFAULT true,
        marketing_notifications BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);

    // 4. Analytics sistemi tabloları
    console.log('\n📊 Analytics sistemi tabloları...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        activity_data JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_metrics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15, 2) NOT NULL,
        metric_data JSONB DEFAULT '{}',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        total_users INTEGER DEFAULT 0,
        new_users INTEGER DEFAULT 0,
        active_users INTEGER DEFAULT 0,
        total_messages INTEGER DEFAULT 0,
        total_confessions INTEGER DEFAULT 0,
        total_likes INTEGER DEFAULT 0,
        total_matches INTEGER DEFAULT 0,
        revenue DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date)
      );
    `);

    // 5. İndeksler oluştur
    console.log('\n📊 İndeksler oluşturuluyor...');
    
    // Confessions indeksleri
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_confessions_approved ON confessions(is_approved);
      CREATE INDEX IF NOT EXISTS idx_confession_likes_confession ON confession_likes(confession_id);
      CREATE INDEX IF NOT EXISTS idx_confession_likes_user ON confession_likes(user_id);
    `);

    // Friend suggestions indeksleri
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_likes_user ON user_likes(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_likes_liked ON user_likes(liked_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_likes_created_at ON user_likes(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_user_passes_user ON user_passes(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_passes_passed ON user_passes(passed_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_passes_created_at ON user_passes(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_user_blocks_user ON user_blocks(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_blocks_created_at ON user_blocks(created_at);
    `);

    // Push notification indeksleri
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);
      CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);
      
      CREATE INDEX IF NOT EXISTS idx_push_notification_history_user ON push_notification_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_notification_history_status ON push_notification_history(status);
      CREATE INDEX IF NOT EXISTS idx_push_notification_history_sent_at ON push_notification_history(sent_at);
      
      CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);
    `);

    // Analytics indeksleri
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
      CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_app_metrics_name ON app_metrics(metric_name);
      CREATE INDEX IF NOT EXISTS idx_app_metrics_recorded_at ON app_metrics(recorded_at);
      
      CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
    `);

    console.log('\n🎉 Tüm yeni tablolar başarıyla oluşturuldu!');
    console.log('\n📋 Oluşturulan tablolar:');
    console.log('  ✅ confessions');
    console.log('  ✅ confession_likes');
    console.log('  ✅ user_likes');
    console.log('  ✅ user_passes');
    console.log('  ✅ user_blocks');
    console.log('  ✅ push_tokens');
    console.log('  ✅ push_notification_history');
    console.log('  ✅ notification_settings');
    console.log('  ✅ user_activities');
    console.log('  ✅ app_metrics');
    console.log('  ✅ daily_stats');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Tablolar oluşturulurken hata:', error);
    process.exit(1);
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  addAllNewTables();
}

module.exports = addAllNewTables;
