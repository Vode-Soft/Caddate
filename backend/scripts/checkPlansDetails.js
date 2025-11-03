const { pool } = require('../config/database');

const checkPlansDetails = async () => {
  try {
    console.log('🔍 Plan detayları kontrol ediliyor...\n');

    const query = `
      SELECT 
        id,
        name_tr,
        price,
        duration_days,
        is_active,
        is_popular,
        display_order,
        features,
        CASE 
          WHEN features IS NULL THEN 'NULL'
          WHEN features::text = '{}' THEN 'BOŞ'
          ELSE 'DOLU'
        END as features_status
      FROM subscription_plans
      ORDER BY display_order ASC, price ASC
      LIMIT 10
    `;

    const result = await pool.query(query);
    
    console.log(`📊 Toplam ${result.rows.length} plan bulundu:\n`);
    
    result.rows.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name_tr}`);
      console.log(`   ID: ${plan.id}`);
      console.log(`   Fiyat: ${plan.price}₺`);
      console.log(`   Süre: ${plan.duration_days} gün`);
      console.log(`   Aktif: ${plan.is_active ? '✅' : '❌'}`);
      console.log(`   Popüler: ${plan.is_popular ? '⭐' : '○'}`);
      console.log(`   Sıralama: ${plan.display_order}`);
      console.log(`   Features: ${plan.features_status}`);
      if (plan.features && typeof plan.features === 'object') {
        const featureCount = Object.keys(plan.features).length;
        console.log(`   Özellik sayısı: ${featureCount}`);
      }
      console.log('');
    });

    // Aktif plan sayısı
    const activeCount = result.rows.filter(p => p.is_active).length;
    console.log(`\n✅ Aktif plan sayısı: ${activeCount}/${result.rows.length}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await pool.end();
  }
};

checkPlansDetails();

