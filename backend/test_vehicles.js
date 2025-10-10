const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '2580',
  database: process.env.DB_NAME || 'caddate_db',
});

async function testVehicles() {
  try {
    console.log('Veritabanına bağlanıyor...');
    
    // Tüm araçları getir
    const result = await pool.query(`
      SELECT 
        uv.id, 
        uv.user_id,
        uv.plate_number, 
        uv.brand, 
        uv.model,
        uv.photo_url,
        uv.is_primary,
        uv.created_at,
        u.first_name,
        u.last_name,
        u.email
      FROM user_vehicles uv
      LEFT JOIN users u ON uv.user_id = u.id
      ORDER BY uv.id
    `);
    
    console.log('Toplam araç sayısı:', result.rows.length);
    console.log('Araçlar:');
    result.rows.forEach(vehicle => {
      console.log(`- ID: ${vehicle.id}, User ID: ${vehicle.user_id}, Plaka: ${vehicle.plate_number}, Marka: ${vehicle.brand} ${vehicle.model}, Fotoğraf: ${vehicle.photo_url || 'Yok'}, Ana Araç: ${vehicle.is_primary}, Sahip: ${vehicle.first_name} ${vehicle.last_name} (${vehicle.email})`);
    });
    
    // Kullanıcı ID 5'in araçlarını getir
    const user5Result = await pool.query(`
      SELECT 
        uv.id, 
        uv.plate_number, 
        uv.brand, 
        uv.model,
        uv.photo_url,
        uv.is_primary
      FROM user_vehicles uv
      WHERE uv.user_id = 5
      ORDER BY uv.id
    `);
    
    console.log('\nKullanıcı ID 5\'in araç sayısı:', user5Result.rows.length);
    console.log('Kullanıcı ID 5\'in araçları:');
    user5Result.rows.forEach(vehicle => {
      console.log(`- ID: ${vehicle.id}, Plaka: ${vehicle.plate_number}, Marka: ${vehicle.brand} ${vehicle.model}, Fotoğraf: ${vehicle.photo_url || 'Yok'}, Ana Araç: ${vehicle.is_primary}`);
    });
    
    // ID 4 olan aracı kontrol et
    const vehicle4Result = await pool.query(`
      SELECT 
        uv.id, 
        uv.user_id,
        uv.plate_number, 
        uv.brand, 
        uv.model,
        uv.photo_url,
        uv.is_primary,
        u.first_name,
        u.last_name,
        u.email
      FROM user_vehicles uv
      LEFT JOIN users u ON uv.user_id = u.id
      WHERE uv.id = 4
    `);
    
    console.log('\nID 4 olan araç:');
    if (vehicle4Result.rows.length > 0) {
      const vehicle = vehicle4Result.rows[0];
      console.log(`- ID: ${vehicle.id}, User ID: ${vehicle.user_id}, Plaka: ${vehicle.plate_number}, Marka: ${vehicle.brand} ${vehicle.model}, Fotoğraf: ${vehicle.photo_url || 'Yok'}, Ana Araç: ${vehicle.is_primary}, Sahip: ${vehicle.first_name} ${vehicle.last_name} (${vehicle.email})`);
    } else {
      console.log('ID 4 olan araç bulunamadı!');
    }
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await pool.end();
  }
}

testVehicles();
