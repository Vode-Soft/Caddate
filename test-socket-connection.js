// Socket.io bağlantı testi
const { io } = require('socket.io-client');

async function testSocketConnection() {
  console.log('🔌 Socket.io bağlantı testi başlatılıyor...');
  
  // Render backend URL'i
  const renderUrl = 'https://caddate.onrender.com';
  const socketUrl = renderUrl.replace('https://', 'wss://');
  
  console.log('🔌 Test URL:', socketUrl);
  
  // Test token (gerçek bir token kullanmanız gerekecek)
  const testToken = 'your-test-token-here';
  
  const socket = io(socketUrl, {
    auth: {
      token: testToken
    },
    transports: ['polling', 'websocket'],
    timeout: 10000,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });
  
  socket.on('connect', () => {
    console.log('✅ Socket bağlandı!');
    console.log('🔌 Socket ID:', socket.id);
    console.log('🔌 Transport:', socket.io.engine.transport.name);
    console.log('🔌 URL:', socket.io.uri);
    
    // Test mesajı gönder
    socket.emit('request_online_users');
    console.log('📤 Test mesajı gönderildi');
    
    // 5 saniye sonra bağlantıyı kapat
    setTimeout(() => {
      socket.disconnect();
      console.log('🔌 Test tamamlandı, bağlantı kapatıldı');
      process.exit(0);
    }, 5000);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Socket bağlantı hatası:', error.message);
    console.error('❌ Error type:', error.type);
    console.error('❌ Error description:', error.description);
    process.exit(1);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket bağlantısı kesildi:', reason);
  });
  
  socket.on('online_users_list', (data) => {
    console.log('👥 Online kullanıcılar:', data);
  });
  
  // 30 saniye timeout
  setTimeout(() => {
    console.log('⏰ Test timeout - bağlantı kurulamadı');
    socket.disconnect();
    process.exit(1);
  }, 30000);
}

// Test'i çalıştır
testSocketConnection().catch(console.error);
