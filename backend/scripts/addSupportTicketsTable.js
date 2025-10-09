const pool = require('../config/database');

async function addSupportTicketsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Destek talepleri tablosu oluşturuluyor...');

    // Support tickets tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        admin_response TEXT,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        responded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // İndeksler
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
    `);

    console.log('✅ Destek talepleri tablosu başarıyla oluşturuldu!');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  addSupportTicketsTable()
    .then(() => {
      console.log('Migration tamamlandı!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration başarısız:', error);
      process.exit(1);
    });
}

module.exports = addSupportTicketsTable;

