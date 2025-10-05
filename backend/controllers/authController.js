const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');

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
    const user = await User.findByEmail(email);
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
        user,
        token
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

module.exports = {
  register,
  login,
  verifyToken
};
