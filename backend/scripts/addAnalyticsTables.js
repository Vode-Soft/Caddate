const { pool } = require('../config/database');

async function addAnalyticsTables() {
  try {
    console.log('📊 Analytics sistemi tabloları oluşturuluyor...');

    // User activities tablosu
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
    console.log('✅ user_activities tablosu oluşturuldu');

    // App metrics tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_metrics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15, 2) NOT NULL,
        metric_data JSONB DEFAULT '{}',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ app_metrics tablosu oluşturuldu');

    // Daily stats tablosu
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
    console.log('✅ daily_stats tablosu oluşturuldu');

    // İndeksler
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
      CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_app_metrics_name ON app_metrics(metric_name);
      CREATE INDEX IF NOT EXISTS idx_app_metrics_recorded_at ON app_metrics(recorded_at);
      
      CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
    `);
    console.log('✅ İndeksler oluşturuldu');

    console.log('🎉 Analytics sistemi tabloları başarıyla eklendi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Analytics sistemi tabloları eklenirken hata:', error);
    process.exit(1);
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  addAnalyticsTables();
}

module.exports = addAnalyticsTables;
