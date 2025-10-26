const { pool } = require('../config/database');
const { createNotification } = require('./notificationController');

class VerificationController {
  // Kullanıcı doğrulama seviyelerini kontrol et
  async getVerificationLevel(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          is_verified,
          phone_verified,
          email_verified,
          subscription_type,
          created_at,
          profile_completeness
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return { level: 0, details: {} };
      }

      const user = result.rows[0];
      let verificationLevel = 0;
      const details = {};

      // Email doğrulama (zorunlu)
      if (user.email_verified) {
        verificationLevel += 1;
        details.email = true;
      }

      // Telefon doğrulama
      if (user.phone_verified) {
        verificationLevel += 2;
        details.phone = true;
      }

      // Profil tamamlama
      if (user.profile_completeness >= 80) {
        verificationLevel += 1;
        details.profileComplete = true;
      }

      // Premium üyelik
      if (user.subscription_type === 'premium') {
        verificationLevel += 3;
        details.premium = true;
      }

      // Hesap yaşı (30 günden eski)
      const accountAge = new Date() - new Date(user.created_at);
      if (accountAge > 30 * 24 * 60 * 60 * 1000) {
        verificationLevel += 1;
        details.oldAccount = true;
      }

      return {
        level: Math.min(verificationLevel, 10),
        details,
        benefits: this.getVerificationBenefits(verificationLevel)
      };

    } catch (error) {
      console.error('Verification level check error:', error);
      return { level: 0, details: {} };
    }
  }

  // Doğrulama seviyesine göre faydalar
  getVerificationBenefits(level) {
    if (level >= 8) {
      return [
        'Sınırsız beğeni hakkı',
        'Öncelikli profil görünürlüğü',
        'Premium filtreler',
        'Gelişmiş arama seçenekleri'
      ];
    } else if (level >= 5) {
      return [
        'Günlük 50 beğeni hakkı',
        'Öncelikli profil görünürlüğü',
        'Temel filtreler'
      ];
    } else if (level >= 3) {
      return [
        'Günlük 25 beğeni hakkı',
        'Standart profil görünürlüğü'
      ];
    } else {
      return [
        'Günlük 10 beğeni hakkı',
        'Sınırlı profil görünürlüğü'
      ];
    }
  }

  // Telefon doğrulama kodu gönder
  async sendPhoneVerificationCode(userId, phoneNumber) {
    try {
      // Basit 6 haneli kod oluştur
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Kodu veritabanına kaydet (geçici)
      await pool.query(`
        INSERT INTO phone_verifications (user_id, phone_number, code, expires_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')
        ON CONFLICT (user_id) DO UPDATE 
        SET code = $3, expires_at = NOW() + INTERVAL '10 minutes'
      `, [userId, phoneNumber, code]);

      // Gerçek uygulamada SMS servisi kullanılacak
      console.log(`📱 Telefon doğrulama kodu: ${code} (${phoneNumber})`);
      
      return {
        success: true,
        message: 'Doğrulama kodu gönderildi',
        code: code // Test için
      };

    } catch (error) {
      console.error('Send phone verification error:', error);
      return { success: false, message: 'Kod gönderilemedi' };
    }
  }

  // Telefon doğrulama kodunu kontrol et
  async verifyPhoneCode(userId, code) {
    try {
      const result = await pool.query(`
        SELECT * FROM phone_verifications 
        WHERE user_id = $1 AND code = $2 AND expires_at > NOW()
      `, [userId, code]);

      if (result.rows.length === 0) {
        return { success: false, message: 'Geçersiz veya süresi dolmuş kod' };
      }

      // Kullanıcıyı telefon doğrulaması yapılmış olarak işaretle
      await pool.query(`
        UPDATE users 
        SET phone_verified = true, phone_number = $2
        WHERE id = $1
      `, [userId, result.rows[0].phone_number]);

      // Geçici kaydı sil
      await pool.query(`
        DELETE FROM phone_verifications WHERE user_id = $1
      `, [userId]);

      return {
        success: true,
        message: 'Telefon numarası doğrulandı'
      };

    } catch (error) {
      console.error('Verify phone code error:', error);
      return { success: false, message: 'Doğrulama başarısız' };
    }
  }

  // Profil tamamlama oranını hesapla
  async calculateProfileCompleteness(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          first_name, last_name, birth_date, gender,
          profile_picture, bio, location_latitude, location_longitude,
          phone_number, email
        FROM users WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return 0;
      }

      const user = result.rows[0];
      let completeness = 0;
      const totalFields = 9;

      // Zorunlu alanlar (40%)
      if (user.first_name) completeness += 5;
      if (user.last_name) completeness += 5;
      if (user.birth_date) completeness += 5;
      if (user.gender) completeness += 5;
      if (user.email) completeness += 5;
      if (user.phone_number) completeness += 5;
      if (user.location_latitude && user.location_longitude) completeness += 10;

      // Opsiyonel alanlar (60%)
      if (user.profile_picture) completeness += 20;
      if (user.bio && user.bio.length > 10) completeness += 20;
      if (user.location_latitude && user.location_longitude) completeness += 20;

      // Profil tamamlama oranını güncelle
      await pool.query(`
        UPDATE users 
        SET profile_completeness = $2 
        WHERE id = $1
      `, [userId, completeness]);

      return completeness;

    } catch (error) {
      console.error('Profile completeness calculation error:', error);
      return 0;
    }
  }

  // Doğrulama seviyesine göre beğeni limitini hesapla
  async getLikeLimitByVerification(userId) {
    try {
      const verification = await this.getVerificationLevel(userId);
      const level = verification.level;

      let dailyLimit;
      if (level >= 8) {
        dailyLimit = -1; // Sınırsız
      } else if (level >= 5) {
        dailyLimit = 50;
      } else if (level >= 3) {
        dailyLimit = 25;
      } else {
        dailyLimit = 10;
      }

      return {
        dailyLimit,
        verificationLevel: level,
        benefits: verification.benefits
      };

    } catch (error) {
      console.error('Like limit calculation error:', error);
      return { dailyLimit: 10, verificationLevel: 0 };
    }
  }

  // Kullanıcı doğrulama önerileri
  async getVerificationSuggestions(userId) {
    try {
      const verification = await this.getVerificationLevel(userId);
      const suggestions = [];

      if (!verification.details.email) {
        suggestions.push({
          type: 'email',
          title: 'Email Adresinizi Doğrulayın',
          description: 'Email doğrulaması yaparak güvenliğinizi artırın',
          priority: 'high'
        });
      }

      if (!verification.details.phone) {
        suggestions.push({
          type: 'phone',
          title: 'Telefon Numaranızı Doğrulayın',
          description: 'Telefon doğrulaması ile daha fazla beğeni hakkı kazanın',
          priority: 'medium'
        });
      }

      if (!verification.details.profileComplete) {
        suggestions.push({
          type: 'profile',
          title: 'Profilinizi Tamamlayın',
          description: 'Profil fotoğrafı ve bio ekleyerek daha çok eşleşme bulun',
          priority: 'medium'
        });
      }

      if (!verification.details.premium) {
        suggestions.push({
          type: 'premium',
          title: 'Premium Üyelik',
          description: 'Premium üyelik ile sınırsız beğeni ve öncelikli görünürlük',
          priority: 'low'
        });
      }

      return {
        suggestions,
        currentLevel: verification.level,
        nextLevelBenefits: this.getNextLevelBenefits(verification.level)
      };

    } catch (error) {
      console.error('Verification suggestions error:', error);
      return { suggestions: [], currentLevel: 0 };
    }
  }

  // Sonraki seviye faydaları
  getNextLevelBenefits(currentLevel) {
    if (currentLevel < 3) {
      return ['Günlük 25 beğeni hakkı', 'Daha iyi profil görünürlüğü'];
    } else if (currentLevel < 5) {
      return ['Günlük 50 beğeni hakkı', 'Öncelikli görünürlük'];
    } else if (currentLevel < 8) {
      return ['Sınırsız beğeni hakkı', 'Premium filtreler'];
    } else {
      return ['Maksimum seviyeye ulaştınız!'];
    }
  }
}

module.exports = new VerificationController();
