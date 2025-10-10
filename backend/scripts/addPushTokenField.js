const { pool } = require('../config/database');

async function addPushTokenField() {
  try {
    console.log('Push token alanı ekleniyor...');

    // Users tablosuna push_token alanını ekle
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS push_token TEXT
    `);

    console.log('✅ Push token alanı başarıyla eklendi');

    // Index ekle (opsiyonel - performans için)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_push_token 
      ON users(push_token) 
      WHERE push_token IS NOT NULL
    `);

    console.log('✅ Push token index başarıyla eklendi');

  } catch (error) {
    console.error('❌ Push token alanı eklenirken hata:', error);
  } finally {
    await pool.end();
  }
}

addPushTokenField();
