const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

// Veritabanı bağlantısı
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function updateSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Veritabanı şeması güncelleniyor...');

    // 1. photos tablosuna caption ve updated_at alanlarını ekle
    console.log('📸 Photos tablosu güncelleniyor...');
    await client.query(`
      ALTER TABLE photos 
      ADD COLUMN IF NOT EXISTS caption TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // 2. messages tablosuna updated_at alanını ekle
    console.log('💬 Messages tablosu güncelleniyor...');
    await client.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // 3. photo_comments tablosuna updated_at alanını ekle
    console.log('💭 Photo comments tablosu güncelleniyor...');
    await client.query(`
      ALTER TABLE photo_comments 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // 4. location_history tablosunu oluştur
    console.log('📍 Location history tablosu oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS location_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(8, 2),
        address VARCHAR(500),
        city VARCHAR(100),
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Indexleri ekle
    console.log('📊 Indexler ekleniyor...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_location_history_user ON location_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_location_history_created_at ON location_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_location_history_location ON location_history(latitude, longitude);
    `);

    // 6. Trigger'ları ekle
    console.log('⚡ Trigger\'lar ekleniyor...');
    
    // Trigger fonksiyonu oluştur (eğer yoksa)
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Photos tablosu için trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_photos_updated_at ON photos;
      CREATE TRIGGER update_photos_updated_at 
        BEFORE UPDATE ON photos
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Messages tablosu için trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
      CREATE TRIGGER update_messages_updated_at 
        BEFORE UPDATE ON messages
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Photo comments tablosu için trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_photo_comments_updated_at ON photo_comments;
      CREATE TRIGGER update_photo_comments_updated_at 
        BEFORE UPDATE ON photo_comments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Veritabanı şeması başarıyla güncellendi!');
    
  } catch (error) {
    console.error('❌ Veritabanı şeması güncellenirken hata oluştu:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Scripti çalıştır
if (require.main === module) {
  updateSchema()
    .then(() => {
      console.log('🎉 Migration tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration hatası:', error);
      process.exit(1);
    });
}

module.exports = updateSchema;
