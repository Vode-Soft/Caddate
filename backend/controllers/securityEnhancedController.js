const { pool } = require('../config/database');

// Güvenlik istatistiklerini getir
exports.getSecurityStats = async (req, res) => {
  try {
    const { dateRange = '7days' } = req.query;
    
    // Tarih aralığını hesapla
    let interval = '7 days';
    switch(dateRange) {
      case '24hours':
        interval = '24 hours';
        break;
      case '30days':
        interval = '30 days';
        break;
      case '90days':
        interval = '90 days';
        break;
      default:
        interval = '7 days';
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE activity_type = 'login_failed') as failed_logins,
        COUNT(*) FILTER (WHERE activity_type = 'suspicious_activity') as suspicious_activities,
        COUNT(*) FILTER (WHERE activity_type = 'login_success') as successful_logins,
        COUNT(*) FILTER (WHERE activity_type = 'account_banned') as banned_accounts
      FROM security_history
      WHERE created_at >= NOW() - INTERVAL '${interval}'
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    // Önceki dönem ile karşılaştırma
    const previousPeriodQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE activity_type = 'login_failed') as failed_logins_prev,
        COUNT(*) FILTER (WHERE activity_type = 'suspicious_activity') as suspicious_activities_prev
      FROM security_history
      WHERE created_at >= NOW() - INTERVAL '${interval}' * 2
        AND created_at < NOW() - INTERVAL '${interval}'
    `;

    const prevResult = await pool.query(previousPeriodQuery);
    const prevStats = prevResult.rows[0];

    // Trend hesaplama
    const calculateTrend = (current, previous) => {
      if (previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    res.json({
      success: true,
      stats: {
        ...stats,
        trends: {
          failedLogins: calculateTrend(parseInt(stats.failed_logins), parseInt(prevStats.failed_logins_prev)),
          suspiciousActivities: calculateTrend(parseInt(stats.suspicious_activities), parseInt(prevStats.suspicious_activities_prev))
        }
      }
    });
  } catch (error) {
    console.error('Get security stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Güvenlik istatistikleri yüklenirken hata oluştu'
    });
  }
};

// IP bazlı güvenlik raporu
exports.getIPReport = async (req, res) => {
  try {
    const query = `
      SELECT 
        ip_address,
        COUNT(*) as event_count,
        COUNT(*) FILTER (WHERE activity_type = 'login_failed') as failed_attempts,
        COUNT(*) FILTER (WHERE activity_type = 'suspicious_activity') as suspicious_count,
        MAX(created_at) as last_seen,
        json_agg(DISTINCT user_id) as user_ids
      FROM security_history
      WHERE ip_address IS NOT NULL
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY ip_address
      HAVING COUNT(*) FILTER (WHERE activity_type = 'login_failed') > 5
      ORDER BY failed_attempts DESC
      LIMIT 50
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      suspiciousIPs: result.rows
    });
  } catch (error) {
    console.error('Get IP report error:', error);
    res.status(500).json({
      success: false,
      message: 'IP raporu yüklenirken hata oluştu'
    });
  }
};

// Güvenlik timeline (son aktiviteler)
exports.getSecurityTimeline = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const query = `
      SELECT 
        sh.*,
        u.email,
        u.first_name,
        u.last_name
      FROM security_history sh
      LEFT JOIN users u ON sh.user_id = u.id
      WHERE sh.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY sh.created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    res.json({
      success: true,
      timeline: result.rows
    });
  } catch (error) {
    console.error('Get security timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Güvenlik timeline yüklenirken hata oluştu'
    });
  }
};

// Kullanıcı bazlı güvenlik raporu
exports.getUserSecurityReport = async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT 
        activity_type,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence,
        json_agg(DISTINCT ip_address) FILTER (WHERE ip_address IS NOT NULL) as ip_addresses
      FROM security_history
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '90 days'
      GROUP BY activity_type
      ORDER BY count DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      report: result.rows
    });
  } catch (error) {
    console.error('Get user security report error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı güvenlik raporu yüklenirken hata oluştu'
    });
  }
};

// Şüpheli aktiviteleri işaretle
exports.markAsSuspicious = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;

    // Bu özellik için security_history tablosuna status kolonu eklenebilir
    // Şimdilik log kaydı yapıyoruz
    console.log(`Event ${eventId} marked as suspicious: ${reason}`);

    res.json({
      success: true,
      message: 'Olay şüpheli olarak işaretlendi'
    });
  } catch (error) {
    console.error('Mark as suspicious error:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem başarısız oldu'
    });
  }
};

// IP'yi blokla
exports.blockIP = async (req, res) => {
  try {
    const { ipAddress, reason } = req.body;

    // blocked_ips tablosu oluşturulabilir
    // CREATE TABLE blocked_ips (id SERIAL PRIMARY KEY, ip_address VARCHAR(45) UNIQUE, reason TEXT, blocked_at TIMESTAMP DEFAULT NOW());
    
    const query = `
      INSERT INTO blocked_ips (ip_address, reason, blocked_by_admin_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (ip_address) DO UPDATE 
      SET reason = $2, blocked_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [ipAddress, reason, req.user.id]);

    res.json({
      success: true,
      message: 'IP adresi engellendi',
      blockedIP: result.rows[0]
    });
  } catch (error) {
    console.error('Block IP error:', error);
    res.status(500).json({
      success: false,
      message: 'IP engellenirken hata oluştu'
    });
  }
};

module.exports = exports;

