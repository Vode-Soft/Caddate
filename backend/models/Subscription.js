const { pool } = require('../config/database');

class Subscription {
  // Abonelik planlarını getir
  static async getPlans(activeOnly = true) {
    try {
      let query = `
        SELECT * FROM subscription_plans
        ${activeOnly ? 'WHERE is_active = true' : ''}
        ORDER BY display_order ASC, price ASC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      throw error;
    }
  }

  // Plan ID'ye göre plan getir
  static async getPlanById(planId) {
    try {
      const query = 'SELECT * FROM subscription_plans WHERE id = $1';
      const result = await pool.query(query, [planId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting plan by ID:', error);
      throw error;
    }
  }

  // Kullanıcının aktif aboneliğini getir
  static async getUserActiveSubscription(userId) {
    try {
      const query = `
        SELECT 
          us.*,
          sp.name,
          sp.name_tr,
          sp.features,
          sp.price
        FROM user_subscriptions us
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = $1 
          AND us.status = 'active'
          AND us.end_date > NOW()
        ORDER BY us.end_date DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user active subscription:', error);
      throw error;
    }
  }

  // Kullanıcının tüm aboneliklerini getir
  static async getUserSubscriptions(userId, limit = 10) {
    try {
      const query = `
        SELECT 
          us.*,
          sp.name,
          sp.name_tr,
          sp.features,
          sp.price
        FROM user_subscriptions us
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = $1
        ORDER BY us.created_at DESC
        LIMIT $2
      `;
      
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      throw error;
    }
  }

  // Yeni abonelik oluştur
  static async createSubscription(userId, planId, paymentMethod, transactionId, amountPaid) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Plan bilgilerini al
      const planQuery = 'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true';
      const planResult = await client.query(planQuery, [planId]);
      
      if (planResult.rows.length === 0) {
        throw new Error('Plan bulunamadı veya aktif değil');
      }

      const plan = planResult.rows[0];
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

      // Önceki aktif abonelikleri iptal et
      const cancelQuery = `
        UPDATE user_subscriptions 
        SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = 'Yeni abonelik başlatıldı'
        WHERE user_id = $1 AND status = 'active' AND end_date > NOW()
      `;
      await client.query(cancelQuery, [userId]);

      // Yeni abonelik oluştur
      const subscriptionQuery = `
        INSERT INTO user_subscriptions 
          (user_id, plan_id, status, start_date, end_date, payment_method, transaction_id, amount_paid, currency)
        VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const subscriptionResult = await client.query(subscriptionQuery, [
        userId, planId, startDate, endDate, paymentMethod, transactionId, amountPaid, plan.currency
      ]);

      const subscription = subscriptionResult.rows[0];

      // Ödeme geçmişine ekle
      const paymentQuery = `
        INSERT INTO payment_history 
          (user_id, subscription_id, plan_id, amount, currency, status, payment_method, transaction_id, payment_gateway)
        VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8)
        RETURNING *
      `;
      
      await client.query(paymentQuery, [
        userId, subscription.id, planId, amountPaid, plan.currency, paymentMethod, transactionId, paymentMethod
      ]);

      // Users tablosunu güncelle
      const updateUserQuery = `
        UPDATE users 
        SET is_premium = true, premium_until = $1, premium_features = $2
        WHERE id = $3
      `;
      
      await client.query(updateUserQuery, [endDate, plan.features, userId]);

      await client.query('COMMIT');
      
      return subscription;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating subscription:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Aboneliği iptal et
  static async cancelSubscription(userId, subscriptionId, reason = '') {
    try {
      const query = `
        UPDATE user_subscriptions 
        SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = $1, auto_renew = false
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;
      
      const result = await pool.query(query, [reason, subscriptionId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Süresi dolan abonelikleri güncelle
  static async updateExpiredSubscriptions() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Süresi dolan abonelikleri bul ve güncelle
      const updateQuery = `
        UPDATE user_subscriptions 
        SET status = 'expired'
        WHERE status = 'active' AND end_date <= NOW()
        RETURNING user_id
      `;
      
      const result = await client.query(updateQuery);
      const expiredUserIds = result.rows.map(row => row.user_id);

      // Kullanıcıların premium durumunu güncelle
      if (expiredUserIds.length > 0) {
        const updateUsersQuery = `
          UPDATE users 
          SET is_premium = false, premium_until = NULL, premium_features = '{}'
          WHERE id = ANY($1::int[])
          AND NOT EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_id = users.id 
            AND status = 'active' 
            AND end_date > NOW()
          )
        `;
        
        await client.query(updateUsersQuery, [expiredUserIds]);
      }

      await client.query('COMMIT');
      
      return expiredUserIds.length;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating expired subscriptions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Kullanıcının premium durumunu kontrol et
  static async checkUserPremiumStatus(userId) {
    try {
      const query = `
        SELECT 
          is_premium,
          premium_until,
          premium_features
        FROM users
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      const user = result.rows[0];

      if (!user) {
        return { isPremium: false, premiumUntil: null, features: {} };
      }

      // Premium süresi geçmişse güncelle
      if (user.is_premium && user.premium_until && new Date(user.premium_until) < new Date()) {
        const updateQuery = `
          UPDATE users 
          SET is_premium = false, premium_until = NULL, premium_features = '{}'
          WHERE id = $1
        `;
        await pool.query(updateQuery, [userId]);
        
        return { isPremium: false, premiumUntil: null, features: {} };
      }

      return {
        isPremium: user.is_premium || false,
        premiumUntil: user.premium_until,
        features: user.premium_features || {}
      };
    } catch (error) {
      console.error('Error checking user premium status:', error);
      throw error;
    }
  }

  // Özellik kullanımını kaydet/güncelle
  static async trackFeatureUsage(userId, featureName) {
    try {
      const query = `
        INSERT INTO feature_usage (user_id, feature_name, usage_count, last_used_at)
        VALUES ($1, $2, 1, NOW())
        ON CONFLICT (user_id, feature_name) 
        DO UPDATE SET 
          usage_count = feature_usage.usage_count + 1,
          last_used_at = NOW()
        RETURNING *
      `;
      
      const result = await pool.query(query, [userId, featureName]);
      return result.rows[0];
    } catch (error) {
      console.error('Error tracking feature usage:', error);
      throw error;
    }
  }

  // Ödeme geçmişini getir
  static async getPaymentHistory(userId, limit = 20) {
    try {
      const query = `
        SELECT 
          ph.*,
          sp.name as plan_name,
          sp.name_tr as plan_name_tr
        FROM payment_history ph
        LEFT JOIN subscription_plans sp ON ph.plan_id = sp.id
        WHERE ph.user_id = $1
        ORDER BY ph.created_at DESC
        LIMIT $2
      `;
      
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  // ADMIN: Tüm abonelikleri getir
  static async getAllSubscriptions(status = null, limit = 100, offset = 0) {
    try {
      let query = `
        SELECT 
          us.*,
          sp.name as plan_name,
          sp.name_tr as plan_name_tr,
          u.email as user_email,
          u.first_name,
          u.last_name
        FROM user_subscriptions us
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        LEFT JOIN users u ON us.user_id = u.id
        ${status ? 'WHERE us.status = $1' : ''}
        ORDER BY us.created_at DESC
        LIMIT $${status ? 2 : 1} OFFSET $${status ? 3 : 2}
      `;
      
      const params = status ? [status, limit, offset] : [limit, offset];
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting all subscriptions:', error);
      throw error;
    }
  }

  // ADMIN: İstatistikler
  static async getStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT us.user_id) FILTER (WHERE us.status = 'active' AND us.end_date > NOW()) as active_subscribers,
          COUNT(*) FILTER (WHERE us.status = 'active' AND us.end_date > NOW()) as active_subscriptions,
          COUNT(*) FILTER (WHERE us.status = 'expired') as expired_subscriptions,
          COUNT(*) FILTER (WHERE us.status = 'cancelled') as cancelled_subscriptions,
          SUM(ph.amount) FILTER (WHERE ph.status = 'completed' AND ph.created_at >= NOW() - INTERVAL '30 days') as revenue_last_30_days,
          SUM(ph.amount) FILTER (WHERE ph.status = 'completed') as total_revenue
        FROM user_subscriptions us
        LEFT JOIN payment_history ph ON us.id = ph.subscription_id
      `;
      
      const result = await pool.query(statsQuery);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      throw error;
    }
  }
}

module.exports = Subscription;

