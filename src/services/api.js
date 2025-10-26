import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// API Base URL
// Environment'a göre URL seçimi
const getApiBaseUrl = () => {
  // Development için
  if (__DEV__) {
    console.log('Development mode - detecting connection type...');
    
    // Expo tunnel URL kontrolü
    const expoUrl = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.hostUri;
    console.log('Expo URL detected:', expoUrl);
    
    // Render backend URL'ini kontrol et - Bu URL'yi Render dashboard'unuzdan alın
    // Örnek: https://caddate-backend-abc123.onrender.com
    // RENDER URL'İNİZİ BURAYA YAZIN:
    const renderBackendUrl = 'https://caddate.onrender.com';
    
    // Eğer Render URL'i ayarlanmışsa kullan
    if (renderBackendUrl && renderBackendUrl.includes('onrender.com')) {
      console.log('Render backend URL detected - using Render URL');
      console.log(`Using Render backend URL: ${renderBackendUrl}`);
      return `${renderBackendUrl}/api`;
    }
    
    if (expoUrl && (expoUrl.includes('exp.direct') || expoUrl.includes('ngrok.io'))) {
      // Tunnel modu - internet üzerinden erişilebilir bir URL kullan
      console.log('Tunnel mode detected - using tunnel-compatible URL');
      
      // Tunnel modu için backend URL'inizi buraya yazın
      // Ngrok URL'inizi buraya yazın (örn: https://abc123.ngrok.io)
      const tunnelBackendUrl = process.env.EXPO_PUBLIC_TUNNEL_BACKEND_URL || 'https://your-ngrok-url.ngrok.io';
      console.log(`Using tunnel backend URL: ${tunnelBackendUrl}`);
      return `${tunnelBackendUrl}/api`;
    } else {
      // Yerel ağ modu - gerçek IP adresini kullan
      console.log('Local network mode detected - using local IP');
      const serverIP = '192.168.1.17'; // Telefon için gerçek IP adresi
      console.log(`Using server IP: ${serverIP}`);
      return `http://${serverIP}:3000/api`;
    }
  }
  
  // Production için - Environment değişkenlerinden al
  const productionUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_RENDER_BACKEND_URL || 'https://your-production-api.com';
  console.log('Production mode - using API URL:', productionUrl);
  return `${productionUrl}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// API servis sınıfı
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
    console.log('API Service initialized with URL:', this.baseURL);
  }

  // Fetch için manuel timeout uygula (React Native fetch timeout parametresini desteklemez)
  async fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`İstek zaman aşımına uğradı (${Math.floor(timeoutMs / 1000)} sn). Sunucu geç yanıt veriyor olabilir, lütfen tekrar deneyin.`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Token'ı ayarla
  setToken(token) {
    this.token = token;
  }

  // Token'ı temizle
  clearToken() {
    this.token = null;
  }

  // Base URL'i al
  getBaseURL() {
    return this.baseURL;
  }

  // Token'ı AsyncStorage'a kaydet
  async saveToken(token) {
    try {
      await AsyncStorage.setItem('auth_token', token);
      this.token = token;
    } catch (error) {
      console.error('Token kaydetme hatası:', error);
    }
  }

  // Token'ı AsyncStorage'dan al
  async getStoredToken() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      return token;
    } catch (error) {
      console.error('Token alma hatası:', error);
      return null;
    }
  }

  // Token süresini kontrol et
  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      // JWT token'ı decode et (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = payload.exp;
      
      // Token'ın süresi 5 dakika kala yenile
      const refreshThreshold = 5 * 60; // 5 dakika
      const timeUntilExpiry = expirationTime - currentTime;
      
      console.log('🕐 Token süresi kontrolü:', {
        currentTime: new Date(currentTime * 1000).toLocaleString(),
        expirationTime: new Date(expirationTime * 1000).toLocaleString(),
        timeUntilExpiry: Math.floor(timeUntilExpiry / 60) + ' dakika',
        needsRefresh: timeUntilExpiry < refreshThreshold
      });
      
      return timeUntilExpiry < 0; // Süresi dolmuş mu?
    } catch (error) {
      console.error('Token decode hatası:', error);
      return true; // Hata durumunda token'ı geçersiz say
    }
  }

  // Token'ı otomatik yenile
  async refreshTokenIfNeeded() {
    try {
      const token = await this.getStoredToken();
      
      if (!token) {
        // Token bulunamadı, yenileme atlanıyor (normal durum)
        return false;
      }
      
      // Token süresi kontrolü
      if (this.isTokenExpired(token)) {
        console.log('🔄 Token süresi dolmuş, temizleniyor');
        await this.removeStoredToken();
        this.clearToken();
        return false;
      }
      
      // Token'ı decode et ve süre kontrolü yap
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = payload.exp;
      const refreshThreshold = 5 * 60; // 5 dakika
      const timeUntilExpiry = expirationTime - currentTime;
      
      if (timeUntilExpiry < refreshThreshold && timeUntilExpiry > 0) {
        console.log('🔄 Token yenileme gerekli, yenileme yapılıyor...');
        
        // Backend'de refresh endpoint'i yoksa, kullanıcıyı login'e yönlendir
        console.log('⚠️ Token yenileme endpoint\'i bulunamadı, kullanıcı login\'e yönlendirilecek');
        await this.removeStoredToken();
        this.clearToken();
        return false;
      }
      
      return true; // Token geçerli
    } catch (error) {
      console.error('Token yenileme hatası:', error);
      await this.removeStoredToken();
      this.clearToken();
      return false;
    }
  }

  // Token'ı AsyncStorage'dan sil
  async removeStoredToken() {
    try {
      await AsyncStorage.removeItem('auth_token');
      this.token = null;
    } catch (error) {
      console.error('Token silme hatası:', error);
    }
  }

  // Bağlantı test fonksiyonu
  async testConnection() {
    try {
      console.log('🔍 API bağlantısı test ediliyor...');
      console.log('🔍 Test URL:', `${this.baseURL.replace('/api', '')}/health`);
      console.log('🔍 Base URL:', this.baseURL);
      
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        console.log('✅ API bağlantısı başarılı');
        return true;
      } else {
        console.log('❌ API bağlantısı başarısız:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ API bağlantı testi başarısız:', error.message);
      console.error('❌ Error details:', error);
      return false;
    }
  }

  // HTTP isteği gönder
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Token'ı otomatik olarak kontrol et ve set et
    if (!this.token) {
      const storedToken = await this.getStoredToken();
      if (storedToken) {
        this.token = storedToken;
      }
    }
    
    // Token süresi kontrolü (login ve register endpoint'leri hariç)
    if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
      console.log('🔍 Token kontrolü yapılıyor...', { endpoint, hasToken: !!this.token });
      
      // Eğer token yoksa ve bu auth endpoint'i değilse, token kontrolü yapma
      if (!this.token) {
        console.log('⚠️ Token yok, istek devam ediyor...');
      } else {
        const tokenValid = await this.refreshTokenIfNeeded();
        if (!tokenValid) {
          console.log('⚠️ Token geçersiz, istek iptal ediliyor');
          throw new Error('Token süresi dolmuş, lütfen yeniden giriş yapın');
        }
      }
    } else {
      console.log('✅ Auth endpoint, token kontrolü atlanıyor:', endpoint);
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 30000, // 30 saniye timeout
      ...options,
    };

    // Token varsa Authorization header'ına ekle
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
      console.log('🔑 Authorization header eklendi:', `Bearer ${this.token.substring(0, 20)}...`);
    } else {
      console.log('⚠️ Token yok, Authorization header eklenmedi');
    }

    try {
      console.log('🌐 Making API request to:', url);
      console.log('📋 Request config:', JSON.stringify({ ...config, signal: undefined }, null, 2));
      
      const response = await this.fetchWithTimeout(url, config, config.timeout || 30000);
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Response'un JSON olup olmadığını kontrol et
      let data;
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
          console.log('📄 Response data:', JSON.stringify(data, null, 2));
        } else {
          const textResponse = await response.text();
          console.log('📄 Response text:', textResponse);
          data = { message: textResponse };
        }
      } catch (parseError) {
        console.error('❌ Error parsing response:', parseError);
        data = { message: 'Response parse edilemedi' };
      }

      if (!response.ok) {
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        // Detaylı hata mesajı oluştur
        let errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Backend'den gelen detaylı hata mesajını kullan
        if (data.success === false && data.message) {
          errorMessage = data.message;
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ API request successful');
      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
      console.error('❌ API URL:', url);
      console.error('❌ Request config:', JSON.stringify(config, null, 2));
      
      // Network hatası için özel mesaj
      if (error.message === 'Network request failed' || error.message.includes('Network request timed out')) {
        throw new Error(`Sunucuya bağlanılamıyor. API URL: ${url}. Lütfen internet bağlantınızı kontrol edin ve API sunucusunun çalıştığından emin olun.`);
      }
      
      throw error;
    }
  }

  // GET isteği
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST isteği
  async post(endpoint, data, options = {}) {
    const config = {
      method: 'POST',
      ...options,
    };

    // FormData ise JSON.stringify yapma
    if (data instanceof FormData) {
      config.body = data;
      // FormData için Content-Type'ı kaldır, browser otomatik ayarlar
      if (config.headers) {
        delete config.headers['Content-Type'];
      }
    } else {
      config.body = JSON.stringify(data);
    }

    return this.request(endpoint, config);
  }

  // PUT isteği
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH isteği
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE isteği
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth API'leri
  async register(userData) {
    // Kayıt öncesi eski token'ı temizle
    await this.removeStoredToken();
    this.clearToken();
    
    const response = await this.post('/auth/register', userData);
    
    // Başarılı kayıtta token'ı kaydet
    if (response.success && response.data.token) {
      await this.saveToken(response.data.token);
    }
    
    return response;
  }

  async login(email, password) {
    console.log('🔐 Login başlatılıyor...', { email, passwordLength: password?.length });
    
    // Login öncesi eski token'ı temizle
    await this.removeStoredToken();
    this.clearToken();
    
    console.log('🌐 API isteği gönderiliyor:', `${this.baseURL}/auth/login`);
    
    try {
      const response = await this.post('/auth/login', { email, password });
      
      console.log('✅ Login response alındı:', {
        success: response.success,
        hasData: !!response.data,
        hasToken: !!response.data?.token,
        message: response.message
      });
      
      // Başarılı girişte token'ı kaydet
      if (response.success && response.data && response.data.token) {
        console.log('💾 Token kaydediliyor...');
        await this.saveToken(response.data.token);
        console.log('✅ Token kaydedildi');
      } else {
        console.log('❌ Token bulunamadı:', response);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  async verifyToken() {
    try {
      return await this.get('/auth/verify');
    } catch (error) {
      // Token geçersizse otomatik olarak temizle
      if (error.message.includes('Geçersiz token') || error.message.includes('invalid signature')) {
        console.log('Token geçersiz, temizleniyor...');
        await this.removeStoredToken();
        throw new Error('Token geçersiz, lütfen yeniden giriş yapın');
      }
      throw error;
    }
  }

  async logout() {
    try {
      // Backend'e logout isteği gönder
      await this.post('/auth/logout');
    } catch (error) {
      // Backend hatası olsa bile token'ı temizle
      console.error('Logout error:', error);
    } finally {
      // Her durumda token'ı temizle
      await this.removeStoredToken();
    }
  }

  // User API'leri
  async getProfile() {
    return this.get('/users/profile');
  }

  async getUserProfile(userId) {
    return this.get(`/users/profile/${userId}`);
  }

  async updateProfile(userData) {
    return this.put('/users/profile', userData);
  }

  async deleteAccount() {
    return this.delete('/users/profile');
  }

  async discoverUsers(limit = 20, offset = 0) {
    return this.get(`/users/discover?limit=${limit}&offset=${offset}`);
  }

  async getUserById(id) {
    return this.get(`/users/${id}`);
  }

  // Email API'leri
  async sendVerificationCode(email, codeType = 'registration') {
    return this.post('/email/send-code', { email, code_type: codeType });
  }

  async verifyCode(email, code, codeType = 'registration') {
    return this.post('/email/verify-code', { email, code, code_type: codeType });
  }

  async getEmailServiceStatus() {
    return this.get('/email/status');
  }

  // Settings API'leri
  async getSettings() {
    return this.get('/users/settings');
  }

  async updateSettings(settingsData) {
    return this.put('/users/settings', settingsData);
  }

  // Profil fotoğrafı upload
  async uploadProfilePicture(formData) {
    const url = `${this.baseURL}/users/profile-picture`;
    
    console.log('🌐 API Service - Upload URL:', url);
    console.log('🌐 API Service - Token (first 20 chars):', this.token ? this.token.substring(0, 20) + '...' : 'Yok');
    console.log('🌐 API Service - Base URL:', this.baseURL);
    
    const config = {
      method: 'POST',
      headers: {
        // Content-Type'ı kaldırıyoruz, FormData otomatik ayarlar
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    };
    
    console.log('🌐 API Service - Config:', {
      method: config.method,
      headers: config.headers,
      bodyType: typeof config.body
    });

    try {
      console.log('🌐 API Service - Fetch isteği gönderiliyor...');
      console.log('🌐 API Service - FormData detayları:', {
        hasFormData: formData instanceof FormData,
        formDataKeys: formData._parts ? formData._parts.map(part => part[0]) : 'No parts'
      });
      const response = await fetch(url, config);
      
      console.log('🌐 API Service - Response status:', response.status);
      console.log('🌐 API Service - Response headers:', Object.fromEntries(response.headers.entries()));
      
      let data;
      const contentType = response.headers.get('content-type');
      console.log('🌐 API Service - Content-Type:', contentType);
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log('🌐 API Service - JSON response:', data);
      } else {
        const textResponse = await response.text();
        console.log('🌐 API Service - Text response:', textResponse);
        data = { message: textResponse };
      }

      if (!response.ok) {
        console.log('🌐 API Service - Response not OK:', response.status, response.statusText);
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('🌐 API Service - Success response:', data);
      return data;
    } catch (error) {
      console.error('🌐 API Service - Upload Error:', error);
      console.error('🌐 API Service - Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  // Kullanıcı istatistiklerini getir
  async getUserStats() {
    return this.get('/users/stats');
  }

  // Arkadaş listesini getir
  async getFriends() {
    return this.get('/users/friends');
  }

  // Kullanıcı ara
  async searchUsers(query) {
    return this.get(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // Arkadaş ekle
  async addFriend(friendId) {
    console.log('🌐 API Service - addFriend çağrıldı:', friendId);
    console.log('🌐 API Service - Base URL:', this.baseURL);
    console.log('🌐 API Service - Token:', this.token ? 'Mevcut' : 'Yok');
    
    try {
      const response = await this.post('/friendships', { friendId });
      console.log('🌐 API Service - addFriend yanıtı:', response);
      return response;
    } catch (error) {
      console.error('🌐 API Service - addFriend hatası:', error);
      throw error;
    }
  }

  // Arkadaş çıkar
  async removeFriend(friendId) {
    return this.delete(`/users/friends/${friendId}`);
  }

  // Şifre değiştir
  async changePassword(currentPassword, newPassword) {
    return this.post('/security/change-password', {
      currentPassword,
      newPassword
    });
  }

  async sendEmailVerification() {
    return this.post('/security/send-email-verification');
  }

  async verifyEmailCode(code) {
    return this.post('/security/verify-email-code', { code });
  }

  // Şifre sıfırlama fonksiyonları
  async sendPasswordResetCode(email) {
    return this.post('/auth/send-password-reset-code', { email });
  }

  async verifyPasswordResetCode(email, code) {
    return this.post('/auth/verify-password-reset-code', { email, code });
  }

  async resetPassword(email, code, newPassword) {
    return this.post('/auth/reset-password', { email, code, newPassword });
  }

  async toggle2FA(enabled) {
    return this.post('/security/toggle-2fa', { enabled });
  }

  async getActiveSessions() {
    return this.get('/security/active-sessions');
  }

  async endAllSessions() {
    return this.post('/security/end-all-sessions');
  }

  async getSecurityHistory() {
    return this.get('/security/history');
  }

  async updateSecuritySettings(settings) {
    return this.put('/security/settings', settings);
  }

  // Kayıt sırasında 2FA doğrulama kodu gönder
  async sendRegistration2FA(email, firstName, lastName) {
    return this.post('/security/send-registration-2fa', { email, firstName, lastName });
  }

  // Kayıt sırasında 2FA doğrulama kodunu doğrula
  async verifyRegistration2FA(email, code) {
    return this.post('/security/verify-registration-2fa', { email, code });
  }

  // Konum API'leri
  async updateUserLocation(locationData) {
    return this.post('/location', locationData);
  }

  async getNearbyUsers(radius = 1000, limit = 50) {
    return this.get(`/location/nearby?radius=${radius}&limit=${limit}`);
  }

  async getUserLocationHistory(days = 7) {
    return this.get(`/location/history?days=${days}`);
  }

  async shareLocationWithFriends(friendIds, locationData) {
    return this.post('/location/share', {
      friend_ids: friendIds,
      location: locationData
    });
  }

  async stopLocationSharing() {
    return this.post('/location/stop');
  }

  async setUserOffline(userId) {
    return this.post('/location/offline', { userId });
  }

  async getLocationSettings() {
    return this.get('/location/settings');
  }

  async updateLocationSettings(settings) {
    return this.put('/location/settings', settings);
  }

  // Notification API'leri
  async getNotifications(page = 1, limit = 20, unreadOnly = false) {
    return this.get(`/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`);
  }

  async markNotificationAsRead(notificationId) {
    return this.patch(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.patch('/notifications/mark-all-read');
  }

  async deleteNotification(notificationId) {
    return this.delete(`/notifications/${notificationId}`);
  }

  async deleteReadNotifications() {
    return this.delete('/notifications/cleanup/read');
  }

  async getNotificationStats() {
    return this.get('/notifications/stats');
  }

  // Friendship API'leri
  async getFriends() {
    return this.get('/friendships');
  }

  async getFriendRequests() {
    return this.get('/friendships/requests');
  }

  async sendFriendRequest(friendId) {
    return this.post('/friendships', { friendId });
  }

  async acceptFriendRequest(friendId) {
    return this.post('/friendships/accept', { friendId });
  }

  async declineFriendRequest(friendId) {
    return this.post('/friendships/decline', { friendId });
  }

  async removeFriend(friendId) {
    return this.delete(`/friendships/${friendId}`);
  }

  async blockUser(friendId) {
    return this.post('/friendships/block', { friendId });
  }

  async unblockUser(friendId) {
    return this.delete(`/friendships/unblock/${friendId}`);
  }

  async getFriendsStats() {
    return this.get('/friendships/stats');
  }

  // Advanced Profile API'leri
  async getProfileOptions() {
    return this.get('/users/profile-options');
  }

  async updateAdvancedProfile(profileData) {
    return this.put('/users/advanced-profile', profileData);
  }


  // Social API'leri
  async recordProfileVisit(profileId) {
    return this.post(`/social/visit/${profileId}`);
  }

  async getProfileVisitStats() {
    return this.get('/social/visit-stats');
  }

  async getRecentVisitors(limit = 10) {
    return this.get(`/social/recent-visitors?limit=${limit}`);
  }

  async followUser(userId) {
    return this.post(`/social/follow/${userId}`);
  }

  async unfollowUser(userId) {
    return this.delete(`/social/follow/${userId}`);
  }

  async getFollowers(limit = 20, offset = 0) {
    return this.get(`/social/followers?limit=${limit}&offset=${offset}`);
  }

  async getFollowing(limit = 20, offset = 0) {
    return this.get(`/social/following?limit=${limit}&offset=${offset}`);
  }

  async getFollowStats() {
    return this.get('/social/follow-stats');
  }

  async getFriendsList(limit = 50, offset = 0) {
    return this.get(`/social/friends?limit=${limit}&offset=${offset}`);
  }

  // Özel mesaj fonksiyonları
  async sendPrivateMessage(message, friendId) {
    return this.post('/chat/private/send', {
      message: message,
      friendId: friendId
    });
  }

  async getPrivateMessageHistory(friendId, limit = 50, offset = 0) {
    return this.get(`/chat/private/history?friendId=${friendId}&limit=${limit}&offset=${offset}`);
  }

  async getPrivateConversations(limit = 20, offset = 0) {
    return this.get(`/chat/private/conversations?limit=${limit}&offset=${offset}`);
  }

  // Genel chat fonksiyonları
  async sendMessage(message, room = 'general') {
    return this.post('/chat/send', {
      message: message,
      room: room
    });
  }

  async getMessageHistory(room = 'general', limit = 50, offset = 0) {
    return this.get(`/chat/history?room=${room}&limit=${limit}&offset=${offset}`);
  }

  async markMessageAsRead(messageId) {
    return this.patch(`/chat/${messageId}/read`);
  }

  async getUnreadMessageCount() {
    return this.get('/chat/unread-count');
  }

  // Photo API fonksiyonları
  async uploadPhoto(formData) {
    const url = `${this.baseURL}/photos/upload`;
    
    const config = {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    };

    try {
      const response = await fetch(url, config);
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    }
  }

  async getPhotos(limit = 20, offset = 0) {
    return this.get(`/photos/feed?limit=${limit}&offset=${offset}`);
  }

  async getMyPhotos(limit = 20, offset = 0) {
    return this.get(`/photos/my?limit=${limit}&offset=${offset}`);
  }

  async likePhoto(photoId) {
    return this.post(`/photos/${photoId}/like`);
  }

  async deletePhoto(photoId) {
    return this.delete(`/photos/${photoId}`);
  }

  async updatePhoto(photoId, caption) {
    return this.put(`/photos/${photoId}`, { caption });
  }

  // Vehicle API Methods
  async getUserVehicles() {
    return this.get('/vehicles');
  }

  async getPrimaryVehicle() {
    return this.get('/vehicles/primary');
  }

  async addVehicle(vehicleData) {
    return this.post('/vehicles', vehicleData);
  }

  async updateVehicle(vehicleId, vehicleData) {
    return this.put(`/vehicles/${vehicleId}`, vehicleData);
  }

  async deleteVehicle(vehicleId) {
    return this.delete(`/vehicles/${vehicleId}`);
  }

  async setPrimaryVehicle(vehicleId) {
    return this.put(`/vehicles/${vehicleId}/primary`);
  }

  async uploadVehiclePhoto(vehicleId, formData) {
    console.log('API: Uploading vehicle photo for ID:', vehicleId);
    console.log('API: FormData:', formData);
    return this.post(`/vehicles/${vehicleId}/photo`, formData);
  }

  // Arkadaşın araç bilgilerini getir
  async getFriendVehicles(friendId) {
    return this.get(`/friendships/${friendId}/vehicles`);
  }

  // ==================== MATCHES API ====================
  
  // Kullanıcıyı beğen
  async likeUser(userId) {
    console.log('API: Liking user:', userId);
    return this.post('/matches/like', { likedUserId: userId });
  }

  // Beğeniyi geri al
  async unlikeUser(userId) {
    console.log('API: Unliking user:', userId);
    return this.delete(`/matches/unlike/${userId}`);
  }

  // Eşleşme listesini getir
  async getMatches(params = {}) {
    const { limit = 20, offset = 0, mutualOnly = true } = params;
    console.log('API: Getting matches:', { limit, offset, mutualOnly });
    return this.get(`/matches?limit=${limit}&offset=${offset}&mutualOnly=${mutualOnly}`);
  }

  // Seni beğenenleri getir
  async getLikesReceived(params = {}) {
    const { limit = 20, offset = 0 } = params;
    console.log('API: Getting likes received:', { limit, offset });
    return this.get(`/matches/likes-received?limit=${limit}&offset=${offset}`);
  }

  // Eşleşme önerileri getir
  async getSuggestedMatches(params = {}) {
    const { limit = 20, offset = 0, maxDistance = 100, minAge = 18, maxAge = 99, gender = 'all' } = params;
    console.log('API: Getting suggested matches:', { limit, offset, maxDistance, minAge, maxAge, gender });
    return this.get(`/matches/suggestions?limit=${limit}&offset=${offset}&maxDistance=${maxDistance}&minAge=${minAge}&maxAge=${maxAge}&gender=${gender}`);
  }

  // Eşleşme istatistikleri
  async getMatchStats() {
    console.log('API: Getting match stats');
    return this.get('/matches/stats');
  }

  // ==================== CONFESSIONS API ====================
  
  // İtiraf oluştur
  async createConfession(content, isAnonymous = true) {
    console.log('API: Creating confession:', { content: content.substring(0, 50) + '...', isAnonymous });
    return this.post('/confessions', { content, isAnonymous });
  }

  // İtirafları listele
  async getConfessions(params = {}) {
    const { page = 1, limit = 20, userId } = params;
    console.log('API: Getting confessions:', { page, limit, userId });
    return this.get(`/confessions?page=${page}&limit=${limit}${userId ? `&userId=${userId}` : ''}`);
  }

  // Kullanıcının itiraflarını getir
  async getMyConfessions(params = {}) {
    const { page = 1, limit = 20 } = params;
    console.log('API: Getting my confessions:', { page, limit });
    return this.get(`/confessions/my?page=${page}&limit=${limit}`);
  }

  // İtiraf beğen
  async likeConfession(confessionId) {
    console.log('API: Liking confession:', confessionId);
    return this.post(`/confessions/${confessionId}/like`);
  }

  // İtiraf beğenisini geri al
  async unlikeConfession(confessionId) {
    console.log('API: Unliking confession:', confessionId);
    return this.delete(`/confessions/${confessionId}/like`);
  }

  // İtiraf beğenenlerini getir
  async getConfessionLikes(confessionId) {
    console.log('API: Getting confession likes:', confessionId);
    return this.get(`/confessions/${confessionId}/likes`);
  }

  // İtiraf sil
  async deleteConfession(confessionId) {
    console.log('API: Deleting confession:', confessionId);
    return this.delete(`/confessions/${confessionId}`);
  }

}

// Singleton instance
const apiService = new ApiService();

export default apiService;
