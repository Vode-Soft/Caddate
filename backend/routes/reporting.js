const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const reportingController = require('../controllers/reportingController');

// Kullanıcı şikayeti oluştur
router.post('/report-user', auth, async (req, res) => {
  try {
    const { reportedUserId, reportType, description, evidence } = req.body;
    const reporterId = req.user.id;

    if (!reportedUserId || !reportType) {
      return res.status(400).json({
        success: false,
        message: 'Şikayet edilecek kullanıcı ve şikayet türü gerekli'
      });
    }

    if (reporterId === parseInt(reportedUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Kendinizi şikayet edemezsiniz'
      });
    }

    const result = await reportingController.createReport(
      reporterId, 
      reportedUserId, 
      reportType, 
      description, 
      evidence
    );

    res.json({
      success: result.success,
      message: result.message,
      reportId: result.reportId,
      autoAction: result.autoAction
    });

  } catch (error) {
    console.error('Report user error:', error);
    res.status(500).json({
      success: false,
      message: 'Şikayet oluşturulamadı'
    });
  }
});

// Şikayet listesi (admin)
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const { status = 'all', limit = 50, offset = 0 } = req.query;
    
    const result = await reportingController.getReports(status, parseInt(limit), parseInt(offset));
    
    res.json({
      success: result.success,
      data: result.reports,
      total: result.total
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Şikayetler alınamadı'
    });
  }
});

// Şikayet çözümle (admin)
router.post('/resolve-report/:reportId', adminAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { resolution, action } = req.body;
    const adminId = req.user.id;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'Çözüm açıklaması gerekli'
      });
    }

    const result = await reportingController.resolveReport(
      reportId, 
      adminId, 
      resolution, 
      action
    );

    res.json({
      success: result.success,
      message: result.message,
      resolution: result.resolution
    });

  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({
      success: false,
      message: 'Şikayet çözümlenemedi'
    });
  }
});

// Kullanıcı şikayet istatistikleri
router.get('/user-stats/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await reportingController.getUserReportStats(userId);
    
    res.json({
      success: result.success,
      data: result.stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınamadı'
    });
  }
});

// Spam tespit algoritması
router.get('/spam-detection/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await reportingController.detectSpamPatterns(userId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Spam detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Spam tespiti yapılamadı'
    });
  }
});

// Kullanıcı yasakları listesi
router.get('/bans', adminAuth, async (req, res) => {
  try {
    const { status = 'active', limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    let queryParams = [limit, offset];

    if (status === 'active') {
      whereClause = 'WHERE ub.is_active = true AND (ub.expires_at IS NULL OR ub.expires_at > NOW())';
    } else if (status === 'expired') {
      whereClause = 'WHERE ub.is_active = true AND ub.expires_at IS NOT NULL AND ub.expires_at <= NOW()';
    }

    const query = `
      SELECT 
        ub.id,
        ub.reason,
        ub.ban_type,
        ub.expires_at,
        ub.created_at,
        u.first_name,
        u.last_name,
        u.email,
        admin.first_name as admin_name,
        admin.last_name as admin_last_name
      FROM user_bans ub
      JOIN users u ON ub.user_id = u.id
      LEFT JOIN users admin ON ub.created_by = admin.id
      ${whereClause}
      ORDER BY ub.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, queryParams);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get bans error:', error);
    res.status(500).json({
      success: false,
      message: 'Yasaklar alınamadı'
    });
  }
});

// Kullanıcıyı yasakla (admin)
router.post('/ban-user', adminAuth, async (req, res) => {
  try {
    const { userId, reason, banType, duration } = req.body;
    const adminId = req.user.id;

    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID ve sebep gerekli'
      });
    }

    const expiresAt = banType === 'permanent' ? null : 
                     duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : 
                     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(`
      INSERT INTO user_bans (user_id, reason, ban_type, created_by, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [userId, reason, banType, adminId, expiresAt]);

    // Kullanıcıyı deaktif et
    await db.query(`
      UPDATE users SET is_active = false WHERE id = $1
    `, [userId]);

    res.json({
      success: true,
      message: 'Kullanıcı yasaklandı',
      banType: banType,
      expiresAt: expiresAt
    });

  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı yasaklanamadı'
    });
  }
});

// Yasak kaldır (admin)
router.post('/unban-user/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;

    // Aktif yasakları kaldır
    await db.query(`
      UPDATE user_bans 
      SET is_active = false, updated_by = $2, updated_at = NOW()
      WHERE user_id = $1 AND is_active = true
    `, [userId, adminId]);

    // Kullanıcıyı aktif et
    await db.query(`
      UPDATE users SET is_active = true WHERE id = $1
    `, [userId]);

    res.json({
      success: true,
      message: 'Kullanıcı yasağı kaldırıldı'
    });

  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Yasak kaldırılamadı'
    });
  }
});

module.exports = router;
