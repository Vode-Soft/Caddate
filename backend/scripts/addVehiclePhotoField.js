const { pool } = require('../config/database');

async function addVehiclePhotoField() {
  try {
    console.log('📸 Araç fotoğrafı alanı ekleniyor...');

    // Araç fotoğrafı alanını ekle
    const addPhotoFieldQuery = `
      ALTER TABLE user_vehicles 
      ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
    `;

    await pool.query(addPhotoFieldQuery);
    console.log('✅ Araç fotoğrafı alanı eklendi');

    // Fotoğraf URL index'i ekle
    const addPhotoIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_user_vehicles_photo ON user_vehicles(photo_url) WHERE photo_url IS NOT NULL;
    `;

    await pool.query(addPhotoIndexQuery);
    console.log('✅ Araç fotoğrafı index\'i eklendi');

    console.log('🎉 Araç fotoğrafı alanı başarıyla eklendi!');
  } catch (error) {
    console.error('❌ Araç fotoğrafı alanı eklenirken hata:', error);
    throw error;
  }
}

// Script çalıştırılırsa
if (require.main === module) {
  addVehiclePhotoField()
    .then(() => {
      console.log('✅ Script başarıyla tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script hatası:', error);
      process.exit(1);
    });
}

module.exports = addVehiclePhotoField;
