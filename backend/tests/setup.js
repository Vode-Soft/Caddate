const { Pool } = require('pg');

// Test ortamında server'ı başlatma
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Port 0 = random port

// Test veritabanı bağlantısı
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'caddate_test_db'
};

// Test veritabanı pool'u
global.testPool = new Pool(testDbConfig);

// Test veritabanını temizle
beforeAll(async () => {
  try {
    // Önce postgres veritabanına bağlan
    const postgresPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: 'postgres'
    });
    
    const client = await postgresPool.connect();
    
    // Test veritabanını oluştur (yoksa)
    await client.query(`CREATE DATABASE ${testDbConfig.database};`).catch(() => {});
    
    await client.release();
    await postgresPool.end();
    
    // Test veritabanına bağlan ve tabloları oluştur
    const testClient = await global.testPool.connect();
    try {
      // Schema dosyasını oku ve çalıştır
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await testClient.query(schema);
        console.log('✅ Test veritabanı tabloları oluşturuldu');
      }
    } catch (error) {
      console.warn('⚠️ Test veritabanı tabloları oluşturulamadı:', error.message);
    } finally {
      await testClient.release();
    }
  } catch (error) {
    console.warn('Test veritabanı oluşturulamadı:', error.message);
  }
});

// Her test sonrası veritabanını temizle
afterEach(async () => {
  try {
    const client = await global.testPool.connect();
    
    // Tüm tabloları temizle
    await client.query('TRUNCATE TABLE users, messages, photos, matches, friendships, email_verifications, photo_likes, photo_comments, activities, security_history, notifications, profile_visits, follows, location_history RESTART IDENTITY CASCADE;');
    
    await client.release();
  } catch (error) {
    console.warn('Test veritabanı temizlenemedi:', error.message);
  }
});

// Tüm testler sonrası bağlantıyı kapat
afterAll(async () => {
  await global.testPool.end();
});

// Global test utilities
global.testUtils = {
  // Test kullanıcısı oluştur
  createTestUser: async (userData = {}) => {
    const defaultUser = {
      email: 'test@example.com',
      password: 'testpassword123',
      first_name: 'Test',
      last_name: 'User',
      birth_date: '1990-01-01',
      gender: 'male'
    };
    
    const user = { ...defaultUser, ...userData };
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    const client = await global.testPool.connect();
    try {
      const result = await client.query(
        'INSERT INTO users (email, password, first_name, last_name, birth_date, gender) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [user.email, hashedPassword, user.first_name, user.last_name, user.birth_date, user.gender]
      );
      return result.rows[0];
    } finally {
      await client.release();
    }
  },
  
  // Test token oluştur
  createTestToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  },
  
  // Test veritabanı bağlantısı
  getTestDb: () => global.testPool
};
