const { pool } = require('../config/database');

async function addFriendSuggestionsTables() {
  try {
    console.log('👥 Arkadaş önerileri sistemi tabloları oluşturuluyor...');

    // User likes tablosu (beğeniler)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        liked_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, liked_user_id)
      );
    `);
    console.log('✅ user_likes tablosu oluşturuldu');

    // User passes tablosu (geçilen kullanıcılar)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_passes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        passed_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, passed_user_id)
      );
    `);
    console.log('✅ user_passes tablosu oluşturuldu');

    // User blocks tablosu (engellenen kullanıcılar)
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
    console.log('✅ user_blocks tablosu oluşturuldu');

    // İndeksler
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
    console.log('✅ İndeksler oluşturuldu');

    console.log('🎉 Arkadaş önerileri sistemi tabloları başarıyla eklendi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Arkadaş önerileri sistemi tabloları eklenirken hata:', error);
    process.exit(1);
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  addFriendSuggestionsTables();
}

module.exports = addFriendSuggestionsTables;
