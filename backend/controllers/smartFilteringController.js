const { pool } = require('../config/database');

class SmartFilteringController {
  // Kullanıcı için akıllı filtreleme algoritması
  async getSmartFilteredMatches(userId, limit = 20) {
    try {
      // Kullanıcı bilgilerini al
      const userInfo = await pool.query(`
        SELECT 
          gender, birth_date, location_latitude, location_longitude,
          is_verified, subscription_type, created_at, profile_completeness
        FROM users WHERE id = $1
      `, [userId]);

      if (userInfo.rows.length === 0) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
      }

      const user = userInfo.rows[0];
      const userAge = this.calculateAge(user.birth_date);

      // Akıllı filtreleme sorgusu
      const query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.profile_picture,
          u.birth_date,
          u.gender,
          u.is_verified,
          u.subscription_type,
          u.profile_completeness,
          u.created_at,
          u.location_latitude,
          u.location_longitude,
          EXTRACT(YEAR FROM AGE(u.birth_date)) as age,
          -- Akıllı skorlama
          (
            -- Temel skor (40%)
            CASE 
              WHEN u.is_verified = true THEN 40
              WHEN u.subscription_type = 'premium' THEN 35
              WHEN u.profile_completeness >= 80 THEN 30
              ELSE 20
            END +
            -- Yaş uyumluluğu (20%)
            CASE 
              WHEN ABS(EXTRACT(YEAR FROM AGE(u.birth_date)) - $2) <= 2 THEN 20
              WHEN ABS(EXTRACT(YEAR FROM AGE(u.birth_date)) - $2) <= 5 THEN 15
              WHEN ABS(EXTRACT(YEAR FROM AGE(u.birth_date)) - $2) <= 10 THEN 10
              ELSE 5
            END +
            -- Profil kalitesi (20%)
            CASE 
              WHEN u.profile_completeness >= 90 THEN 20
              WHEN u.profile_completeness >= 70 THEN 15
              WHEN u.profile_completeness >= 50 THEN 10
              ELSE 5
            END +
            -- Hesap yaşı (10%)
            CASE 
              WHEN u.created_at > NOW() - INTERVAL '7 days' THEN 5
              WHEN u.created_at > NOW() - INTERVAL '30 days' THEN 10
              WHEN u.created_at > NOW() - INTERVAL '90 days' THEN 15
              ELSE 20
            END +
            -- Aktivite skoru (10%)
            CASE 
              WHEN u.last_activity > NOW() - INTERVAL '1 day' THEN 10
              WHEN u.last_activity > NOW() - INTERVAL '3 days' THEN 8
              WHEN u.last_activity > NOW() - INTERVAL '7 days' THEN 5
              ELSE 2
            END
          ) as smart_score
        FROM users u
        WHERE u.id != $1
          AND u.gender != $3
          AND u.is_active = true
          AND u.id NOT IN (
            SELECT user2_id FROM matches WHERE user1_id = $1
            UNION
            SELECT user1_id FROM matches WHERE user2_id = $1
          )
          AND u.birth_date IS NOT NULL
          AND u.profile_picture IS NOT NULL
        ORDER BY smart_score DESC, u.created_at DESC
        LIMIT $4
      `;

      const result = await pool.query(query, [
        userId, 
        userAge, 
        user.gender, 
        limit
      ]);

      return {
        success: true,
        matches: result.rows,
        total: result.rows.length,
        algorithm: 'smart_filtering'
      };

    } catch (error) {
      console.error('Smart filtering error:', error);
      return { success: false, message: 'Akıllı filtreleme hatası' };
    }
  }

  // Kız kullanıcılar için özel filtreleme
  async getFemalePriorityMatches(userId, limit = 20) {
    try {
      const query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.profile_picture,
          u.birth_date,
          u.gender,
          u.is_verified,
          u.subscription_type,
          u.profile_completeness,
          u.created_at,
          EXTRACT(YEAR FROM AGE(u.birth_date)) as age,
          -- Kız kullanıcılar için özel skorlama
          (
            -- Doğrulama önceliği (50%)
            CASE 
              WHEN u.is_verified = true AND u.subscription_type = 'premium' THEN 50
              WHEN u.is_verified = true THEN 40
              WHEN u.subscription_type = 'premium' THEN 35
              ELSE 20
            END +
            -- Profil kalitesi (30%)
            CASE 
              WHEN u.profile_completeness >= 90 THEN 30
              WHEN u.profile_completeness >= 70 THEN 25
              WHEN u.profile_completeness >= 50 THEN 20
              ELSE 10
            END +
            -- Aktivite (20%)
            CASE 
              WHEN u.last_activity > NOW() - INTERVAL '1 day' THEN 20
              WHEN u.last_activity > NOW() - INTERVAL '3 days' THEN 15
              WHEN u.last_activity > NOW() - INTERVAL '7 days' THEN 10
              ELSE 5
            END
          ) as priority_score
        FROM users u
        WHERE u.id != $1
          AND u.gender = 'male'
          AND u.is_active = true
          AND u.id NOT IN (
            SELECT user2_id FROM matches WHERE user1_id = $1
            UNION
            SELECT user1_id FROM matches WHERE user2_id = $1
          )
          AND u.birth_date IS NOT NULL
          AND u.profile_picture IS NOT NULL
        ORDER BY priority_score DESC, u.created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [userId, limit]);

      return {
        success: true,
        matches: result.rows,
        total: result.rows.length,
        algorithm: 'female_priority'
      };

    } catch (error) {
      console.error('Female priority filtering error:', error);
      return { success: false, message: 'Öncelikli filtreleme hatası' };
    }
  }

  // Spam yapmayan kullanıcıları önceliklendir
  async getNonSpamMatches(userId, limit = 20) {
    try {
      const query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.profile_picture,
          u.birth_date,
          u.gender,
          u.is_verified,
          u.subscription_type,
          u.profile_completeness,
          u.created_at,
          EXTRACT(YEAR FROM AGE(u.birth_date)) as age,
          -- Spam skoru hesaplama
          (
            SELECT 
              CASE 
                WHEN COUNT(*) = 0 THEN 50
                WHEN COUNT(*) < 10 THEN 40
                WHEN COUNT(*) < 25 THEN 30
                WHEN COUNT(*) < 50 THEN 20
                ELSE 10
              END
            FROM matches m 
            WHERE m.user1_id = u.id
          ) as spam_score
        FROM users u
        WHERE u.id != $1
          AND u.gender != (SELECT gender FROM users WHERE id = $1)
          AND u.is_active = true
          AND u.id NOT IN (
            SELECT user2_id FROM matches WHERE user1_id = $1
            UNION
            SELECT user1_id FROM matches WHERE user2_id = $1
          )
          AND u.birth_date IS NOT NULL
          AND u.profile_picture IS NOT NULL
        ORDER BY spam_score DESC, u.created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [userId, limit]);

      return {
        success: true,
        matches: result.rows,
        total: result.rows.length,
        algorithm: 'non_spam_priority'
      };

    } catch (error) {
      console.error('Non-spam filtering error:', error);
      return { success: false, message: 'Spam filtreleme hatası' };
    }
  }

  // Kullanıcı tercihlerine göre filtreleme
  async getPersonalizedMatches(userId, preferences = {}, limit = 20) {
    try {
      const {
        minAge = 18,
        maxAge = 99,
        verifiedOnly = false,
        premiumOnly = false,
        maxDistance = 100
      } = preferences;

      let whereConditions = [
        'u.id != $1',
        'u.gender != (SELECT gender FROM users WHERE id = $1)',
        'u.is_active = true',
        'u.id NOT IN (SELECT user2_id FROM matches WHERE user1_id = $1 UNION SELECT user1_id FROM matches WHERE user2_id = $1)',
        'u.birth_date IS NOT NULL',
        'u.profile_picture IS NOT NULL'
      ];

      let queryParams = [userId];
      let paramIndex = 2;

      // Yaş filtresi
      if (minAge || maxAge) {
        whereConditions.push(`EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        queryParams.push(minAge, maxAge);
        paramIndex += 2;
      }

      // Doğrulama filtresi
      if (verifiedOnly) {
        whereConditions.push('u.is_verified = true');
      }

      // Premium filtresi
      if (premiumOnly) {
        whereConditions.push('u.subscription_type = \'premium\'');
      }

      const query = `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.profile_picture,
          u.birth_date,
          u.gender,
          u.is_verified,
          u.subscription_type,
          u.profile_completeness,
          u.created_at,
          u.location_latitude,
          u.location_longitude,
          EXTRACT(YEAR FROM AGE(u.birth_date)) as age
        FROM users u
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY 
          u.is_verified DESC,
          u.subscription_type DESC,
          u.profile_completeness DESC,
          u.created_at DESC
        LIMIT $${paramIndex}
      `;

      queryParams.push(limit);

      const result = await pool.query(query, queryParams);

      return {
        success: true,
        matches: result.rows,
        total: result.rows.length,
        algorithm: 'personalized',
        preferences
      };

    } catch (error) {
      console.error('Personalized filtering error:', error);
      return { success: false, message: 'Kişiselleştirilmiş filtreleme hatası' };
    }
  }

  // Yaş hesaplama yardımcı fonksiyonu
  calculateAge(birthDate) {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  // Filtreleme algoritması önerisi
  async getRecommendedAlgorithm(userId) {
    try {
      // Kullanıcı istatistiklerini al
      const userStats = await pool.query(`
        SELECT 
          gender,
          is_verified,
          subscription_type,
          profile_completeness,
          created_at,
          (SELECT COUNT(*) FROM matches WHERE user1_id = $1) as total_likes,
          (SELECT COUNT(*) FROM matches WHERE user1_id = $1 AND is_mutual = true) as mutual_likes
        FROM users WHERE id = $1
      `, [userId]);

      if (userStats.rows.length === 0) {
        return { algorithm: 'basic', reason: 'Kullanıcı bulunamadı' };
      }

      const stats = userStats.rows[0];
      const mutualRate = stats.total_likes > 0 ? stats.mutual_likes / stats.total_likes : 0;

      // Algoritma önerisi
      if (stats.gender === 'female') {
        return {
          algorithm: 'female_priority',
          reason: 'Kız kullanıcılar için öncelikli filtreleme',
          benefits: ['Doğrulanmış erkekler önce', 'Premium kullanıcılar önce', 'Kaliteli profiller önce']
        };
      } else if (mutualRate < 0.1) {
        return {
          algorithm: 'non_spam_priority',
          reason: 'Düşük eşleşme oranı tespit edildi',
          benefits: ['Spam yapmayan kullanıcılar', 'Daha kaliteli eşleşmeler', 'Güvenilir profiller']
        };
      } else if (stats.is_verified && stats.subscription_type === 'premium') {
        return {
          algorithm: 'smart_filtering',
          reason: 'Premium kullanıcı için gelişmiş algoritma',
          benefits: ['Kişiselleştirilmiş öneriler', 'Yüksek kaliteli eşleşmeler', 'Gelişmiş filtreleme']
        };
      } else {
        return {
          algorithm: 'basic',
          reason: 'Standart filtreleme algoritması',
          benefits: ['Temel eşleşme önerileri', 'Güvenilir sonuçlar', 'Hızlı yükleme']
        };
      }

    } catch (error) {
      console.error('Algorithm recommendation error:', error);
      return { algorithm: 'basic', reason: 'Sistem hatası' };
    }
  }
}

module.exports = new SmartFilteringController();
