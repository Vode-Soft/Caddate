const db = require('../config/database');

async function addVerificationTables() {
  try {
    console.log('🔐 Doğrulama tabloları ekleniyor...');

    // Users tablosuna doğrulama alanları ekle
    console.log('📝 Users tablosuna doğrulama alanları ekleniyor...');
    
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS verification_level INTEGER DEFAULT 0
    `);

    // Telefon doğrulama tablosu oluştur
    console.log('📱 Telefon doğrulama tablosu oluşturuluyor...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS phone_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        phone_number VARCHAR(20) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    // Kullanıcı doğrulama geçmişi tablosu
    console.log('📊 Doğrulama geçmişi tablosu oluşturuluyor...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS verification_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        verification_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexler oluştur
    console.log('📊 Indexler oluşturuluyor...');
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_verifications_user ON phone_verifications(user_id)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_history_user ON verification_history(user_id)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_verification ON users(verification_level)
    `);

    // Mevcut kullanıcıların profil tamamlama oranını hesapla
    console.log('🔄 Mevcut kullanıcıların profil tamamlama oranı hesaplanıyor...');
    
    const users = await db.query(`
      SELECT id, first_name, last_name, birth_date, gender, 
             profile_picture, bio, location_latitude, location_longitude,
             phone_number, email
      FROM users
    `);

    for (const user of users.rows) {
      let completeness = 0;
      
      // Zorunlu alanlar
      if (user.first_name) completeness += 5;
      if (user.last_name) completeness += 5;
      if (user.birth_date) completeness += 5;
      if (user.gender) completeness += 5;
      if (user.email) completeness += 5;
      if (user.phone_number) completeness += 5;
      if (user.location_latitude && user.location_longitude) completeness += 10;

      // Opsiyonel alanlar
      if (user.profile_picture) completeness += 20;
      if (user.bio && user.bio.length > 10) completeness += 20;
      if (user.location_latitude && user.location_longitude) completeness += 20;

      await db.query(`
        UPDATE users 
        SET profile_completeness = $2 
        WHERE id = $1
      `, [user.id, completeness]);
    }

    console.log('✅ Doğrulama tabloları başarıyla eklendi!');
    console.log('📊 Eklenen özellikler:');
    console.log('   - Telefon doğrulama sistemi');
    console.log('   - Profil tamamlama takibi');
    console.log('   - Doğrulama seviyesi sistemi');
    console.log('   - Kullanıcı doğrulama geçmişi');

  } catch (error) {
    console.error('❌ Doğrulama tabloları eklenirken hata:', error);
    throw error;
  }
}

// Script çalıştırılırsa
if (require.main === module) {
  addVerificationTables()
    .then(() => {
      console.log('🎉 Doğrulama sistemi kurulumu tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Kurulum hatası:', error);
      process.exit(1);
    });
}

module.exports = addVerificationTables;
