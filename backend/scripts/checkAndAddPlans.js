const { pool } = require('../config/database');

const checkAndAddPlans = async () => {
  try {
    console.log('🔍 Planlar kontrol ediliyor...');

    // Önce mevcut planları kontrol et
    const checkQuery = 'SELECT COUNT(*) as count FROM subscription_plans WHERE is_active = true';
    const checkResult = await pool.query(checkQuery);
    const planCount = parseInt(checkResult.rows[0].count);

    console.log(`📊 Mevcut aktif plan sayısı: ${planCount}`);

    if (planCount > 0) {
      console.log('✅ Planlar zaten mevcut!');
      const plans = await pool.query('SELECT id, name_tr, price, duration_days, is_active FROM subscription_plans ORDER BY display_order');
      console.log('\n📋 Mevcut Planlar:');
      plans.rows.forEach(plan => {
        console.log(`   - ${plan.name_tr} (${plan.price}₺, ${plan.duration_days} gün)`);
      });
      return;
    }

    console.log('⚠️  Plan bulunamadı, planlar ekleniyor...');

    // Tablo yoksa oluştur
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        name_tr VARCHAR(100) NOT NULL,
        description TEXT,
        description_tr TEXT,
        price DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'TRY',
        duration_days INTEGER NOT NULL,
        features JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        is_popular BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);
    console.log('✅ subscription_plans tablosu kontrol edildi/oluşturuldu');

    // Planları ekle
    const insertPlansQuery = `
      INSERT INTO subscription_plans (name, name_tr, description, description_tr, price, duration_days, features, is_popular, display_order)
      VALUES 
        (
          'Basic Premium',
          'Temel Premium',
          'Essential features for casual users',
          'Günlük kullanıcılar için temel özellikler',
          49.90,
          30,
          '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": false, "unlimited_swipes": true, "rewind": false, "passport": false, "boost_per_month": 1}'::jsonb,
          false,
          1
        ),
        (
          'Gold Premium',
          'Altın Premium',
          'Advanced features for power users',
          'Aktif kullanıcılar için gelişmiş özellikler',
          99.90,
          30,
          '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "passport": false, "boost_per_month": 3, "super_like_per_day": 5, "priority_support": true}'::jsonb,
          true,
          2
        ),
        (
          'Platinum Premium',
          'Platin Premium',
          'All features unlocked',
          'Tüm özellikler açık',
          149.90,
          30,
          '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "passport": true, "boost_per_month": 10, "super_like_per_day": 10, "priority_support": true, "message_before_match": true, "priority_likes": true, "exclusive_badge": true}'::jsonb,
          false,
          3
        ),
        (
          '3 Month Gold',
          '3 Aylık Altın',
          '3 months of Gold Premium with discount',
          '3 ay Altın Premium indirimli',
          249.90,
          90,
          '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "passport": false, "boost_per_month": 3, "super_like_per_day": 5, "priority_support": true}'::jsonb,
          false,
          4
        ),
        (
          '6 Month Platinum',
          '6 Aylık Platin',
          '6 months of Platinum Premium - Best Value',
          '6 ay Platin Premium - En Avantajlı',
          699.90,
          180,
          '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "passport": true, "boost_per_month": 10, "super_like_per_day": 10, "priority_support": true, "message_before_match": true, "priority_likes": true, "exclusive_badge": true}'::jsonb,
          false,
          5
        )
      ON CONFLICT DO NOTHING
      RETURNING id, name_tr, price, duration_days;
    `;

    const result = await pool.query(insertPlansQuery);
    console.log(`✅ ${result.rows.length} plan başarıyla eklendi!`);
    
    console.log('\n📋 Eklenen Planlar:');
    result.rows.forEach(plan => {
      console.log(`   - ${plan.name_tr} (${plan.price}₺, ${plan.duration_days} gün)`);
    });

    console.log('\n🎉 Planlar başarıyla eklendi! Artık premium planlar görünecek.');

  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

checkAndAddPlans();

