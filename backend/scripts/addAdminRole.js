const { pool } = require('../config/database');

const addAdminRole = async () => {
  try {
    console.log('🔧 Admin rolü ekleniyor...');

    // 1. Users tablosuna role ve admin_level kolonlarını ekle
    const addRoleColumn = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));
    `;

    const addAdminLevelColumn = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0;
    `;

    await pool.query(addRoleColumn);
    console.log('✅ Role kolonu eklendi');

    await pool.query(addAdminLevelColumn);
    console.log('✅ Admin level kolonu eklendi');

    // 2. Index ekle
    const createRoleIndex = `
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `;

    await pool.query(createRoleIndex);
    console.log('✅ Role index\'i eklendi');

    // 3. İlk admin kullanıcısı oluştur (email ile arama yap, varsa admin yap)
    const createAdminQuery = `
      UPDATE users 
      SET role = 'super_admin', admin_level = 100 
      WHERE email = $1 
      RETURNING id, email, first_name, last_name, role, admin_level;
    `;

    // Buraya kendi admin email adresinizi yazın
    const adminEmail = 'kerim5781@gmail.com';
    
    const result = await pool.query(createAdminQuery, [adminEmail]);

    if (result.rows.length > 0) {
      console.log('✅ Admin kullanıcısı güncellendi:', result.rows[0]);
    } else {
      console.log('⚠️  Admin email adresi bulunamadı. Lütfen önce bu email ile kayıt olun.');
      console.log(`   Email: ${adminEmail}`);
    }

    console.log('🎉 Admin role sistemi başarıyla eklendi!');
    console.log('\n📝 Notlar:');
    console.log('   - role: user, admin, super_admin');
    console.log('   - admin_level: 0 (user), 50 (admin), 100 (super_admin)');
    console.log(`   - İlk admin email: ${adminEmail}`);
    console.log('   - Daha fazla admin eklemek için bu email ile giriş yapın\n');

  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    pool.end();
  }
};

addAdminRole();

