const { pool } = require('../config/database');

async function addVehicleTable() {
  try {
    console.log('🚗 Araç bilgileri tablosu oluşturuluyor...');

    // Araç bilgileri tablosu
    const createVehicleTableQuery = `
      CREATE TABLE IF NOT EXISTS user_vehicles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plate_number VARCHAR(20) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INTEGER,
        color VARCHAR(50),
        fuel_type VARCHAR(20) CHECK (fuel_type IN ('benzin', 'dizel', 'hibrit', 'elektrik', 'lpg', 'diğer')),
        engine_volume VARCHAR(20),
        additional_info TEXT,
        is_primary BOOLEAN DEFAULT false,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, plate_number)
      );
    `;

    await pool.query(createVehicleTableQuery);
    console.log('✅ Araç bilgileri tablosu oluşturuldu');

    // Indexler
    const createIndexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_user_vehicles_user_id ON user_vehicles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_vehicles_plate ON user_vehicles(plate_number);
      CREATE INDEX IF NOT EXISTS idx_user_vehicles_primary ON user_vehicles(user_id, is_primary);
      CREATE INDEX IF NOT EXISTS idx_user_vehicles_created_at ON user_vehicles(created_at);
    `;

    await pool.query(createIndexesQuery);
    console.log('✅ Araç bilgileri indexleri oluşturuldu');

    // Trigger fonksiyonu
    const createTriggerQuery = `
      CREATE TRIGGER update_user_vehicles_updated_at BEFORE UPDATE ON user_vehicles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    await pool.query(createTriggerQuery);
    console.log('✅ Araç bilgileri trigger\'ı oluşturuldu');

    console.log('🎉 Araç bilgileri tablosu başarıyla oluşturuldu!');
  } catch (error) {
    console.error('❌ Araç bilgileri tablosu oluşturulurken hata:', error);
    throw error;
  }
}

// Script çalıştırılırsa
if (require.main === module) {
  addVehicleTable()
    .then(() => {
      console.log('✅ Script başarıyla tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script hatası:', error);
      process.exit(1);
    });
}

module.exports = addVehicleTable;
