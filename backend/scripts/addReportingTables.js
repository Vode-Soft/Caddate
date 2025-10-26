const db = require('../config/database');

async function addReportingTables() {
  try {
    console.log('📋 Raporlama tabloları ekleniyor...');

    // Kullanıcı şikayetleri tablosu
    console.log('📝 Kullanıcı şikayetleri tablosu oluşturuluyor...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        report_type VARCHAR(50) NOT NULL,
        description TEXT,
        evidence JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        resolved_by INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP NULL,
        resolution TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Kullanıcı yasakları tablosu
    console.log('🚫 Kullanıcı yasakları tablosu oluşturuluyor...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_bans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        ban_type VARCHAR(20) NOT NULL, -- 'auto', 'manual'
        created_by INTEGER REFERENCES users(id),
        expires_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Kullanıcı uyarıları tablosu
    console.log('⚠️ Kullanıcı uyarıları tablosu oluşturuluyor...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_warnings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Telefon doğrulama tablosu (eğer yoksa)
    console.log('📱 Telefon doğrulama tablosu kontrol ediliyor...');
    
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

    // Indexler oluştur
    console.log('📊 Indexler oluşturuluyor...');
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(is_active)
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON user_warnings(user_id)
    `);

    // Şikayet türleri enum değerleri
    console.log('📋 Şikayet türleri tanımlanıyor...');
    
    const reportTypes = [
      'spam',
      'harassment', 
      'fake_profile',
      'inappropriate_content',
      'underage',
      'scam',
      'other'
    ];

    // Her şikayet türü için örnek veri ekle (isteğe bağlı)
    console.log('📊 Örnek şikayet türleri kaydediliyor...');
    
    for (const type of reportTypes) {
      await db.query(`
        INSERT INTO report_types (type_name, description, severity)
        VALUES ($1, $2, $3)
        ON CONFLICT (type_name) DO NOTHING
      `, [
        type,
        `${type} şikayeti`,
        type === 'harassment' || type === 'underage' ? 'high' : 'medium'
      ]);
    }

    console.log('✅ Raporlama tabloları başarıyla eklendi!');
    console.log('📊 Eklenen özellikler:');
    console.log('   - Kullanıcı şikayet sistemi');
    console.log('   - Otomatik yasaklama sistemi');
    console.log('   - Admin yönetim paneli');
    console.log('   - Spam tespit algoritması');
    console.log('   - Telefon doğrulama sistemi');

  } catch (error) {
    console.error('❌ Raporlama tabloları eklenirken hata:', error);
    throw error;
  }
}

// Script çalıştırılırsa
if (require.main === module) {
  addReportingTables()
    .then(() => {
      console.log('🎉 Raporlama sistemi kurulumu tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Kurulum hatası:', error);
      process.exit(1);
    });
}

module.exports = addReportingTables;
