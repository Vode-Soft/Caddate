const nodemailer = require('nodemailer');
const querystring = require('querystring');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.lastConfig = null;
    this.lastVerifyOk = null;
    this.lastVerifyError = null;
  }

  // SMTP yapılandırması
  configure(config) {
    try {
      // Varsayılan zaman aşımı ve debug ayarları
      const connectionTimeout = parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || config.connectionTimeout || 8000);
      const greetingTimeout = parseInt(process.env.SMTP_GREETING_TIMEOUT_MS || config.greetingTimeout || 8000);
      const socketTimeout = parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || config.socketTimeout || 10000);
      const enableDebug = (process.env.SMTP_DEBUG === 'true') || !!config.debug;

      const transporterConfig = {
        host: config.host,
        port: config.port,
        secure: !!config.secure, // true for 465, false for STARTTLS (587)
        auth: {
          user: config.user,
          pass: config.pass
        },
        tls: {
          rejectUnauthorized: false, // Self-signed cert için
          ciphers: 'TLSv1.2'
        },
        requireTLS: config.requireTLS === undefined ? (config.port === 587 && !config.secure) : !!config.requireTLS,
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
        logger: enableDebug,
        debug: enableDebug
      };

      this.transporter = nodemailer.createTransport(transporterConfig);
      this.lastConfig = { ...transporterConfig };

      this.isConfigured = true;
      console.log('✅ Email servisi yapılandırıldı');
    } catch (error) {
      console.error('❌ Email servisi yapılandırılamadı:', error.message);
      this.isConfigured = false;
    }
  }

  // Mevcut transporter ile bağlantıyı doğrula, gerekirse alternatif ayarlarla yeniden dene
  async verifyAndMaybeFallback() {
    if (!this.transporter) {
      this.lastVerifyOk = false;
      this.lastVerifyError = new Error('Transporter yok');
      return false;
    }

    const tryVerify = async () => {
      try {
        await this.transporter.verify();
        this.lastVerifyOk = true;
        this.lastVerifyError = null;
        console.log('✅ SMTP verify başarılı');
        return true;
      } catch (err) {
        this.lastVerifyOk = false;
        this.lastVerifyError = err;
        console.error('❌ SMTP verify hatası:', err.message);
        return false;
      }
    };

    // Önce mevcut ayarlarla dene
    if (await tryVerify()) return true;

    // ETIMEDOUT/ECONNECTION vb. ise bir kez fallback dene
    const code = this.lastVerifyError?.code;
    if ((code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'EAUTH' || code === 'ESOCKET') && this.lastConfig) {
      try {
        console.log('🔁 SMTP verify için alternatif ayarlar deneniyor...');
        const fallback = { ...this.lastConfig };
        if (fallback.port === 587 && !fallback.secure) {
          fallback.port = 465;
          fallback.secure = true;
          fallback.requireTLS = false;
        } else {
          fallback.port = 587;
          fallback.secure = false;
          fallback.requireTLS = true;
        }
        this.transporter = require('nodemailer').createTransport(fallback);
        this.lastConfig = { ...fallback };
        if (await tryVerify()) return true;
      } catch (fallbackErr) {
        console.error('❌ SMTP fallback verify hatası:', fallbackErr.message);
      }
    }

    return false;
  }

  // Email gönderme
  async sendEmail(to, subject, html, text) {
    if (!this.isConfigured) {
      // SMTP yapılandırılmamışsa HTTP sağlayıcı fallback'ini dene
      return await this.sendViaHttpProvider(to, subject, html, text);
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@caddateapp.com',
        to: to,
        subject: subject,
        html: html,
        text: text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email gönderildi:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Email gönderme hatası:', error.message);
      // Zaman aşımı veya bağlantı hatasında bir kez alternatif ayarlarla yeniden dene
      if ((error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') && this.lastConfig) {
        try {
          console.log('🔁 Alternatif SMTP ayarlarıyla yeniden deneniyor...');
          const fallback = { ...this.lastConfig };
          if (fallback.port === 587 && !fallback.secure) {
            // 587 STARTTLS başarısızsa 465 SSL dene
            fallback.port = 465;
            fallback.secure = true;
            fallback.requireTLS = false;
          } else {
            // 465 başarısızsa 587 STARTTLS dene
            fallback.port = 587;
            fallback.secure = false;
            fallback.requireTLS = true;
          }
          this.transporter = nodemailer.createTransport(fallback);
          this.lastConfig = { ...fallback };
          const result = await this.transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@caddateapp.com',
            to,
            subject,
            html,
            text
          });
          console.log('✅ Retry başarılı, email gönderildi:', result.messageId);
          return result;
        } catch (retryError) {
          console.error('❌ Retry de başarısız:', retryError.message);
          // SMTP tamamen başarısızsa HTTP sağlayıcıya düş
          return await this.sendViaHttpProvider(to, subject, html, text);
        }
      }
      // Diğer hatalarda da HTTP sağlayıcıya düşmeyi dene
      return await this.sendViaHttpProvider(to, subject, html, text);
    }
  }

  // SMTP başarısız olursa HTTP e-posta sağlayıcı (SendGrid/Mailgun) ile gönderim
  async sendViaHttpProvider(to, subject, html, text) {
    const provider = (process.env.EMAIL_HTTP_PROVIDER || '').toLowerCase();
    try {
      if (provider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
        const payload = {
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.SMTP_FROM || 'noreply@caddateapp.com', name: 'CaddateApp' },
          subject,
          content: [
            { type: 'text/plain', value: text || '' },
            { type: 'text/html', value: html || '' }
          ]
        };

        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          console.log('✅ SendGrid ile email gönderildi');
          return { messageId: res.headers.get('x-message-id') || 'sendgrid' };
        }
        const errText = await res.text();
        throw new Error(`SendGrid hata: ${res.status} ${errText}`);
      }

      if (provider === 'mailgun' && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
        const auth = Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64');
        const body = querystring.stringify({
          from: process.env.SMTP_FROM || `CaddateApp <mailgun@${process.env.MAILGUN_DOMAIN}>`,
          to,
          subject,
          text: text || '',
          html: html || ''
        });

        const res = await fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body
        });
        if (res.ok) {
          console.log('✅ Mailgun ile email gönderildi');
          const data = await res.json().catch(() => ({}));
          return { messageId: data.id || 'mailgun' };
        }
        const errText = await res.text();
        throw new Error(`Mailgun hata: ${res.status} ${errText}`);
      }

      // HTTP sağlayıcı yapılandırılmamışsa hata fırlat
      throw new Error('SMTP başarısız ve HTTP email sağlayıcı yapılandırılmamış');
    } catch (httpErr) {
      console.error('❌ HTTP email sağlayıcı hatası:', httpErr.message);
      throw httpErr;
    }
  }

  // Doğrulama kodu emaili gönder
  async sendVerificationCode(email, code, userName) {
    const subject = 'CaddateApp - Email Doğrulama Kodu';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Doğrulama</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF6B6B, #4ECDC4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { background: #FF6B6B; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 CaddateApp'e Hoş Geldiniz!</h1>
          </div>
          <div class="content">
            <h2>Merhaba ${userName},</h2>
            <p>Hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
            <div class="code">${code}</div>
            <p><strong>Bu kod 10 dakika geçerlidir.</strong></p>
            <p>Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
            <p>İyi eğlenceler! 💕</p>
          </div>
          <div class="footer">
            <p>CaddateApp - Aşkı Bul, Hayatı Paylaş</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      CaddateApp - Email Doğrulama Kodu
      
      Merhaba ${userName},
      
      Hesabınızı doğrulamak için aşağıdaki kodu kullanın:
      
      ${code}
      
      Bu kod 10 dakika geçerlidir.
      
      Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.
      
      İyi eğlenceler!
      
      CaddateApp - Aşkı Bul, Hayatı Paylaş
    `;

    return await this.sendEmail(email, subject, html, text);
  }

  // Şifre sıfırlama emaili gönder
  async sendPasswordResetCode(email, code, userName, resetLink) {
    const subject = 'CaddateApp - Şifre Sıfırlama Kodu';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Şifre Sıfırlama</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF6B6B, #4ECDC4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { background: #FF6B6B; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Şifre Sıfırlama</h1>
          </div>
          <div class="content">
            <h2>Merhaba ${userName},</h2>
            <p>Şifrenizi sıfırlamak için aşağıdaki kodu kullanın:</p>
            <div class="code">${code}</div>
            <p><strong>Bu kod 10 dakika geçerlidir.</strong></p>
            ${resetLink ? `
            <p>Veya aşağıdaki butona tıklayarak şifre sıfırlama sayfasına gidebilirsiniz:</p>
            <p style="text-align:center;">
              <a href="${resetLink}"
                 style="display:inline-block;background:#4ECDC4;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">
                 Şifreyi Sıfırla
              </a>
            </p>
            <p style="font-size:12px;color:#666;word-break:break-all;">
              Bağlantı: ${resetLink}
            </p>
            ` : ''}
            <p>Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
          </div>
          <div class="footer">
            <p>CaddateApp - Aşkı Bul, Hayatı Paylaş</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      CaddateApp - Şifre Sıfırlama Kodu
      
      Merhaba ${userName},
      
      Şifrenizi sıfırlamak için aşağıdaki kodu kullanın:
      
      ${code}
      
      Bu kod 10 dakika geçerlidir.
      
      ${resetLink ? `Alternatif olarak bu bağlantıyı açabilirsiniz: ${resetLink}` : ''}
      
      Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.
      
      CaddateApp - Aşkı Bul, Hayatı Paylaş
    `;

    return await this.sendEmail(email, subject, html, text);
  }

  // Test emaili gönder
  async sendTestEmail(to) {
    const subject = 'CaddateApp - Test Emaili';
    const html = '<h1>Test Emaili</h1><p>Email servisi çalışıyor!</p>';
    const text = 'Test Emaili - Email servisi çalışıyor!';
    
    return await this.sendEmail(to, subject, html, text);
  }
}

// Singleton instance
const emailService = new EmailService();

module.exports = emailService;
