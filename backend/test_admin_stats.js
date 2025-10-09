const { pool } = require('./config/database');

async function testStats() {
  try {
    console.log('🔍 Testing database queries...\n');

    // 1. Kullanıcıları kontrol et
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ Kullanıcı sayısı:', users.rows[0].count);

    // 2. Kullanıcı detaylarını göster
    const userDetails = await pool.query(`
      SELECT id, email, first_name, last_name, is_active, role, admin_level 
      FROM users 
      LIMIT 5
    `);
    console.log('\n📋 Kullanıcılar:');
    console.table(userDetails.rows);

    // 3. Kolonları kontrol et
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('role', 'admin_level', 'is_premium', 'deleted_at')
    `);
    console.log('\n📊 Users tablosu kolonları:');
    console.table(columns.rows);

    // 4. Dashboard stats sorgusunu test et
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_month
      FROM users
      WHERE deleted_at IS NULL
    `);
    console.log('\n📈 Dashboard Stats:');
    console.table(stats.rows);

    // 5. Diğer tabloları kontrol et
    const photos = await pool.query('SELECT COUNT(*) as count FROM photos');
    const messages = await pool.query('SELECT COUNT(*) as count FROM messages');
    const vehicles = await pool.query('SELECT COUNT(*) as count FROM user_vehicles');
    const security = await pool.query('SELECT COUNT(*) as count FROM security_history');

    console.log('\n📦 Diğer Tablolar:');
    console.log('Fotoğraflar:', photos.rows[0].count);
    console.log('Mesajlar:', messages.rows[0].count);
    console.log('Araçlar:', vehicles.rows[0].count);
    console.log('Güvenlik Olayları:', security.rows[0].count);

    console.log('\n✅ Test tamamlandı!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testStats();

