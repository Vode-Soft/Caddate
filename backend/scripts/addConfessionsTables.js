const { pool } = require('../config/database');

async function addConfessionsTables() {
  try {
    console.log('📝 İtiraf sistemi tabloları oluşturuluyor...');

    // Confessions tablosu
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
    console.log('✅ confessions tablosu oluşturuldu');

    // Confession likes tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS confession_likes (
        id SERIAL PRIMARY KEY,
        confession_id INTEGER REFERENCES confessions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(confession_id, user_id)
      );
    `);
    console.log('✅ confession_likes tablosu oluşturuldu');

    // İndeksler
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_confessions_approved ON confessions(is_approved);
      CREATE INDEX IF NOT EXISTS idx_confession_likes_confession ON confession_likes(confession_id);
      CREATE INDEX IF NOT EXISTS idx_confession_likes_user ON confession_likes(user_id);
    `);
    console.log('✅ İndeksler oluşturuldu');

    console.log('🎉 İtiraf sistemi tabloları başarıyla eklendi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ İtiraf sistemi tabloları eklenirken hata:', error);
    process.exit(1);
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  addConfessionsTables();
}

module.exports = addConfessionsTables;
