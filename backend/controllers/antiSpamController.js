const { pool } = require('../config/database');

class AntiSpamController {
  // Kullanıcının günlük beğeni limitini kontrol et
  async checkDailyLikeLimit(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const result = await pool.query(`
        SELECT COUNT(*) as like_count
        FROM matches 
        WHERE user1_id = $1 
        AND DATE(created_at) = $2
      `, [userId, today]);

      const likeCount = parseInt(result.rows[0].like_count);
      
      // Kullanıcı bilgilerini al
      const userInfo = await pool.query(`
        SELECT gender, is_verified, subscription_type, created_at
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userInfo.rows.length === 0) {
        return { allowed: false, reason: 'Kullanıcı bulunamadı' };
      }

      const user = userInfo.rows[0];
      const isNewUser = new Date() - new Date(user.created_at) < 7 * 24 * 60 * 60 * 1000; // 7 gün
      
      // Kız kullanıcılar için sınırsız
      if (user.gender === 'female') {
        return { allowed: true, remaining: -1 };
      }

      // Erkek kullanıcılar için limitler
      let dailyLimit;
      if (user.subscription_type === 'premium') {
        dailyLimit = 50;
      } else if (user.is_verified) {
        dailyLimit = 25;
      } else if (isNewUser) {
        dailyLimit = 10;
      } else {
        dailyLimit = 15;
      }

      const remaining = dailyLimit - likeCount;
      
      return {
        allowed: remaining > 0,
        remaining: remaining,
        dailyLimit: dailyLimit,
        used: likeCount
      };

    } catch (error) {
      console.error('Daily like limit check error:', error);
      return { allowed: false, reason: 'Sistem hatası' };
    }
  }

  // Kullanıcının spam skorunu hesapla
  async calculateSpamScore(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_likes,
          COUNT(CASE WHEN is_mutual = true THEN 1 END) as mutual_likes,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_likes
        FROM matches 
        WHERE user1_id = $1
      `, [userId]);

      const stats = result.rows[0];
      const totalLikes = parseInt(stats.total_likes);
      const mutualLikes = parseInt(stats.mutual_likes);
      const recentLikes = parseInt(stats.recent_likes);

      // Spam skoru hesaplama
      let spamScore = 0;
      
      // Karşılıklı beğeni oranı düşükse spam skoru artar
      if (totalLikes > 0) {
        const mutualRate = mutualLikes / totalLikes;
        if (mutualRate < 0.1) spamScore += 30;
        else if (mutualRate < 0.2) spamScore += 15;
      }

      // Son 24 saatte çok beğeni yapmışsa
      if (recentLikes > 20) spamScore += 25;
      else if (recentLikes > 10) spamScore += 10;

      // Toplam beğeni sayısı çok yüksekse
      if (totalLikes > 100) spamScore += 20;
      else if (totalLikes > 50) spamScore += 10;

      return {
        score: Math.min(spamScore, 100),
        stats: {
          totalLikes,
          mutualLikes,
          recentLikes,
          mutualRate: totalLikes > 0 ? mutualLikes / totalLikes : 0
        }
      };

    } catch (error) {
      console.error('Spam score calculation error:', error);
      return { score: 0, stats: {} };
    }
  }

  // Kullanıcının belirli bir kullanıcıya beğeni gönderip gönderemeyeceğini kontrol et
  async canLikeUser(userId, targetUserId) {
    try {
      // Aynı kullanıcıya daha önce beğeni gönderilmiş mi?
      const existingLike = await pool.query(`
        SELECT * FROM matches 
        WHERE user1_id = $1 AND user2_id = $2
      `, [userId, targetUserId]);

      if (existingLike.rows.length > 0) {
        return {
          allowed: false,
          reason: 'Bu kullanıcıyı zaten beğenmişsiniz'
        };
      }

      // Son beğeni zamanını kontrol et
      const lastLikeTime = await pool.query(`
        SELECT created_at FROM matches 
        WHERE user1_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId]);

      if (lastLikeTime.rows.length > 0) {
        const lastLike = new Date(lastLikeTime.rows[0].created_at);
        const now = new Date();
        const timeDiff = now - lastLike;

        // Son beğeniden 1 saat geçmemişse
        if (timeDiff < 60 * 60 * 1000) {
          return {
            allowed: false,
            reason: 'Çok hızlı beğeni yapıyorsunuz. Lütfen bekleyin.',
            waitTime: Math.ceil((60 * 60 * 1000 - timeDiff) / 1000 / 60) // dakika cinsinden
          };
        }
      }

      // Günlük limit kontrolü
      const limitCheck = await this.checkDailyLikeLimit(userId);
      if (!limitCheck.allowed) {
        return {
          allowed: false,
          reason: `Günlük beğeni limitiniz doldu (${limitCheck.used}/${limitCheck.dailyLimit})`,
          resetTime: 'Yarın 00:00'
        };
      }

      // Spam skoru kontrolü
      const spamScore = await this.calculateSpamScore(userId);
      if (spamScore.score > 70) {
        return {
          allowed: false,
          reason: 'Hesabınız spam olarak işaretlendi. Lütfen daha az beğeni yapın.',
          spamScore: spamScore.score
        };
      }

      return {
        allowed: true,
        remaining: limitCheck.remaining,
        spamScore: spamScore.score
      };

    } catch (error) {
      console.error('Can like user check error:', error);
      return { allowed: false, reason: 'Sistem hatası' };
    }
  }

  // Kız kullanıcılar için öncelikli eşleşme önerileri
  async getPrioritizedMatches(userId, limit = 20) {
    try {
      // Kullanıcının cinsiyetini kontrol et
      const userGender = await pool.query(`
        SELECT gender FROM users WHERE id = $1
      `, [userId]);

      if (userGender.rows.length === 0) {
        return { success: false, message: 'Kullanıcı bulunamadı' };
      }

      const gender = userGender.rows[0].gender;

      // Kız kullanıcılar için özel öncelik sistemi
      if (gender === 'female') {
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
            u.created_at,
            EXTRACT(YEAR FROM AGE(u.birth_date)) as age,
            -- Öncelik skoru hesaplama
            CASE 
              WHEN u.subscription_type = 'premium' THEN 100
              WHEN u.is_verified = true THEN 80
              WHEN u.created_at > NOW() - INTERVAL '30 days' THEN 60
              ELSE 40
            END as priority_score
          FROM users u
          WHERE u.id != $1
            AND u.gender = 'male'
            AND u.is_active = true
            AND u.id NOT IN (
              SELECT user2_id FROM matches WHERE user1_id = $1
              UNION
              SELECT user1_id FROM matches WHERE user2_id = $1
            )
          ORDER BY priority_score DESC, u.created_at DESC
          LIMIT $2
        `;

        const result = await pool.query(query, [userId, limit]);
        
        return {
          success: true,
          matches: result.rows,
          total: result.rows.length
        };
      }

      // Erkek kullanıcılar için normal sistem
      return { success: false, message: 'Bu özellik sadece kız kullanıcılar içindir' };

    } catch (error) {
      console.error('Prioritized matches error:', error);
      return { success: false, message: 'Sistem hatası' };
    }
  }

  // Kullanıcıyı spam olarak işaretle
  async markAsSpam(userId, reason) {
    try {
      await pool.query(`
        INSERT INTO security_history (user_id, activity_type, description, created_at)
        VALUES ($1, 'spam_detected', $2, NOW())
      `, [userId, reason]);

      // Kullanıcının spam skorunu güncelle
      const spamScore = await this.calculateSpamScore(userId);
      
      if (spamScore.score > 80) {
        // Hesabı geçici olarak kilitle
        await pool.query(`
          UPDATE users 
          SET is_active = false, 
              last_activity = NOW()
          WHERE id = $1
        `, [userId]);

        return {
          success: true,
          message: 'Kullanıcı spam olarak işaretlendi ve hesabı kilitlendi',
          spamScore: spamScore.score
        };
      }

      return {
        success: true,
        message: 'Kullanıcı spam olarak işaretlendi',
        spamScore: spamScore.score
      };

    } catch (error) {
      console.error('Mark as spam error:', error);
      return { success: false, message: 'Sistem hatası' };
    }
  }

  // Kullanıcının spam durumunu kontrol et
  async checkSpamStatus(userId) {
    try {
      const spamScore = await this.calculateSpamScore(userId);
      const limitCheck = await this.checkDailyLikeLimit(userId);

      return {
        spamScore: spamScore.score,
        dailyLimit: limitCheck,
        isSpam: spamScore.score > 70,
        recommendations: this.getSpamRecommendations(spamScore.score)
      };

    } catch (error) {
      console.error('Spam status check error:', error);
      return { spamScore: 0, isSpam: false };
    }
  }

  // Spam önerileri
  getSpamRecommendations(spamScore) {
    if (spamScore < 30) {
      return ['Hesabınız temiz görünüyor'];
    } else if (spamScore < 50) {
      return [
        'Daha az beğeni yapın',
        'Karşılıklı beğeni alan kullanıcılara odaklanın'
      ];
    } else if (spamScore < 70) {
      return [
        'Beğeni sayınızı azaltın',
        'Profilinizi güncelleyin',
        'Daha kaliteli etkileşimler kurun'
      ];
    } else {
      return [
        'Hesabınız spam olarak işaretlendi',
        'Lütfen 24 saat bekleyin',
        'Daha az beğeni yapın'
      ];
    }
  }
}

module.exports = new AntiSpamController();
