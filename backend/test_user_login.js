const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function testUser() {
  try {
    console.log('🔍 Kullanıcı aranıyor: kerim5781@gmail.com');
    const user = await User.findByEmail('kerim5781@gmail.com');
    
    if (!user) {
      console.log('❌ Kullanıcı bulunamadı');
      return;
    }
    
    console.log('✅ Kullanıcı bulundu:', {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      password_length: user.password ? user.password.length : 0,
      password_preview: user.password ? user.password.substring(0, 20) + '...' : 'null'
    });
    
    // Şifre testi
    const testPassword = 'Kerim123.';
    console.log('🔐 Şifre testi yapılıyor...');
    console.log('Input password:', testPassword);
    console.log('Stored hash preview:', user.password ? user.password.substring(0, 30) + '...' : 'null');
    
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log('🔐 Şifre doğrulama sonucu:', isValid);
    
    if (!isValid) {
      console.log('🔧 Şifre hash\'i yeniden oluşturuluyor...');
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log('Yeni hash:', newHash.substring(0, 30) + '...');
      
      // Kullanıcının şifresini güncelle
      await User.updatePassword(user.id, newHash);
      console.log('✅ Şifre güncellendi');
      
      // Tekrar test et
      const isValidAfterUpdate = await bcrypt.compare(testPassword, newHash);
      console.log('🔐 Güncelleme sonrası şifre doğrulama:', isValidAfterUpdate);
    }
    
  } catch (error) {
    console.error('❌ Test hatası:', error);
  }
  process.exit(0);
}

testUser();
