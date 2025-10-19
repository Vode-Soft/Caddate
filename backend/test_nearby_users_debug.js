const { pool } = require('./config/database');

async function testNearbyUsersDebug() {
  try {
    console.log('🔍 Testing nearby users debug...');
    
    // 1. Konum paylaşımı açık olan kullanıcıları kontrol et
    console.log('\n📍 1. Checking users with location sharing enabled...');
    const usersWithLocationSharing = await pool.query(`
      SELECT 
        id, first_name, last_name, 
        location_latitude, location_longitude, 
        location_is_sharing, location_last_updated,
        is_active, email_verified
      FROM users 
      WHERE location_is_sharing = true 
        AND location_latitude IS NOT NULL 
        AND location_longitude IS NOT NULL
        AND is_active = true
      ORDER BY location_last_updated DESC 
      LIMIT 10
    `);
    
    console.log(`📍 Found ${usersWithLocationSharing.rows.length} users with location sharing enabled:`);
    usersWithLocationSharing.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.first_name} ${user.last_name} (ID: ${user.id})`);
      console.log(`     Location: ${user.location_latitude}, ${user.location_longitude}`);
      console.log(`     Last updated: ${user.location_last_updated}`);
      console.log(`     Active: ${user.is_active}, Verified: ${user.email_verified}`);
      console.log('');
    });
    
    // 2. Tüm aktif kullanıcıları kontrol et
    console.log('\n👥 2. Checking all active users...');
    const allActiveUsers = await pool.query(`
      SELECT 
        id, first_name, last_name, 
        location_latitude, location_longitude, 
        location_is_sharing, is_active, email_verified
      FROM users 
      WHERE is_active = true
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`👥 Found ${allActiveUsers.rows.length} active users:`);
    allActiveUsers.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.first_name} ${user.last_name} (ID: ${user.id})`);
      console.log(`     Location sharing: ${user.location_is_sharing}`);
      console.log(`     Has location: ${user.location_latitude ? 'Yes' : 'No'}`);
      console.log(`     Active: ${user.is_active}, Verified: ${user.email_verified}`);
      console.log('');
    });
    
    // 3. Konum paylaşımı istatistikleri
    console.log('\n📊 3. Location sharing statistics...');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN location_is_sharing = true THEN 1 END) as sharing_enabled,
        COUNT(CASE WHEN location_latitude IS NOT NULL AND location_longitude IS NOT NULL THEN 1 END) as has_location,
        COUNT(CASE WHEN location_is_sharing = true AND location_latitude IS NOT NULL AND location_longitude IS NOT NULL THEN 1 END) as sharing_with_location
      FROM users 
      WHERE is_active = true
    `);
    
    const stat = stats.rows[0];
    console.log(`📊 Total active users: ${stat.total_users}`);
    console.log(`📊 Location sharing enabled: ${stat.sharing_enabled}`);
    console.log(`📊 Has location data: ${stat.has_location}`);
    console.log(`📊 Sharing with location: ${stat.sharing_with_location}`);
    
    // 4. Son 24 saatte konum güncellenen kullanıcılar
    console.log('\n⏰ 4. Users with location updates in last 24 hours...');
    const recentUpdates = await pool.query(`
      SELECT 
        id, first_name, last_name, 
        location_last_updated,
        location_latitude, location_longitude
      FROM users 
      WHERE location_last_updated > NOW() - INTERVAL '24 hours'
        AND location_is_sharing = true
        AND location_latitude IS NOT NULL 
        AND location_longitude IS NOT NULL
      ORDER BY location_last_updated DESC 
      LIMIT 10
    `);
    
    console.log(`⏰ Found ${recentUpdates.rows.length} users with recent location updates:`);
    recentUpdates.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.first_name} ${user.last_name} (ID: ${user.id})`);
      console.log(`     Last updated: ${user.location_last_updated}`);
      console.log(`     Location: ${user.location_latitude}, ${user.location_longitude}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    // Pool'u kapatma - bu production'da sorun yaratabilir
    console.log('✅ Test completed');
  }
}

testNearbyUsersDebug();
