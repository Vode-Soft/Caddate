const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '2580',
  database: process.env.DB_NAME || 'caddate_db',
});

async function checkVehicles() {
  try {
    console.log('Veritabanına bağlanıyor...');
    
    // Kullanıcı ID 5'in araçlarını getir
    const result = await pool.query(`
      SELECT 
        uv.id, 
        uv.user_id,
        uv.plate_number, 
        uv.brand, 
        uv.model,
        uv.photo_url,
        uv.is_primary,
        uv.created_at
      FROM user_vehicles uv
      WHERE uv.user_id = 5
      ORDER BY uv.id
    `);
    
    console.log('Kullanıcı ID 5\'in araç sayısı:', result.rows.length);
    console.log('Kullanıcı ID 5\'in araçları:');
    result.rows.forEach(vehicle => {
      console.log(`- ID: ${vehicle.id}, Plaka: ${vehicle.plate_number}, Marka: ${vehicle.brand} ${vehicle.model}, Fotoğraf: ${vehicle.photo_url || 'Yok'}, Ana Araç: ${vehicle.is_primary}, Oluşturulma: ${vehicle.created_at}`);
    });
    
    // ID 3 olan aracı kontrol et
    const vehicle3Result = await pool.query(`
      SELECT 
        uv.id, 
        uv.user_id,
        uv.plate_number, 
        uv.brand, 
        uv.model,
        uv.photo_url,
        uv.is_primary
      FROM user_vehicles uv
      WHERE uv.id = 3
    `);
    
    console.log('\nID 3 olan araç:');
    if (vehicle3Result.rows.length > 0) {
      const vehicle = vehicle3Result.rows[0];
      console.log(`- ID: ${vehicle.id}, User ID: ${vehicle.user_id}, Plaka: ${vehicle.plate_number}, Marka: ${vehicle.brand} ${vehicle.model}, Fotoğraf: ${vehicle.photo_url || 'Yok'}, Ana Araç: ${vehicle.is_primary}`);
      console.log(`- Bu araç kullanıcı ID ${vehicle.user_id}'ye ait`);
    } else {
      console.log('ID 3 olan araç bulunamadı!');
    }
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await pool.end();
  }
}

checkVehicles();
