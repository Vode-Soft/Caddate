const { pool } = require('../config/database');

class Subscription {
  // Abonelik planlarını getir
  static async getPlans(activeOnly = true) {
    try {
      // Önce tabloyu sorgulamayı dene, yoksa oluştur
      let result;
      try {
        let query = `
          SELECT * FROM subscription_plans
          ${activeOnly ? 'WHERE is_active = true' : ''}
          ORDER BY display_order ASC, price ASC
        `;
        result = await pool.query(query);
      } catch (queryError) {
        // Eğer tablo yoksa (42P01 hatası), tabloyu oluştur
        if (queryError.code === '42P01') {
          console.warn('⚠️  subscription_plans tablosu bulunamadı, oluşturuluyor...');
          
          // Tabloyu oluştur
          await pool.query(`
            CREATE TABLE IF NOT EXISTS subscription_plans (
              id SERIAL PRIMARY KEY,
              name VARCHAR(100) NOT NULL,
              name_tr VARCHAR(100) NOT NULL,
              description TEXT,
              description_tr TEXT,
              price DECIMAL(10, 2) NOT NULL,
              currency VARCHAR(3) DEFAULT 'TRY',
              duration_days INTEGER NOT NULL,
              features JSONB DEFAULT '{}',
              is_active BOOLEAN DEFAULT true,
              is_popular BOOLEAN DEFAULT false,
              display_order INTEGER DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);
          console.log('✅ subscription_plans tablosu oluşturuldu');
          
          // Örnek planları ekle
          try {
            await pool.query(`
              INSERT INTO subscription_plans (name, name_tr, description, description_tr, price, duration_days, features, is_popular, display_order)
              VALUES 
                ('Basic Premium', 'Temel Premium', 'Essential features', 'Günlük kullanıcılar için temel özellikler', 49.90, 30, '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "unlimited_swipes": true}'::jsonb, false, 1),
                ('Gold Premium', 'Altın Premium', 'Advanced features', 'Aktif kullanıcılar için gelişmiş özellikler', 99.90, 30, '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "boost_per_month": 3}'::jsonb, true, 2),
                ('Platinum Premium', 'Platin Premium', 'All features', 'Tüm özellikler açık', 149.90, 30, '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "passport": true, "boost_per_month": 10}'::jsonb, false, 3);
            `);
            console.log('✅ Örnek planlar eklendi');
            
            // Tekrar sorgula
            let retryQuery = `
              SELECT * FROM subscription_plans
              ${activeOnly ? 'WHERE is_active = true' : ''}
              ORDER BY display_order ASC, price ASC
            `;
            result = await pool.query(retryQuery);
          } catch (insertError) {
            console.error('❌ Örnek planlar eklenirken hata:', insertError.message);
            // Tablo oluşturuldu ama planlar eklenemedi, boş döndür
            return [];
          }
        } else {
          // Başka bir hata, yukarı fırlat
          throw queryError;
        }
      }
      
      // Eğer plan yoksa ve activeOnly true ise, örnek planlar ekle
      if (result.rows.length === 0 && activeOnly) {
        console.warn('⚠️  Hiç plan bulunamadı, örnek planlar ekleniyor...');
        try {
          await pool.query(`
            INSERT INTO subscription_plans (name, name_tr, description, description_tr, price, duration_days, features, is_popular, display_order)
            VALUES 
              ('Basic Premium', 'Temel Premium', 'Essential features', 'Günlük kullanıcılar için temel özellikler', 49.90, 30, '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "unlimited_swipes": true}'::jsonb, false, 1),
              ('Gold Premium', 'Altın Premium', 'Advanced features', 'Aktif kullanıcılar için gelişmiş özellikler', 99.90, 30, '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "boost_per_month": 3}'::jsonb, true, 2),
              ('Platinum Premium', 'Platin Premium', 'All features', 'Tüm özellikler açık', 149.90, 30, '{"unlimited_messages": true, "profile_boost": true, "hide_ads": true, "see_who_liked": true, "unlimited_swipes": true, "rewind": true, "passport": true, "boost_per_month": 10}'::jsonb, false, 3)
            ON CONFLICT DO NOTHING;
          `);
          console.log('✅ Örnek planlar eklendi, tekrar sorgulanıyor...');
          // Tekrar sorgula
          let retryQuery = `
            SELECT * FROM subscription_plans
            ${activeOnly ? 'WHERE is_active = true' : ''}
            ORDER BY display_order ASC, price ASC
          `;
          result = await pool.query(retryQuery);
        } catch (insertError) {
          console.error('❌ Örnek planlar eklenirken hata:', insertError.message);
          // Hata olsa bile boş array döndür
          return [];
        }
      }
      
      console.log(`✅ ${result.rows.length} plan bulundu`);
      return result.rows;
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack
      });
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
      // Eğer tablo yoksa (42P01), null döndür (hata fırlatma)
      if (error.code === '42P01') {
        console.warn('⚠️  user_subscriptions tablosu bulunamadı, null döndürülüyor');
        return null;
      }
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
      if (!userId) {
        throw new Error('Kullanıcı ID gerekli');
      }

      // Önce kolonların varlığını kontrol et, yoksa varsayılan değerler döndür
      let query = `
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
        try {
          // Önce premium_features kolonunun varlığını kontrol et
          let updateQuery = `
            UPDATE users 
            SET is_premium = false, premium_until = NULL
            WHERE id = $1
          `;
          
          // Eğer premium_features kolonu varsa, onu da güncelle
          try {
            updateQuery = `
              UPDATE users 
              SET is_premium = false, premium_until = NULL, premium_features = '{}'::jsonb
              WHERE id = $1
            `;
            await pool.query(updateQuery, [userId]);
          } catch (colError) {
            // Eğer premium_features kolonu yoksa, sadece diğer kolonları güncelle
            if (colError.code === '42703') {
              updateQuery = `
                UPDATE users 
                SET is_premium = false, premium_until = NULL
                WHERE id = $1
              `;
              await pool.query(updateQuery, [userId]);
            } else {
              throw colError;
            }
          }
        } catch (updateError) {
          // Güncelleme hatası kritik değil, sadece logla
          console.warn('Error updating expired premium status:', updateError.message);
        }
        
        return { isPremium: false, premiumUntil: null, features: {} };
      }

      // premium_features'i güvenli şekilde işle
      let features = {};
      if (user.premium_features !== undefined && user.premium_features !== null) {
        if (typeof user.premium_features === 'string') {
          try {
            features = JSON.parse(user.premium_features);
          } catch (parseError) {
            console.warn('Error parsing premium_features:', parseError.message);
            features = {};
          }
        } else if (typeof user.premium_features === 'object') {
          features = user.premium_features;
        }
      }

      return {
        isPremium: user.is_premium || false,
        premiumUntil: user.premium_until || null,
        features: features
      };
    } catch (error) {
      console.error('Error checking user premium status:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack
      });
      
      // Eğer kolon yoksa (42P01 veya 42703 hatası), varsayılan değerler döndür
      if (error.code === '42P01' || error.code === '42703') {
        console.warn('⚠️  Premium kolonları bulunamadı, varsayılan değerler döndürülüyor');
        return { isPremium: false, premiumUntil: null, features: {} };
      }
      
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
      // Eğer tablo yoksa (42P01 hatası), sessizce devam et (kritik değil)
      if (error.code === '42P01') {
        console.warn('⚠️  feature_usage tablosu bulunamadı, tracking atlanıyor');
        return null;
      }
      
      // Diğer hatalar için logla ama fırlatma (tracking kritik değil)
      console.warn('Error tracking feature usage (non-critical):', error.message);
      return null;
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
      // Önce toplam sayıyı al
      let countQuery = `
        SELECT COUNT(*) as total
        FROM user_subscriptions us
        ${status ? 'WHERE us.status = $1' : ''}
      `;
      
      const countParams = status ? [status] : [];
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total) || 0;

      // Sonra sayfalanmış verileri al
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
      
      return {
        subscriptions: result.rows,
        total: total
      };
    } catch (error) {
      // Eğer tablo yoksa (42P01 hatası), boş sonuç döndür
      const errorCode = error?.code;
      const errorMessage = error?.message ? String(error.message) : '';
      const isTableNotFound = 
        errorCode === '42P01' || 
        errorMessage.toLowerCase().includes('does not exist') || 
        errorMessage.toLowerCase().includes('user_subscriptions') ||
        (error && String(error).includes('does not exist'));
      
      if (isTableNotFound) {
        console.warn('⚠️  user_subscriptions tablosu bulunamadı, boş sonuç döndürülüyor');
        return {
          subscriptions: [],
          total: 0
        };
      }
      
      // Eğer tablo bulunamadı hatası değilse, hatayı fırlat
      console.error('Error getting all subscriptions:', error);
      console.error('Error code:', errorCode);
      console.error('Error message:', errorMessage);
      throw error;
    }
  }

  // ADMIN: İstatistikler
  static async getStats() {
    try {
      // Önce user_subscriptions tablosundan istatistikleri al
      const subscriptionsStatsQuery = `
        SELECT 
          COUNT(DISTINCT user_id) FILTER (WHERE status = 'active' AND end_date > NOW()) as active_subscribers,
          COUNT(*) FILTER (WHERE status = 'active' AND end_date > NOW()) as active_subscriptions,
          COUNT(*) FILTER (WHERE status = 'expired') as expired_subscriptions,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_subscriptions
        FROM user_subscriptions
      `;
      
      const subscriptionsResult = await pool.query(subscriptionsStatsQuery);
      const subscriptionsStats = subscriptionsResult.rows[0] || {};

      // Sonra payment_history tablosundan gelir istatistiklerini al (tablo yoksa hata vermesin)
      let revenueStats = { revenue_last_30_days: 0, total_revenue: 0 };
      try {
        const revenueQuery = `
          SELECT 
            COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'), 0) as revenue_last_30_days,
            COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_revenue
          FROM payment_history
        `;
        const revenueResult = await pool.query(revenueQuery);
        revenueStats = revenueResult.rows[0] || revenueStats;
      } catch (revenueError) {
        // payment_history tablosu yoksa, sadece logla ve devam et
        const revenueErrorCode = revenueError?.code;
        const revenueErrorMessage = revenueError?.message ? String(revenueError.message) : '';
        const isTableNotFound = 
          revenueErrorCode === '42P01' || 
          revenueErrorMessage.toLowerCase().includes('does not exist') || 
          revenueErrorMessage.toLowerCase().includes('payment_history') ||
          (revenueError && String(revenueError).includes('does not exist'));
        
        if (isTableNotFound) {
          console.warn('⚠️  payment_history tablosu bulunamadı, gelir istatistikleri 0 olarak ayarlandı');
        } else {
          console.warn('⚠️  Gelir istatistikleri alınırken hata:', revenueErrorMessage);
        }
      }
      
      // Tüm değerleri birleştir ve null değerleri 0'a çevir
      return {
        active_subscribers: parseInt(subscriptionsStats.active_subscribers) || 0,
        active_subscriptions: parseInt(subscriptionsStats.active_subscriptions) || 0,
        expired_subscriptions: parseInt(subscriptionsStats.expired_subscriptions) || 0,
        cancelled_subscriptions: parseInt(subscriptionsStats.cancelled_subscriptions) || 0,
        revenue_last_30_days: parseFloat(revenueStats.revenue_last_30_days) || 0,
        total_revenue: parseFloat(revenueStats.total_revenue) || 0
      };
    } catch (error) {
      // Eğer user_subscriptions tablosu yoksa (42P01 hatası), boş istatistik döndür
      const errorCode = error?.code;
      const errorMessage = error?.message ? String(error.message) : '';
      const isTableNotFound = 
        errorCode === '42P01' || 
        errorMessage.toLowerCase().includes('does not exist') || 
        errorMessage.toLowerCase().includes('user_subscriptions') ||
        (error && String(error).includes('does not exist'));
      
      if (isTableNotFound) {
        console.warn('⚠️  user_subscriptions tablosu bulunamadı, boş istatistik döndürülüyor');
        return {
          active_subscribers: 0,
          active_subscriptions: 0,
          expired_subscriptions: 0,
          cancelled_subscriptions: 0,
          revenue_last_30_days: 0,
          total_revenue: 0
        };
      }
      
      // Eğer tablo bulunamadı hatası değilse, hatayı fırlat
      console.error('Error getting subscription stats:', error);
      console.error('Error code:', errorCode);
      console.error('Error message:', errorMessage);
      throw error;
    }
  }

  // ADMIN: Kullanıcıya premium üyelik ver
  static async giveAdminPremium(userId, planId, durationDays, reason = 'Admin tarafından verildi') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Plan bilgilerini al
      const planQuery = 'SELECT * FROM subscription_plans WHERE id = $1';
      const planResult = await client.query(planQuery, [planId]);
      
      if (planResult.rows.length === 0) {
        throw new Error('Plan bulunamadı');
      }

      const plan = planResult.rows[0];
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // Önceki aktif abonelikleri iptal et
      const cancelQuery = `
        UPDATE user_subscriptions 
        SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = 'Admin tarafından yeni abonelik verildi'
        WHERE user_id = $1 AND status = 'active' AND end_date > NOW()
      `;
      await client.query(cancelQuery, [userId]);

      // Yeni admin aboneliği oluştur
      const subscriptionQuery = `
        INSERT INTO user_subscriptions 
          (user_id, plan_id, status, start_date, end_date, payment_method, transaction_id, amount_paid, currency, is_admin_given)
        VALUES ($1, $2, 'active', $3, $4, 'admin', 'admin-' || $1 || '-' || EXTRACT(EPOCH FROM NOW()), 0, $5, true)
        RETURNING *
      `;
      
      const subscriptionResult = await client.query(subscriptionQuery, [
        userId, planId, startDate, endDate, plan.currency
      ]);

      const subscription = subscriptionResult.rows[0];

      // Ödeme geçmişine ekle (admin verdiği için 0 tutar)
      const paymentQuery = `
        INSERT INTO payment_history 
          (user_id, subscription_id, plan_id, amount, currency, status, payment_method, transaction_id, payment_gateway, is_admin_given)
        VALUES ($1, $2, $3, 0, $4, 'completed', 'admin', 'admin-' || $1 || '-' || EXTRACT(EPOCH FROM NOW()), 'admin', true)
        RETURNING *
      `;
      
      await client.query(paymentQuery, [
        userId, subscription.id, planId, plan.currency
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
      console.error('Error giving admin premium:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ADMIN: Kullanıcının premium üyeliğini iptal et
  static async revokeAdminPremium(userId, reason = 'Admin tarafından iptal edildi') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Aktif abonelikleri iptal et
      const cancelQuery = `
        UPDATE user_subscriptions 
        SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = $1
        WHERE user_id = $2 AND status = 'active' AND end_date > NOW()
        RETURNING *
      `;
      
      const result = await client.query(cancelQuery, [reason, userId]);
      const cancelledSubscriptions = result.rows;

      // Kullanıcının premium durumunu güncelle
      const updateUserQuery = `
        UPDATE users 
        SET is_premium = false, premium_until = NULL, premium_features = '{}'
        WHERE id = $1
      `;
      
      await client.query(updateUserQuery, [userId]);

      await client.query('COMMIT');
      
      return {
        cancelledSubscriptions: cancelledSubscriptions.length,
        message: `${cancelledSubscriptions.length} abonelik iptal edildi`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error revoking admin premium:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Subscription;

