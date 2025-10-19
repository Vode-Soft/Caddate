const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

// PostgreSQL'e bağlan (veritabanı olmadan)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: 'postgres', // Varsayılan postgres veritabanına bağlan
});

async function createTestDatabase() {
  try {
    console.log('🔄 Test veritabanı oluşturuluyor...');
    
    // Test veritabanının var olup olmadığını kontrol et
    const checkDb = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      ['caddate_test_db']
    );
    
    if (checkDb.rows.length > 0) {
      console.log('✅ Test veritabanı zaten mevcut!');
    } else {
      // Test veritabanını oluştur
      await pool.query(`CREATE DATABASE caddate_test_db`);
      console.log('✅ Test veritabanı başarıyla oluşturuldu!');
    }
    
  } catch (error) {
    console.error('❌ Test veritabanı oluşturma hatası:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Test veritabanını oluştur
createTestDatabase();
