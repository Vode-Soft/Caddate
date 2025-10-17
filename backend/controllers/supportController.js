const pool = require('../config/database');

// Destek talebi oluştur
exports.createSupportTicket = async (req, res) => {
  try {
    const { category, message } = req.body;
    const userId = req.user.id;

    if (!category || !message) {
      return res.status(400).json({ 
        error: 'Kategori ve mesaj gereklidir' 
      });
    }

    // Tabloyu kontrol et ve yoksa oluştur
    await pool.query(`
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

    // İndeksleri oluştur
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
    `);

    // Destek talebini kaydet
    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, category, message) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [userId, category, message]
    );

    res.status(201).json({
      message: 'Destek talebiniz başarıyla oluşturuldu',
      ticket: result.rows[0]
    });
  } catch (error) {
    console.error('Destek talebi oluşturma hatası:', error);
    res.status(500).json({ 
      error: 'Destek talebi oluşturulurken bir hata oluştu' 
    });
  }
};

// Kullanıcının destek taleplerini listele
exports.getUserTickets = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM support_tickets 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Destek talepleri listeleme hatası:', error);
    res.status(500).json({ 
      error: 'Destek talepleri listelenirken bir hata oluştu' 
    });
  }
};

// Admin: Tüm destek taleplerini listele
exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    let query = `
      SELECT st.*, 
             u.first_name || ' ' || u.last_name as user_name,
             u.email as user_email,
             u.profile_picture as user_profile_picture
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND st.status = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      query += ` AND st.priority = $${params.length}`;
    }

    query += ` ORDER BY st.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Tüm destek talepleri listeleme hatası:', error);
    res.status(500).json({ 
      error: 'Destek talepleri listelenirken bir hata oluştu' 
    });
  }
};

// Admin: Destek talebini güncelle
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, admin_response } = req.body;
    const adminId = req.user.id;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      updates.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (admin_response) {
      updates.push(`admin_response = $${paramIndex}`);
      params.push(admin_response);
      paramIndex++;

      updates.push(`admin_id = $${paramIndex}`);
      params.push(adminId);
      paramIndex++;

      updates.push(`responded_at = CURRENT_TIMESTAMP`);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(id);
    const idParam = `$${paramIndex}`;

    const query = `
      UPDATE support_tickets 
      SET ${updates.join(', ')}
      WHERE id = ${idParam}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Destek talebi bulunamadı' 
      });
    }

    res.json({
      message: 'Destek talebi güncellendi',
      ticket: result.rows[0]
    });
  } catch (error) {
    console.error('Destek talebi güncelleme hatası:', error);
    res.status(500).json({ 
      error: 'Destek talebi güncellenirken bir hata oluştu' 
    });
  }
};

// Admin: Destek talebini sil
exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM support_tickets WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Destek talebi bulunamadı' 
      });
    }

    res.json({ 
      message: 'Destek talebi silindi' 
    });
  } catch (error) {
    console.error('Destek talebi silme hatası:', error);
    res.status(500).json({ 
      error: 'Destek talebi silinirken bir hata oluştu' 
    });
  }
};

// Admin: Destek talep istatistikleri
exports.getTicketStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'closed') as closed,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority
      FROM support_tickets
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Destek talep istatistikleri hatası:', error);
    res.status(500).json({ 
      error: 'İstatistikler alınırken bir hata oluştu' 
    });
  }
};
