const { pool } = require('../config/database');

async function addPushNotificationTables() {
  try {
    console.log('🔔 Push notification sistemi tabloları oluşturuluyor...');

    // Push tokens tablosu
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
    console.log('✅ push_tokens tablosu oluşturuldu');

    // Push notification history tablosu
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
    console.log('✅ push_notification_history tablosu oluşturuldu');

    // Notification settings tablosu
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
    console.log('✅ notification_settings tablosu oluşturuldu');

    // İndeksler
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);
      CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);
      
      CREATE INDEX IF NOT EXISTS idx_push_notification_history_user ON push_notification_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_notification_history_status ON push_notification_history(status);
      CREATE INDEX IF NOT EXISTS idx_push_notification_history_sent_at ON push_notification_history(sent_at);
      
      CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);
    `);
    console.log('✅ İndeksler oluşturuldu');

    console.log('🎉 Push notification sistemi tabloları başarıyla eklendi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Push notification sistemi tabloları eklenirken hata:', error);
    process.exit(1);
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  addPushNotificationTables();
}

module.exports = addPushNotificationTables;
