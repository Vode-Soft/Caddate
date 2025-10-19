const { Pool } = require('pg');

// Veritabanı bağlantı ayarları - Render.com için optimize edildi
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'caddate_db',
  max: 10, // Render.com için düşürüldü
  min: 2, // Minimum bağlantı sayısı
  idleTimeoutMillis: 60000, // 1 dakika - Render.com için artırıldı
  connectionTimeoutMillis: 10000, // 10 saniye - Render.com için artırıldı
  acquireTimeoutMillis: 15000, // 15 saniye - Yeni bağlantı alma timeout
  createTimeoutMillis: 10000, // 10 saniye - Bağlantı oluşturma timeout
  destroyTimeoutMillis: 5000, // 5 saniye - Bağlantı kapatma timeout
  reapIntervalMillis: 1000, // 1 saniye - Boşta kalan bağlantıları temizleme aralığı
  createRetryIntervalMillis: 200, // 200ms - Bağlantı oluşturma retry aralığı
  // SSL ayarları (Render.com için gerekli)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Keep-alive ayarları
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Bağlantı event handlers
pool.on('connect', (client) => {
  console.log('✅ PostgreSQL veritabanına bağlandı');
});

pool.on('error', (err, client) => {
  console.error('❌ PostgreSQL bağlantı hatası:', err);
  // Process.exit yerine graceful handling
  console.log('🔄 Bağlantı hatası işleniyor, uygulama devam ediyor...');
});

pool.on('remove', (client) => {
  console.log('🔌 PostgreSQL bağlantısı kaldırıldı');
});

// Connection health check fonksiyonu
const checkConnectionHealth = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Connection health check failed:', error.message);
    return false;
  }
};

// Retry mekanizması ile query wrapper
const executeQuery = async (query, params = [], retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error(`❌ Query attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Bağlantı hatası ise kısa bir süre bekle
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.message.includes('Connection terminated')) {
        console.log(`🔄 Retrying query in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      } else {
        throw error;
      }
    }
  }
};

// Veritabanı bağlantısını test et
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('🔍 Veritabanı bağlantısı test ediliyor...');
    const result = await client.query('SELECT NOW()');
    console.log('✅ Veritabanı bağlantısı başarılı:', result.rows[0].now);
    client.release();
  } catch (err) {
    console.error('❌ Veritabanı bağlantı testi başarısız:', err.message);
  }
};

module.exports = {
  pool,
  testConnection,
  checkConnectionHealth,
  executeQuery
};
