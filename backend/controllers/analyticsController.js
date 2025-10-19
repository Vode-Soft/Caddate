const { pool } = require('../config/database');

class AnalyticsController {
  // Dashboard analytics
  async getDashboardAnalytics(req, res) {
    try {
      const { period = '7d' } = req.query;
      
      // Tarih aralığını hesapla
      const dateRange = this.getDateRange(period);
      
      // Kullanıcı istatistikleri
      const userStats = await this.getUserStats(dateRange);
      
      // Aktivite istatistikleri
      const activityStats = await this.getActivityStats(dateRange);
      
      // Gelir istatistikleri
      const revenueStats = await this.getRevenueStats(dateRange);
      
      // Performans metrikleri
      const performanceMetrics = await this.getPerformanceMetrics(dateRange);

      res.json({
        success: true,
        data: {
          period,
          dateRange,
          userStats,
          activityStats,
          revenueStats,
          performanceMetrics
        }
      });

    } catch (error) {
      console.error('Get dashboard analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Analytics verileri alınırken bir hata oluştu'
      });
    }
  }

  // Kullanıcı istatistikleri
  async getUserStats(dateRange) {
    try {
      // Toplam kullanıcı sayısı
      const totalUsersResult = await pool.query(
        'SELECT COUNT(*) FROM users'
      );
      
      // Yeni kayıtlar
      const newUsersResult = await pool.query(
        'SELECT COUNT(*) FROM users WHERE created_at >= $1',
        [dateRange.start]
      );
      
      // Aktif kullanıcılar (son 7 gün)
      const activeUsersResult = await pool.query(
        'SELECT COUNT(DISTINCT user_id) FROM activities WHERE created_at >= $1',
        [dateRange.start]
      );
      
      // Premium kullanıcılar
      const premiumUsersResult = await pool.query(
        'SELECT COUNT(*) FROM user_subscriptions WHERE status = $1',
        ['active']
      );

      return {
        totalUsers: parseInt(totalUsersResult.rows[0].count),
        newUsers: parseInt(newUsersResult.rows[0].count),
        activeUsers: parseInt(activeUsersResult.rows[0].count),
        premiumUsers: parseInt(premiumUsersResult.rows[0].count)
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      return {
        totalUsers: 0,
        newUsers: 0,
        activeUsers: 0,
        premiumUsers: 0
      };
    }
  }

  // Aktivite istatistikleri
  async getActivityStats(dateRange) {
    try {
      // Günlük aktivite sayıları
      const dailyActivitiesResult = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          activity_type,
          COUNT(*) as count
        FROM activities 
        WHERE created_at >= $1
        GROUP BY DATE(created_at), activity_type
        ORDER BY date DESC
      `, [dateRange.start]);

      // En popüler aktiviteler
      const popularActivitiesResult = await pool.query(`
        SELECT 
          activity_type,
          COUNT(*) as count
        FROM activities 
        WHERE created_at >= $1
        GROUP BY activity_type
        ORDER BY count DESC
        LIMIT 10
      `, [dateRange.start]);

      // Kullanıcı başına ortalama aktivite
      const avgActivitiesResult = await pool.query(`
        SELECT 
          COUNT(*) / COUNT(DISTINCT user_id) as avg_activities_per_user
        FROM activities 
        WHERE created_at >= $1
      `, [dateRange.start]);

      return {
        dailyActivities: dailyActivitiesResult.rows,
        popularActivities: popularActivitiesResult.rows,
        avgActivitiesPerUser: parseFloat(avgActivitiesResult.rows[0]?.avg_activities_per_user || 0)
      };
    } catch (error) {
      console.error('Get activity stats error:', error);
      return {
        dailyActivities: [],
        popularActivities: [],
        avgActivitiesPerUser: 0
      };
    }
  }

  // Gelir istatistikleri
  async getRevenueStats(dateRange) {
    try {
      // Toplam gelir
      const totalRevenueResult = await pool.query(
        'SELECT SUM(amount_paid) FROM payment_history WHERE created_at >= $1',
        [dateRange.start]
      );
      
      // Aylık gelir trendi
      const monthlyRevenueResult = await pool.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          SUM(amount_paid) as revenue
        FROM payment_history 
        WHERE created_at >= $1
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `, [dateRange.start]);
      
      // En popüler planlar
      const popularPlansResult = await pool.query(`
        SELECT 
          sp.name as plan_name,
          COUNT(*) as subscription_count,
          SUM(ph.amount_paid) as total_revenue
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        JOIN payment_history ph ON us.id = ph.subscription_id
        WHERE us.created_at >= $1
        GROUP BY sp.name
        ORDER BY subscription_count DESC
      `, [dateRange.start]);

      return {
        totalRevenue: parseFloat(totalRevenueResult.rows[0]?.sum || 0),
        monthlyRevenue: monthlyRevenueResult.rows,
        popularPlans: popularPlansResult.rows
      };
    } catch (error) {
      console.error('Get revenue stats error:', error);
      return {
        totalRevenue: 0,
        monthlyRevenue: [],
        popularPlans: []
      };
    }
  }

  // Performans metrikleri
  async getPerformanceMetrics(dateRange) {
    try {
      // Ortalama yanıt süresi (simüle edilmiş)
      const avgResponseTime = Math.random() * 200 + 100; // 100-300ms
      
      // Hata oranı (simüle edilmiş)
      const errorRate = Math.random() * 0.05; // 0-5%
      
      // Sistem yükü (simüle edilmiş)
      const systemLoad = Math.random() * 0.8 + 0.2; // 20-100%
      
      // Veritabanı performansı
      const dbPerformanceResult = await pool.query(`
        SELECT 
          COUNT(*) as total_queries,
          AVG(EXTRACT(EPOCH FROM (clock_timestamp() - query_start))) as avg_query_time
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);

      return {
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        systemLoad: Math.round(systemLoad * 100) / 100,
        dbQueries: parseInt(dbPerformanceResult.rows[0]?.total_queries || 0),
        avgQueryTime: parseFloat(dbPerformanceResult.rows[0]?.avg_query_time || 0)
      };
    } catch (error) {
      console.error('Get performance metrics error:', error);
      return {
        avgResponseTime: 0,
        errorRate: 0,
        systemLoad: 0,
        dbQueries: 0,
        avgQueryTime: 0
      };
    }
  }

  // Kullanıcı davranış analizi
  async getUserBehaviorAnalytics(req, res) {
    try {
      const { userId } = req.params;
      const { period = '30d' } = req.query;
      
      const dateRange = this.getDateRange(period);
      
      // Kullanıcının aktivite geçmişi
      const userActivitiesResult = await pool.query(`
        SELECT 
          activity_type,
          COUNT(*) as count,
          MAX(created_at) as last_activity
        FROM activities 
        WHERE user_id = $1 AND created_at >= $2
        GROUP BY activity_type
        ORDER BY count DESC
      `, [userId, dateRange.start]);
      
      // Kullanıcının en aktif olduğu saatler
      const activeHoursResult = await pool.query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count
        FROM activities 
        WHERE user_id = $1 AND created_at >= $2
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY count DESC
      `, [userId, dateRange.start]);
      
      // Kullanıcının favori özellikleri
      const favoriteFeaturesResult = await pool.query(`
        SELECT 
          activity_type,
          COUNT(*) as usage_count
        FROM activities 
        WHERE user_id = $1 AND created_at >= $2
        GROUP BY activity_type
        ORDER BY usage_count DESC
        LIMIT 5
      `, [userId, dateRange.start]);

      res.json({
        success: true,
        data: {
          period,
          activities: userActivitiesResult.rows,
          activeHours: activeHoursResult.rows,
          favoriteFeatures: favoriteFeaturesResult.rows
        }
      });

    } catch (error) {
      console.error('Get user behavior analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Kullanıcı davranış analizi alınırken bir hata oluştu'
      });
    }
  }

  // Gerçek zamanlı metrikler
  async getRealTimeMetrics(req, res) {
    try {
      // Aktif kullanıcı sayısı (son 5 dakika)
      const activeUsersResult = await pool.query(`
        SELECT COUNT(DISTINCT user_id) FROM activities 
        WHERE created_at >= NOW() - INTERVAL '5 minutes'
      `);
      
      // Son 1 saatteki aktiviteler
      const recentActivitiesResult = await pool.query(`
        SELECT 
          activity_type,
          COUNT(*) as count
        FROM activities 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        GROUP BY activity_type
        ORDER BY count DESC
      `);
      
      // Sistem durumu
      const systemStatus = {
        database: 'healthy',
        api: 'healthy',
        notifications: 'healthy',
        storage: 'healthy'
      };

      res.json({
        success: true,
        data: {
          activeUsers: parseInt(activeUsersResult.rows[0]?.count || 0),
          recentActivities: recentActivitiesResult.rows,
          systemStatus,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get real-time metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Gerçek zamanlı metrikler alınırken bir hata oluştu'
      });
    }
  }

  // Tarih aralığını hesapla
  getDateRange(period) {
    const now = new Date();
    let start;
    
    switch (period) {
      case '1d':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return { start, end: now };
  }
}

module.exports = new AnalyticsController();
