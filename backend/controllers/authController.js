const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const emailService = require('../services/emailService');

// JWT token oluşturma
const generateToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Kullanıcı kayıt
const register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, birth_date, gender } = req.body;

    // Gerekli alanları kontrol et
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'Email, şifre, ad ve soyad alanları zorunludur'
      });
    }

    // Email formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir email adresi giriniz'
      });
    }

    // Şifre uzunluğunu kontrol et
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalıdır'
      });
    }

    // Email'in zaten kullanılıp kullanılmadığını kontrol et
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Bu email adresi zaten kullanılmaktadır'
      });
    }

    // Şifreyi hashle
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Kullanıcıyı oluştur
    const userData = {
      email,
      password: hashedPassword,
      first_name,
      last_name,
      birth_date,
      gender
    };

    const newUser = await User.create(userData);

    // Email doğrulama kodu gönder (şimdilik opsiyonel)
    if (process.env.EMAIL_VERIFICATION_ENABLED === 'true') {
      try {
        const verification_code = EmailVerification.generateVerificationCode();
        const expires_at = EmailVerification.getExpirationTime();

        await EmailVerification.create({
          user_id: newUser.id,
          email: newUser.email,
          verification_code,
          code_type: 'registration',
          expires_at
        });

        // Email gönderme işlemi
        const emailService = require('../services/emailService');
        const userName = `${first_name} ${last_name}`;
        
        if (emailService.isConfigured) {
          try {
            await emailService.sendVerificationCode(email, verification_code, userName);
            console.log(`📧 Doğrulama kodu email ile gönderildi: ${email}`);
          } catch (emailError) {
            console.error('Email gönderme hatası:', emailError);
            console.log(`📧 Doğrulama kodu (email hatası): ${verification_code}`);
          }
        } else {
          console.log(`📧 Doğrulama kodu (email servisi yapılandırılmamış): ${verification_code}`);
        }
      } catch (error) {
        console.error('Email doğrulama kodu oluşturma hatası:', error);
        // Hata olsa bile kullanıcı oluşturma işlemini devam ettir
      }
    }

    // JWT token oluştur
    const token = generateToken(newUser.id, newUser.email);

    // Şifreyi response'dan çıkar
    delete newUser.password;

    res.status(201).json({
      success: true,
      message: process.env.EMAIL_VERIFICATION_ENABLED === 'true' 
        ? 'Kullanıcı oluşturuldu, email doğrulama kodu gönderildi' 
        : 'Kullanıcı başarıyla oluşturuldu',
      data: {
        user: newUser,
        token,
        email_verification_required: process.env.EMAIL_VERIFICATION_ENABLED === 'true'
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Kullanıcı giriş
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login request received:', { 
      email, 
      passwordLength: password ? password.length : 0,
      timestamp: new Date().toISOString(),
      body: req.body
    });

    // Gerekli alanları kontrol et
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email ve şifre alanları zorunludur'
      });
    }

    // Kullanıcıyı bul
    console.log('🔍 Searching for user with email:', email);
    let user;
    try {
      user = await User.findByEmail(email);
    } catch (dbError) {
      console.error('❌ Database error during user lookup:', dbError.message);
      
      // Bağlantı hatası ise özel mesaj
      if (dbError.message.includes('Connection terminated') || 
          dbError.message.includes('timeout') ||
          dbError.code === 'ECONNRESET') {
        return res.status(503).json({
          success: false,
          message: 'Veritabanı bağlantısı geçici olarak kullanılamıyor. Lütfen tekrar deneyin.',
          error_code: 'DATABASE_CONNECTION_ERROR'
        });
      }
      
      // Diğer veritabanı hataları
      return res.status(500).json({
        success: false,
        message: 'Sunucu hatası',
        error_code: 'DATABASE_ERROR'
      });
    }
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'Geçersiz email veya şifre'
      });
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      is_active: user.is_active,
      password_exists: !!user.password,
      password_length: user.password ? user.password.length : 0
    });

    // Kullanıcı aktif mi kontrol et
    if (!user.is_active) {
      console.log('❌ User is not active');
      return res.status(401).json({
        success: false,
        message: 'Hesabınız deaktif durumda'
      });
    }

    // Email doğrulaması kontrolü geçici olarak devre dışı
    // if (process.env.EMAIL_VERIFICATION_ENABLED === 'true' && !user.email_verified) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Email adresinizi doğrulamanız gerekiyor',
    //     requires_email_verification: true
    //   });
    // }

    // Şifreyi kontrol et
    console.log('🔐 Login attempt:', {
      email: email,
      inputPassword: password,
      storedHash: user.password ? user.password.substring(0, 20) + '...' : 'null',
      hashLength: user.password ? user.password.length : 0
    });
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔐 Password comparison result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Password validation failed');
      return res.status(401).json({
        success: false,
        message: 'Geçersiz email veya şifre'
      });
    }
    
    console.log('✅ Password validation successful');

    // JWT token oluştur
    const token = generateToken(user.id, user.email);

    // Şifreyi response'dan çıkar
    delete user.password;

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role || 'user',
          admin_level: user.admin_level || 0,
          is_premium: user.is_premium || false,
          is_active: user.is_active
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Token doğrulama
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token bulunamadı'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token'
      });
    }

    res.json({
      success: true,
      message: 'Token geçerli',
      data: { user }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Geçersiz token'
    });
  }
};

// Şifre sıfırlama kodu gönder
const sendPasswordResetCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email adresi gerekli'
      });
    }

    // Email formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir email adresi giriniz'
      });
    }

    // Kullanıcıyı bul
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Bu email adresi ile kayıtlı kullanıcı bulunamadı'
      });
    }

    // Kullanıcının mevcut şifre sıfırlama kodlarını temizle
    await EmailVerification.clearUserCodes(user.id, 'password_reset');

    // Yeni doğrulama kodu oluştur
    const verification_code = EmailVerification.generateVerificationCode();
    const expires_at = EmailVerification.getExpirationTime();

    // Kodu veritabanına kaydet
    const verificationData = {
      user_id: user.id,
      email,
      verification_code,
      code_type: 'password_reset',
      expires_at
    };

    await EmailVerification.create(verificationData);

    // Reset linki oluştur (frontend URL .env'den)
    const appBaseUrl = process.env.FRONTEND_URL || process.env.PRODUCTION_FRONTEND_URL || 'https://caddate.app';
    // Not: Mobilde deep link kullanmıyorsak, web sayfasına yönlendirir; kodu parametreyle geçiyoruz
    const resetLink = `${appBaseUrl.replace(/\/$/, '')}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(verification_code)}`;

    // Email gönder (5 sn timeout ile, gecikse bile API hızlı dönsün)
    const sendEmailPromise = emailService.sendPasswordResetCode(email, verification_code, user.first_name, resetLink);
    const timeoutMs = 5000;
    try {
      await Promise.race([
        sendEmailPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Email send timeout after ${timeoutMs}ms`)), timeoutMs))
      ]);
      console.log(`Password reset code sent to ${email}: ${verification_code}`);
    } catch (emailError) {
      console.error('Email sending failed or timed out:', emailError.message || emailError);
      // Email gönderilemese bile kod veritabanında, kullanıcıya yine de başarı mesajı veriyoruz
    }

    res.json({
      success: true,
      message: 'Şifre sıfırlama kodu email adresinize gönderildi'
    });

  } catch (error) {
    console.error('Send password reset code error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Şifre sıfırlama kodunu doğrula
const verifyPasswordResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email ve kod gerekli'
      });
    }

    // Kodu doğrula
    const verification = await EmailVerification.verifyCode(email, code, 'password_reset');
    
    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz veya süresi dolmuş kod'
      });
    }

    res.json({
      success: true,
      message: 'Kod doğrulandı',
      data: {
        verification_id: verification.id
      }
    });

  } catch (error) {
    console.error('Verify password reset code error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Yeni şifre belirle
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, kod ve yeni şifre gerekli'
      });
    }

    // Şifre uzunluğunu kontrol et
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Yeni şifre en az 6 karakter olmalıdır'
      });
    }

    // Kodu doğrula
    const verification = await EmailVerification.verifyCode(email, code, 'password_reset');
    
    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz veya süresi dolmuş kod'
      });
    }

    // Kullanıcıyı bul
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Yeni şifreyi hashle
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Şifreyi güncelle
    await User.updatePassword(user.id, hashedPassword);

    // Kullanılan doğrulama kodunu sil
    await EmailVerification.deleteById(verification.id);

    res.json({
      success: true,
      message: 'Şifre başarıyla sıfırlandı'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  register,
  login,
  verifyToken,
  sendPasswordResetCode,
  verifyPasswordResetCode,
  resetPassword
};
