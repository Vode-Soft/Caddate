const { pool } = require('../config/database');

async function createConfessionsTable() {
  try {
    console.log('🚀 Creating confessions table...');
    
    // Confessions tablosunu oluştur
    await pool.query(`
      CREATE TABLE IF NOT EXISTS confessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT true,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        is_approved BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Confessions table created successfully');
    
    // İndeksleri oluştur
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_confessions_approved ON confessions(is_approved);
    `);
    
    console.log('✅ Indexes created successfully');
    
    // Confession likes tablosunu oluştur
    await pool.query(`
      CREATE TABLE IF NOT EXISTS confession_likes (
        id SERIAL PRIMARY KEY,
        confession_id INTEGER REFERENCES confessions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(confession_id, user_id)
      );
    `);
    
    console.log('✅ Confession likes table created successfully');
    
    // Test verisi ekle
    const testResult = await pool.query(`
      INSERT INTO confessions (user_id, content, is_anonymous, is_approved) 
      VALUES (1, 'Bu bir test itirafıdır.', true, true)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    
    if (testResult.rows.length > 0) {
      console.log('✅ Test confession added with ID:', testResult.rows[0].id);
    } else {
      console.log('ℹ️ Test confession already exists');
    }
    
    // Tabloları kontrol et
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('confessions', 'confession_likes')
      ORDER BY table_name;
    `);
    
    console.log('📋 Created tables:', tableCheck.rows.map(row => row.table_name));
    
    console.log('🎉 Confessions setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating confessions table:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
  } finally {
    await pool.end();
  }
}

createConfessionsTable();
