#!/usr/bin/env node

/**
 * CaddateApp Bağlantı Test Scripti
 * Development ortamında bağlantı sorunlarını tespit eder
 */

const fetch = require('node-fetch');

// Test edilecek IP adresleri
const testIPs = [
  '192.168.1.2',
  '192.168.1.9',
  '192.168.0.2',
  '10.0.2.2',
  'localhost',
  '127.0.0.1'
];

// Test edilecek portlar
const testPorts = [3000, 19006, 19000];

async function testConnection(ip, port) {
  const url = `http://${ip}:${port}`;
  
  try {
    console.log(`🔍 Testing: ${url}`);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ SUCCESS: ${url} - Status: ${data.status}`);
      return { ip, port, success: true, data };
    } else {
      console.log(`❌ FAILED: ${url} - Status: ${response.status}`);
      return { ip, port, success: false, status: response.status };
    }
  } catch (error) {
    console.log(`❌ ERROR: ${url} - ${error.message}`);
    return { ip, port, success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 CaddateApp Bağlantı Testi Başlatılıyor...\n');
  
  const results = [];
  
  for (const ip of testIPs) {
    for (const port of testPorts) {
      const result = await testConnection(ip, port);
      results.push(result);
      
      // Kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n📊 Test Sonuçları:');
  console.log('==================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('\n✅ Başarılı Bağlantılar:');
    successful.forEach(result => {
      console.log(`   ${result.ip}:${result.port} - ${result.data?.status || 'OK'}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Başarısız Bağlantılar:');
    failed.forEach(result => {
      console.log(`   ${result.ip}:${result.port} - ${result.error || result.status || 'Unknown error'}`);
    });
  }
  
  console.log('\n💡 Öneriler:');
  console.log('=============');
  
  if (successful.length === 0) {
    console.log('❌ Hiçbir bağlantı başarılı değil!');
    console.log('   1. Backend sunucusunun çalıştığından emin olun');
    console.log('   2. Firewall ayarlarını kontrol edin');
    console.log('   3. IP adresinizi doğrulayın: ipconfig (Windows) veya ifconfig (Mac/Linux)');
  } else {
    const bestConnection = successful[0];
    console.log(`✅ Önerilen API URL: http://${bestConnection.ip}:${bestConnection.port}/api`);
    console.log(`✅ Önerilen Socket URL: http://${bestConnection.ip}:${bestConnection.port}`);
  }
  
  console.log('\n🔧 Manuel Test Komutları:');
  console.log('========================');
  console.log('Backend test: curl http://localhost:3000/health');
  console.log('Frontend test: curl http://localhost:19006');
  console.log('Socket test: curl http://localhost:3000 (Socket.io endpoint)');
}

// Script'i çalıştır
runTests().catch(console.error);
