import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// API Base URL
// Environment'a göre URL seçimi
const getApiBaseUrl = () => {
  // Development için
  if (__DEV__) {
    // Telefon/emülatör için gerçek IP adresini kullan
    console.log('Development mode - using network IP API');
    return 'http://192.168.1.2:3000/api';
  }
  // Production için
  return 'https://your-production-api.com/api';
};

const API_BASE_URL = getApiBaseUrl();

// API servis sınıfı
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
    console.log('API Service initialized with URL:', this.baseURL);
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

  // Token'ı AsyncStorage'dan sil
  async removeStoredToken() {
    try {
      await AsyncStorage.removeItem('auth_token');
      this.token = null;
    } catch (error) {
      console.error('Token silme hatası:', error);
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
    }

    try {
      const response = await fetch(url, config);
      
      // Response'un JSON olup olmadığını kontrol et
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
      console.error('API Error:', error);
      console.error('API URL:', url);
      console.error('Request config:', config);
      
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
    const response = await this.post('/auth/register', userData);
    
    // Başarılı kayıtta token'ı kaydet
    if (response.success && response.data.token) {
      await this.saveToken(response.data.token);
    }
    
    return response;
  }

  async login(email, password) {
    const response = await this.post('/auth/login', { email, password });
    
    // Başarılı girişte token'ı kaydet
    if (response.success && response.data.token) {
      await this.saveToken(response.data.token);
    }
    
    return response;
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
    return this.post('/friendships', { friendId });
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

}

// Singleton instance
const apiService = new ApiService();

export default apiService;
