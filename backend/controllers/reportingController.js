const { pool } = require('../config/database');
const { createNotification } = require('./notificationController');

class ReportingController {
  // Kullanıcı şikayeti oluştur
  async createReport(reporterId, reportedUserId, reportType, description, evidence = null) {
    try {
      // Aynı kullanıcıya daha önce şikayet yapılmış mı kontrol et
      const existingReport = await pool.query(`
        SELECT id FROM user_reports 
        WHERE reporter_id = $1 AND reported_user_id = $2 
        AND created_at > NOW() - INTERVAL '24 hours'
      `, [reporterId, reportedUserId]);

      if (existingReport.rows.length > 0) {
        return {
          success: false,
          message: 'Bu kullanıcıya son 24 saatte zaten şikayet yaptınız'
        };
      }

      // Şikayet kaydı oluştur
      const result = await pool.query(`
        INSERT INTO user_reports (
          reporter_id, reported_user_id, report_type, description, evidence, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
        RETURNING id
      `, [reporterId, reportedUserId, reportType, description, evidence]);

      const reportId = result.rows[0].id;

      // Otomatik aksiyon kontrolü
      const autoAction = await this.checkAutoAction(reportedUserId, reportType);
      
      if (autoAction.action) {
        await this.executeAutoAction(reportedUserId, autoAction);
      }

      // Admin bildirimi
      await this.notifyAdmins(reportId, reportType, reportedUserId);

      return {
        success: true,
        message: 'Şikayetiniz alındı ve incelenecek',
        reportId: reportId,
        autoAction: autoAction
      };

    } catch (error) {
      console.error('Create report error:', error);
      return { success: false, message: 'Şikayet oluşturulamadı' };
    }
  }

  // Otomatik aksiyon kontrolü
  async checkAutoAction(userId, reportType) {
    try {
      // Son 7 günde alınan şikayet sayısını kontrol et
      const recentReports = await pool.query(`
        SELECT COUNT(*) as report_count
        FROM user_reports 
        WHERE reported_user_id = $1 
        AND created_at > NOW() - INTERVAL '7 days'
        AND status != 'dismissed'
      `, [userId]);

      const reportCount = parseInt(recentReports.rows[0].report_count);

      // Kritik şikayet türleri
      const criticalReports = ['harassment', 'fake_profile', 'spam', 'inappropriate_content'];
      const isCritical = criticalReports.includes(reportType);

      if (reportCount >= 5 || (isCritical && reportCount >= 2)) {
        return {
          action: 'temporary_ban',
          duration: reportCount >= 10 ? 'permanent' : '7_days',
          reason: `${reportCount} şikayet - Otomatik yasaklama`
        };
      } else if (reportCount >= 3) {
        return {
          action: 'warning',
          reason: `${reportCount} şikayet - Uyarı`
        };
      }

      return { action: null };

    } catch (error) {
      console.error('Auto action check error:', error);
      return { action: null };
    }
  }

  // Otomatik aksiyon uygula
  async executeAutoAction(userId, action) {
    try {
      if (action.action === 'temporary_ban') {
        const banDuration = action.duration === 'permanent' ? null : '7 days';
        
        await pool.query(`
          INSERT INTO user_bans (user_id, reason, ban_type, expires_at, created_at)
          VALUES ($1, $2, 'auto', $3, NOW())
        `, [userId, action.reason, banDuration]);

        // Kullanıcıyı deaktif et
        await pool.query(`
          UPDATE users SET is_active = false WHERE id = $1
        `, [userId]);

        // Kullanıcıya bildirim gönder
        await createNotification(
          userId,
          'account_suspended',
          'Hesabınız Askıya Alındı',
          `Hesabınız ${action.reason} nedeniyle askıya alındı.`,
          { reason: action.reason, duration: action.duration },
          null
        );

        return { success: true, message: 'Otomatik yasaklama uygulandı' };

      } else if (action.action === 'warning') {
        // Uyarı kaydı oluştur
        await pool.query(`
          INSERT INTO user_warnings (user_id, reason, created_at)
          VALUES ($1, $2, NOW())
        `, [userId, action.reason]);

        // Kullanıcıya uyarı bildirimi
        await createNotification(
          userId,
          'warning',
          'Uyarı',
          `Hesabınız hakkında şikayetler alındı. Lütfen kurallara uyun.`,
          { reason: action.reason },
          null
        );

        return { success: true, message: 'Uyarı gönderildi' };
      }

    } catch (error) {
      console.error('Execute auto action error:', error);
      return { success: false, message: 'Otomatik aksiyon uygulanamadı' };
    }
  }

  // Admin bildirimi
  async notifyAdmins(reportId, reportType, reportedUserId) {
    try {
      // Admin kullanıcıları bul
      const admins = await pool.query(`
        SELECT id FROM users WHERE is_admin = true AND is_active = true
      `);

      // Her admin'e bildirim gönder
      for (const admin of admins.rows) {
        await createNotification(
          admin.id,
          'new_report',
          'Yeni Kullanıcı Şikayeti',
          `Yeni ${reportType} şikayeti alındı. İnceleme gerekli.`,
          { reportId, reportedUserId, reportType },
          null
        );
      }

    } catch (error) {
      console.error('Notify admins error:', error);
    }
  }

  // Şikayet listesi (admin)
  async getReports(status = 'all', limit = 50, offset = 0) {
    try {
      let whereClause = '';
      let queryParams = [limit, offset];

      if (status !== 'all') {
        whereClause = 'WHERE ur.status = $3';
        queryParams.push(status);
      }

      const query = `
        SELECT 
          ur.id,
          ur.report_type,
          ur.description,
          ur.status,
          ur.created_at,
          ur.resolved_at,
          reporter.first_name as reporter_name,
          reporter.last_name as reporter_last_name,
          reported.first_name as reported_name,
          reported.last_name as reported_last_name,
          reported.is_active as reported_active
        FROM user_reports ur
        JOIN users reporter ON ur.reporter_id = reporter.id
        JOIN users reported ON ur.reported_user_id = reported.id
        ${whereClause}
        ORDER BY ur.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await pool.query(query, queryParams);

      return {
        success: true,
        reports: result.rows,
        total: result.rows.length
      };

    } catch (error) {
      console.error('Get reports error:', error);
      return { success: false, message: 'Şikayetler alınamadı' };
    }
  }

  // Şikayet çözümle
  async resolveReport(reportId, adminId, resolution, action = null) {
    try {
      // Şikayet bilgilerini al
      const report = await pool.query(`
        SELECT * FROM user_reports WHERE id = $1
      `, [reportId]);

      if (report.rows.length === 0) {
        return { success: false, message: 'Şikayet bulunamadı' };
      }

      const reportData = report.rows[0];

      // Şikayeti çözümle
      await pool.query(`
        UPDATE user_reports 
        SET status = $2, resolved_by = $3, resolved_at = NOW(), resolution = $4
        WHERE id = $1
      `, [reportId, resolution, adminId, action]);

      // Eğer aksiyon alınacaksa
      if (action && action !== 'no_action') {
        await this.executeAdminAction(reportData.reported_user_id, action, adminId);
      }

      return {
        success: true,
        message: 'Şikayet çözümlendi',
        resolution: resolution
      };

    } catch (error) {
      console.error('Resolve report error:', error);
      return { success: false, message: 'Şikayet çözümlenemedi' };
    }
  }

  // Admin aksiyonu uygula
  async executeAdminAction(userId, action, adminId) {
    try {
      switch (action) {
        case 'warn':
          await pool.query(`
            INSERT INTO user_warnings (user_id, reason, created_by, created_at)
            VALUES ($1, $2, $3, NOW())
          `, [userId, 'Admin uyarısı', adminId]);
          break;

        case 'temp_ban':
          await pool.query(`
            INSERT INTO user_bans (user_id, reason, ban_type, created_by, expires_at, created_at)
            VALUES ($1, $2, 'manual', $3, NOW() + INTERVAL '7 days', NOW())
          `, [userId, 'Admin yasaklaması', adminId]);
          break;

        case 'permanent_ban':
          await pool.query(`
            INSERT INTO user_bans (user_id, reason, ban_type, created_by, created_at)
            VALUES ($1, $2, 'manual', $3, NOW())
          `, [userId, 'Kalıcı yasaklama', adminId]);
          break;

        case 'deactivate':
          await pool.query(`
            UPDATE users SET is_active = false WHERE id = $1
          `, [userId]);
          break;
      }

      return { success: true };

    } catch (error) {
      console.error('Execute admin action error:', error);
      return { success: false };
    }
  }

  // Kullanıcı şikayet istatistikleri
  async getUserReportStats(userId) {
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_reports,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_reports,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_reports
        FROM user_reports 
        WHERE reported_user_id = $1
      `, [userId]);

      return {
        success: true,
        stats: stats.rows[0]
      };

    } catch (error) {
      console.error('Get user report stats error:', error);
      return { success: false, message: 'İstatistikler alınamadı' };
    }
  }

  // Spam tespit algoritması
  async detectSpamPatterns(userId) {
    try {
      // Son 24 saatteki aktivite
      const recentActivity = await pool.query(`
        SELECT 
          COUNT(*) as like_count,
          COUNT(DISTINCT user2_id) as unique_likes
        FROM matches 
        WHERE user1_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
      `, [userId]);

      const activity = recentActivity.rows[0];
      const likeCount = parseInt(activity.like_count);
      const uniqueLikes = parseInt(activity.unique_likes);

      // Spam göstergeleri
      const spamIndicators = [];

      if (likeCount > 50) {
        spamIndicators.push('Çok fazla beğeni (50+)');
      }

      if (likeCount > 0 && uniqueLikes / likeCount < 0.5) {
        spamIndicators.push('Tekrarlayan beğeniler');
      }

      // Son 7 günde alınan şikayetler
      const recentReports = await pool.query(`
        SELECT COUNT(*) as report_count
        FROM user_reports 
        WHERE reported_user_id = $1 
        AND created_at > NOW() - INTERVAL '7 days'
      `, [userId]);

      const reportCount = parseInt(recentReports.rows[0].report_count);
      if (reportCount >= 3) {
        spamIndicators.push(`${reportCount} şikayet`);
      }

      return {
        isSpam: spamIndicators.length > 0,
        indicators: spamIndicators,
        severity: spamIndicators.length >= 3 ? 'high' : spamIndicators.length >= 2 ? 'medium' : 'low'
      };

    } catch (error) {
      console.error('Detect spam patterns error:', error);
      return { isSpam: false, indicators: [] };
    }
  }
}

module.exports = new ReportingController();
