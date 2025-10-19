import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Platform,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { 
  scale, 
  verticalScale, 
  scaleFont, 
  getResponsivePadding, 
  getResponsiveFontSize,
  getResponsiveSpacing,
  getResponsiveBorderRadius,
  getResponsiveIconSize,
  getResponsiveButtonHeight,
  getResponsiveInputHeight,
  getResponsiveWidth,
  getResponsiveHeight,
  getContainerPadding,
  getHeaderHeight,
  getTabBarHeight,
  getListItemHeight,
  getAvatarSize,
  getMinTouchTarget,
  getPlatformShadow,
  spacing,
  fontSizes,
  isIOS,
  isAndroid,
  isTablet,
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
  getScreenSize,
  getLayoutConfig,
  getBottomSafeArea
} from '../utils/responsive';
import socketService from '../services/socketService';
import apiService from '../services/api';

export default function ChatScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('private');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const flatListRef = useRef(null);

  // Kullanıcı bilgilerini yükle
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = await apiService.getStoredToken();
        if (token) {
          apiService.setToken(token);
          const response = await apiService.getProfile();
          if (response.success) {
            setCurrentUser(response.data);
          }
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri yüklenemedi:', error);
      }
    };
    
    loadCurrentUser();
  }, []);

  // API entegrasyonu için mesaj gönderme fonksiyonu
  const sendMessageToAPI = async (message, room = 'general', receiverId = null) => {
    try {
      console.log('API ile mesaj gönderiliyor:', { message, room, receiverId });
      
      let response;
      if (receiverId) {
        // Özel mesaj
        response = await apiService.sendPrivateMessage(message, receiverId);
      } else {
        // Genel mesaj
        response = await apiService.post('/chat/send', {
          message: message,
          room: room
        });
      }
      
      if (response.success) {
        console.log('Mesaj API ile başarıyla gönderildi:', response.data);
        return response.data;
      } else {
        console.error('Mesaj gönderme hatası:', response.message);
        return null;
      }
    } catch (error) {
      console.error('API mesaj gönderme hatası:', error);
      return null;
    }
  };

  // API'den mesaj geçmişini yükle
  const loadMessageHistory = async (room = 'general', friendId = null) => {
    try {
      console.log('Mesaj geçmişi yükleniyor:', { room, friendId });
      
      let response;
      if (friendId) {
        // Özel mesaj geçmişi
        response = await apiService.getPrivateMessageHistory(friendId, 50, 0);
      } else {
        // Genel mesaj geçmişi
        response = await apiService.get('/chat/history', {
          room: room,
          limit: 50,
          offset: 0
        });
      }
      
      if (response.success) {
        console.log('Mesaj geçmişi yüklendi:', response.data);
        return response.data;
      } else {
        console.error('Mesaj geçmişi yükleme hatası:', response.message);
        return [];
      }
    } catch (error) {
      console.error('API mesaj geçmişi hatası:', error);
      return [];
    }
  };


  const handleOnlineUsersList = useCallback((users) => {
    console.log('ChatScreen: Online kullanıcı listesi alındı:', users);
    setOnlineUsers(users);
  }, []);

  const handleUserJoined = useCallback((data) => {
    console.log('ChatScreen: Kullanıcı katıldı:', data);
    // Online kullanıcı listesini güncelle
    setOnlineUsers(prev => [...prev, data]);
  }, []);

  const handleUserLeft = useCallback((data) => {
    console.log('ChatScreen: Kullanıcı ayrıldı:', data);
    // Online kullanıcı listesinden çıkar
    setOnlineUsers(prev => prev.filter(user => user.userId !== data.userId));
  }, []);

  const handleConnectionError = useCallback((error) => {
    console.error('Socket bağlantı hatası:', error);
    setIsSocketConnected(false);
    Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
  }, []);

  const handleConnectionStatus = useCallback((status) => {
    console.log('ChatScreen: Socket bağlantı durumu:', status);
    setIsSocketConnected(status.connected);
  }, []);



  // Socket.io bağlantısını yönet
  useEffect(() => {
    console.log('ChatScreen: Socket bağlantısı başlatılıyor...');
    
    // Socket bağlantısını başlat
    socketService.connect();

    // Socket bağlantısını kontrol et ve odaya katıl
    const checkConnection = () => {
      const connected = socketService.isSocketConnected();
      if (connected) {
        console.log('ChatScreen: Socket bağlantısı kuruldu');
        setIsSocketConnected(true);
        // Genel odaya katıl
        socketService.joinRoom('general');
        // Kullanıcı durumunu online olarak güncelle
        socketService.updateUserStatus('online');
        // Mesaj geçmişi ayrı useEffect'te yüklenecek
      } else {
        console.log('ChatScreen: Socket bağlantısı yok, tekrar denenecek...');
        setIsSocketConnected(false);
        // Kısa bir süre sonra tekrar kontrol et
        setTimeout(checkConnection, 1000);
      }
    };

    // İlk kontrol
    checkConnection();

    // Event listener'ları kaydet
    socketService.on('connection_error', handleConnectionError);
    socketService.on('connection_status', handleConnectionStatus);
    socketService.on('online_users_list', handleOnlineUsersList);
    socketService.on('user_joined', handleUserJoined);
    socketService.on('user_left', handleUserLeft);

    // Cleanup function
    return () => {
      socketService.off('connection_error', handleConnectionError);
      socketService.off('connection_status', handleConnectionStatus);
      socketService.off('online_users_list', handleOnlineUsersList);
      socketService.off('user_joined', handleUserJoined);
      socketService.off('user_left', handleUserLeft);
    };
  }, [handleConnectionError, handleConnectionStatus, handleOnlineUsersList, handleUserJoined, handleUserLeft]);

  // Component unmount olduğunda socket bağlantısını kapatma
  // Socket bağlantısı global olarak yönetiliyor
  useEffect(() => {
    return () => {
      console.log('🔌 ChatScreen: Component unmount, socket bağlantısı açık bırakılıyor');
      // socketService.disconnect(); // Bu satırı kaldırdık
    };
  }, []);

  const [privateChats, setPrivateChats] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showFriendRequests, setShowFriendRequests] = useState(true);
  const [sentRequests, setSentRequests] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);


  // Arkadaş listesini döndür
  const getFriendsWithOnlineStatus = () => {
    console.log('getFriendsWithOnlineStatus called, friends count:', friends.length);
    return friends;
  };

  // Arkadaş arama fonksiyonu
  const searchUsers = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = await apiService.getStoredToken();
      if (!token) {
        setSearchResults([]);
        return;
      }
      
      apiService.setToken(token);
      const response = await apiService.searchUsers(query);
      
      console.log('Search users response:', response);
      
      if (response.success && response.data) {
        // Mevcut arkadaşların ID'lerini al
        const friendIds = friends.map(friend => friend.id);
        
        const users = response.data
          .filter(user => !friendIds.includes(user.id)) // Zaten arkadaş olanları filtrele
          .map(user => {
            // Profil fotoğrafı URL'sini tam URL'ye çevir
            let profilePictureUrl = user.profilePicture || user.profile_picture || null;
            if (profilePictureUrl && profilePictureUrl.startsWith('/uploads/')) {
              // API base URL'ini al ve profil fotoğrafı URL'sini tamamla
              const apiBaseUrl = apiService.baseURL.replace('/api', '');
              profilePictureUrl = `${apiBaseUrl}${profilePictureUrl}`;
            }
            
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: '👤', // Fallback avatar
              mutualFriends: user.mutualFriendsCount || 0,
              isFriend: false,
              profilePicture: profilePictureUrl,
            };
          });
        setSearchResults(users);
      } else {
        setSearchResults([]);
      }
      
    } catch (error) {
      console.error('Arama hatası:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Arkadaş ekleme fonksiyonu (arkadaşlık isteği gönder)
  const addFriend = async (user) => {
    try {
      console.log('🔍 Arkadaş ekleme başlatıldı:', user);
      
      const token = await apiService.getStoredToken();
      console.log('🔍 Token kontrolü:', token ? 'Token mevcut' : 'Token yok');
      
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      apiService.setToken(token);
      console.log('🔍 API servisine istek gönderiliyor:', user.id);
      
      const response = await apiService.addFriend(user.id);
      console.log('🔍 API yanıtı:', response);
      
      if (response.success) {
        // Gönderilen istekler listesine ekle
        setSentRequests(prev => [...prev, user.id]);
        // Arama sonuçlarından kaldır
        setSearchResults(prev => prev.filter(result => result.id !== user.id));
        Alert.alert('Başarılı', `${user.name} kullanıcısına arkadaşlık isteği gönderildi!`);
      } else {
        // Özel hata mesajları
        if (response.message && response.message.includes('zaten arkadaşlık isteği gönderilmiş')) {
          // Gönderilen istekler listesine ekle
          setSentRequests(prev => [...prev, user.id]);
          Alert.alert('Bilgi', `${user.name} kullanıcısına zaten arkadaşlık isteği gönderilmiş.`);
          // Arama sonuçlarından kaldır
          setSearchResults(prev => prev.filter(result => result.id !== user.id));
        } else if (response.message && response.message.includes('zaten arkadaşınız')) {
          Alert.alert('Bilgi', `${user.name} kullanıcısı zaten arkadaşınız.`);
          // Arama sonuçlarından kaldır
          setSearchResults(prev => prev.filter(result => result.id !== user.id));
        } else {
          Alert.alert('Hata', response.message || 'Arkadaşlık isteği gönderilirken bir hata oluştu.');
        }
      }
      
    } catch (error) {
      console.error('Arkadaş ekleme hatası:', error);
      
      // Hata mesajından özel durumları kontrol et
      if (error.message && error.message.includes('zaten arkadaşlık isteği gönderilmiş')) {
        // Gönderilen istekler listesine ekle
        setSentRequests(prev => [...prev, user.id]);
        Alert.alert('Bilgi', `${user.name} kullanıcısına zaten arkadaşlık isteği gönderilmiş.`);
        // Arama sonuçlarından kaldır
        setSearchResults(prev => prev.filter(result => result.id !== user.id));
      } else if (error.message && error.message.includes('zaten arkadaşınız')) {
        Alert.alert('Bilgi', `${user.name} kullanıcısı zaten arkadaşınız.`);
        // Arama sonuçlarından kaldır
        setSearchResults(prev => prev.filter(result => result.id !== user.id));
      } else {
        Alert.alert('Hata', 'Arkadaşlık isteği gönderilirken bir hata oluştu.');
      }
    }
  };

  // Arkadaş silme fonksiyonu
  const removeFriend = async (friend) => {
    Alert.alert(
      'Arkadaşı Sil',
      `${friend.name} arkadaşınızı silmek istediğinizden emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            setFriends(prev => prev.filter(f => f.id !== friend.id));
            Alert.alert('Başarılı', `${friend.name} arkadaş listesinden kaldırıldı.`);
          },
        },
      ]
    );
  };

  // Profil görüntüleme fonksiyonu
  const viewProfile = async (friend) => {
    console.log('=== VIEW PROFILE CALLED ===');
    console.log('Selected friend:', friend);
    setSelectedFriend(friend);
    setShowProfilePopup(true);
    
    // Arkadaşın araç bilgilerini yükle
    await loadFriendVehicleInfo(friend.id);
  };

  // Arkadaşın araç bilgilerini yükle
  const loadFriendVehicleInfo = async (friendId) => {
    try {
      const token = await apiService.getStoredToken();
      if (!token) return;
      
      apiService.setToken(token);
      const response = await apiService.getFriendVehicles(friendId);
      
      if (response.success) {
        setSelectedFriend(prev => ({
          ...prev,
          vehicles: response.data.vehicles || []
        }));
      }
    } catch (error) {
      console.error('Arkadaş araç bilgileri yükleme hatası:', error);
    }
  };

  // Arkadaş listesini yükle
  const loadFriends = async () => {
    console.log('=== LOAD FRIENDS CALLED ===');
    try {
      const token = await apiService.getStoredToken();
      if (!token) {
        console.log('No token found, setting friends to empty array');
        setFriends([]);
        return;
      }
      
      // Token'dan user ID'yi çıkar
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Current user ID from token:', payload.userId);
      } catch (e) {
        console.log('Token parse error:', e);
      }
      
      apiService.setToken(token);
      const response = await apiService.getFriends();
      
      console.log('Get friends response:', response);
      
      if (response.success && response.data && response.data.friends) {
        console.log('Arkadaş listesi API yanıtı:', response.data.friends);
        const friends = response.data.friends.map(friend => {
          // Profil fotoğrafı URL'sini tam URL'ye çevir
          let profilePictureUrl = friend.profilePicture || friend.profile_picture || null;
          if (profilePictureUrl && profilePictureUrl.startsWith('/uploads/')) {
            // API base URL'ini al ve profil fotoğrafı URL'sini tamamla
            const apiBaseUrl = apiService.baseURL.replace('/api', '');
            profilePictureUrl = `${apiBaseUrl}${profilePictureUrl}`;
          }
          
          return {
            id: friend.id,
            name: `${friend.firstName} ${friend.lastName}`,
            email: friend.email,
            status: 'offline',
            lastSeen: 'Çevrimdışı',
            avatar: '👤', // Fallback avatar
            mutualFriends: 0,
            age: friend.age || null,
            profilePicture: profilePictureUrl,
          };
        });
        console.log('İşlenmiş arkadaş listesi:', friends);
        setFriends(friends);
        console.log('setFriends called with:', friends);
      } else {
        console.log('Arkadaş listesi boş veya hata:', response);
        setFriends([]);
      }
    } catch (error) {
      console.error('Arkadaş listesi yükleme hatası:', error);
      console.error('Error details:', error.message);
      setFriends([]);
    }
  };

  // Özel sohbetleri yükle
  const loadPrivateChats = async () => {
    console.log('=== LOAD PRIVATE CHATS CALLED ===');
    try {
      const token = await apiService.getStoredToken();
      if (!token) {
        console.log('No token found, setting privateChats to empty array');
        setPrivateChats([]);
        return;
      }
      
      apiService.setToken(token);
      const response = await apiService.getPrivateConversations();
      
      console.log('Private conversations API response:', response);
      if (response.success && response.data) {
        const chats = response.data.map(chat => {
          // Profil fotoğrafı URL'sini tam URL'ye çevir
          let profilePictureUrl = chat.profilePicture || null;
          if (profilePictureUrl && profilePictureUrl.startsWith('/uploads/')) {
            // API base URL'ini al ve profil fotoğrafı URL'sini tamamla
            const apiBaseUrl = apiService.baseURL.replace('/api', '');
            profilePictureUrl = `${apiBaseUrl}${profilePictureUrl}`;
          }
          
          return {
            id: chat.friendId,
            name: chat.friendName,
            lastMessage: chat.lastMessage || 'Henüz mesaj yok',
            time: chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString('tr-TR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : 'Şimdi',
            unread: chat.unreadCount || 0,
            avatar: '👤', // Fallback avatar
            profilePicture: profilePictureUrl
          };
        });
        
        console.log('İşlenmiş özel sohbet listesi:', chats);
        setPrivateChats(chats);
      } else {
        console.log('Özel sohbet listesi boş veya hata:', response);
        setPrivateChats([]);
      }
    } catch (error) {
      console.error('Özel sohbet listesi yükleme hatası:', error);
      setPrivateChats([]);
    }
  };

  // Arkadaşlık isteklerini yükle
  const loadFriendRequests = async () => {
    try {
      const token = await apiService.getStoredToken();
      if (!token) {
        setFriendRequests([]);
        return;
      }
      
      apiService.setToken(token);
      const response = await apiService.getFriendRequests();
      
      console.log('Get friend requests response:', response);
      
      if (response.success && response.data) {
        const incomingRequests = response.data.incomingRequests || [];
        setFriendRequests(incomingRequests);
      } else {
        setFriendRequests([]);
      }
    } catch (error) {
      console.error('Arkadaşlık istekleri yükleme hatası:', error);
      setFriendRequests([]);
    }
  };

  // Arkadaşlık isteğini kabul et
  const acceptFriendRequest = async (request) => {
    try {
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      apiService.setToken(token);
      const response = await apiService.acceptFriendRequest(request.id);
      
      if (response.success) {
        console.log('Arkadaşlık isteği kabul edildi, arkadaş listesi yeniden yükleniyor...');
        // Arkadaş listesini yeniden yükle
        await loadFriends();
        // İstek listesini güncelle
        setFriendRequests(prev => prev.filter(req => req.id !== request.id));
        Alert.alert('Başarılı', `${request.firstName} ${request.lastName} arkadaş olarak eklendi!`);
      } else {
        Alert.alert('Hata', response.message || 'Arkadaşlık isteği kabul edilirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Arkadaşlık isteği kabul etme hatası:', error);
      Alert.alert('Hata', 'Arkadaşlık isteği kabul edilirken bir hata oluştu.');
    }
  };

  // Arkadaşlık isteğini reddet
  const declineFriendRequest = async (request) => {
    try {
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      apiService.setToken(token);
      const response = await apiService.declineFriendRequest(request.id);
      
      if (response.success) {
        // İstek listesini güncelle
        setFriendRequests(prev => prev.filter(req => req.id !== request.id));
        Alert.alert('Başarılı', 'Arkadaşlık isteği reddedildi.');
      } else {
        Alert.alert('Hata', response.message || 'Arkadaşlık isteği reddedilirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Arkadaşlık isteği reddetme hatası:', error);
      Alert.alert('Hata', 'Arkadaşlık isteği reddedilirken bir hata oluştu.');
    }
  };

  // Component mount olduğunda arkadaş listesini ve istekleri yükle
  useEffect(() => {
    console.log('=== CHAT SCREEN MOUNTED ===');
    console.log('Component mount - arkadaş listesi yükleniyor...');
    console.log('Current friends state:', friends);
    loadFriends();
    loadFriendRequests();
    loadPrivateChats();
  }, []);

  // Screen'e odaklanıldığında arkadaş listesini yeniden yükle
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('=== CHAT SCREEN FOCUSED ===');
      console.log('Screen focused - arkadaş listesi yeniden yükleniyor...');
      loadFriends();
      loadFriendRequests();
      loadPrivateChats(); // Özel sohbet listesini de yenile
    });

    return unsubscribe;
  }, [navigation]);

  // Route parametrelerini dinle - sohbet temizleme sonrası yenileme
  useEffect(() => {
    if (route?.params?.refreshConversations) {
      console.log('🔄 ChatScreen: Konuşma listesi yenileniyor (sohbet temizleme sonrası)');
      loadPrivateChats();
      // Parametreyi temizle
      navigation.setParams({ refreshConversations: false });
    }
  }, [route?.params?.refreshConversations]);

  // Arkadaş listesi değiştiğinde log
  useEffect(() => {
    console.log('Friends state changed:', friends);
  }, [friends]);


  // Arama sorgusu değiştiğinde
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);



  const renderPrivateChat = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => {
        console.log('🚀 ChatScreen: Özel sohbet tıklandı:', item);
        navigation.navigate('PrivateChat', { 
          friend: {
            id: item.id,
            name: item.name,
            profilePicture: item.profilePicture
          }
        });
      }}
    >
      <View style={styles.chatAvatar}>
        {item.profilePicture ? (
          <Image 
            source={{ uri: item.profilePicture }} 
            style={styles.chatAvatarImage}
            defaultSource={require('../../assets/icon.png')}
            onError={(error) => {
              console.log('📸 ChatScreen: Image load error:', error.nativeEvent.error);
              console.log('📸 ChatScreen: Failed URL:', item.profilePicture);
            }}
            onLoad={() => {
              console.log('📸 ChatScreen: Image loaded successfully:', item.profilePicture);
            }}
          />
        ) : (
          <Text style={styles.chatAvatarText}>{item.avatar}</Text>
        )}
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <Text style={styles.chatLastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFriend = ({ item }) => (
    <TouchableOpacity 
      style={styles.friendItem}
      onPress={() => viewProfile(item)}
    >
      <View style={styles.friendAvatar}>
        <Ionicons 
          name="person" 
          size={24} 
          color={colors.text.light} 
        />
        <View style={[
          styles.statusIndicator,
          { backgroundColor: getStatusColor(item.status) }
        ]} />
      </View>
      <View style={styles.friendContent}>
        <View style={styles.friendHeader}>
          <Text style={styles.friendName}>{item.name}</Text>
          <Text style={styles.friendLastSeen}>{item.lastSeen}</Text>
        </View>
        <Text style={styles.mutualFriends}>
          {item.mutualFriends} ortak arkadaş
        </Text>
      </View>
      <View style={styles.friendActions}>
        <TouchableOpacity 
          style={styles.messageFriendButton}
          onPress={() => {
            console.log('🚀 ChatScreen: Mesaj Gönder butonuna tıklandı');
            console.log('🚀 ChatScreen: selectedFriend:', item);
            navigation.navigate('PrivateChat', { 
              friend: {
                id: item.id,
                name: item.name,
                profilePicture: item.profilePicture
              }
            });
          }}
        >
          <Ionicons name="chatbubble-outline" size={getResponsiveIconSize(20)} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.removeFriendButton}
          onPress={() => removeFriend(item)}
        >
          <Ionicons name="trash-outline" size={getResponsiveIconSize(20)} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }) => {
    const isRequestSent = sentRequests.includes(item.id);
    
    return (
      <TouchableOpacity style={styles.searchResultItem}>
        <View style={styles.searchResultAvatar}>
          {item.profilePicture ? (
            <Image 
              source={{ uri: item.profilePicture }} 
              style={styles.searchResultAvatarImage}
              defaultSource={require('../../assets/icon.png')}
            />
          ) : (
            <Text style={styles.searchResultAvatarText}>{item.avatar}</Text>
          )}
        </View>
        <View style={styles.searchResultContent}>
          <View style={styles.searchResultHeader}>
            <Text style={styles.searchResultName}>{item.name}</Text>
            <Text style={styles.searchResultEmail}>{item.email}</Text>
          </View>
          <Text style={styles.searchResultMutual}>
            {item.mutualFriends} ortak arkadaş
          </Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.addFriendButton,
            isRequestSent && styles.sentRequestButton
          ]}
          onPress={() => addFriend(item)}
          disabled={isRequestSent}
        >
          <Ionicons 
            name={isRequestSent ? "checkmark" : "person-add-outline"} 
            size={getResponsiveIconSize(20)} 
            color={isRequestSent ? colors.success : colors.text.light} 
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderFriendRequest = ({ item }) => (
    <View style={styles.friendRequestItem}>
      <View style={styles.friendRequestAvatar}>
        <Text style={styles.friendRequestAvatarText}>
          {item.profilePicture ? '👤' : '👤'}
        </Text>
      </View>
      <View style={styles.friendRequestContent}>
        <Text style={styles.friendRequestName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.friendRequestEmail}>{item.email}</Text>
        <Text style={styles.friendRequestTime}>
          {new Date(item.requestCreatedAt).toLocaleDateString('tr-TR')}
        </Text>
      </View>
      <View style={styles.friendRequestActions}>
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={() => acceptFriendRequest(item)}
        >
          <Ionicons name="checkmark" size={getResponsiveIconSize(20)} color={colors.text.light} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.declineButton}
          onPress={() => declineFriendRequest(item)}
        >
          <Ionicons name="close" size={getResponsiveIconSize(20)} color={colors.text.light} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return colors.success;
      case 'away':
        return colors.warning;
      case 'offline':
        return colors.lightGray;
      default:
        return colors.lightGray;
    }
  };


  console.log('=== RENDERING CHAT SCREEN ===');
  console.log('Current state:', {
    friends: friends.length,
    friendRequests: friendRequests.length,
    showSearch,
    searchResults: searchResults.length,
    currentUser: !!currentUser,
    isSocketConnected
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient
          colors={colors.gradients.redBlack}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Sohbet</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.localChatButton}
                onPress={() => navigation.navigate('LocalChat')}
              >
                <Ionicons name="chatbubble-ellipses" size={getResponsiveIconSize(20)} color={colors.text.light} />
                <Text style={styles.localChatButtonText}>Local Chat</Text>
              </TouchableOpacity>
              <View style={styles.connectionStatus}>
                <View style={[
                  styles.connectionIndicator,
                  { backgroundColor: isSocketConnected ? colors.success : colors.warning }
                ]} />
                <Text style={styles.connectionText}>
                  {isSocketConnected ? `Bağlı (${onlineUsers.length} online)` : 'Bağlantı yok'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'private' && styles.activeTab
              ]}
              onPress={() => setActiveTab('private')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'private' && styles.activeTabText
              ]}>
                Özel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'friends' && styles.activeTab
              ]}
              onPress={() => setActiveTab('friends')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'friends' && styles.activeTabText
              ]}>
                Arkadaşlar
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'private' ? (
            privateChats.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>💌</Text>
                <Text style={styles.emptyStateTitle}>Özel mesaj yok</Text>
                <Text style={styles.emptyStateText}>
                  Henüz özel mesajınız bulunmuyor.
                </Text>
              </View>
            ) : (
              <FlatList
                data={privateChats}
                renderItem={renderPrivateChat}
                keyExtractor={item => item.id}
                style={styles.chatsList}
                showsVerticalScrollIndicator={false}
              />
            )
          ) : (
            <>
              {/* Arama Header */}
              <View style={styles.searchHeader}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={getResponsiveIconSize(20)} color={colors.text.tertiary} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Arkadaş ara..."
                    placeholderTextColor={colors.text.tertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => setShowSearch(true)}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearSearchButton}
                      onPress={() => {
                        setSearchQuery('');
                        setShowSearch(false);
                      }}
                    >
                      <Ionicons name="close-circle" size={getResponsiveIconSize(20)} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.addFriendHeaderButton}
                  onPress={() => setShowSearch(!showSearch)}
                >
                  <Ionicons name="person-add" size={getResponsiveIconSize(24)} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Arkadaşlık İstekleri */}
              {!showSearch && (
                <View style={styles.friendRequestsSection}>
                  <View style={styles.friendRequestsHeader}>
                    <Text style={styles.friendRequestsTitle}>
                      Arkadaşlık İstekleri ({friendRequests.length})
                    </Text>
                    <TouchableOpacity
                      style={styles.toggleRequestsButton}
                      onPress={() => setShowFriendRequests(!showFriendRequests)}
                    >
                      <Ionicons 
                        name={showFriendRequests ? "chevron-up" : "chevron-down"} 
                        size={getResponsiveIconSize(20)} 
                        color={colors.primary} 
                      />
                    </TouchableOpacity>
                  </View>
                  {showFriendRequests && (
                    <View>
                      {friendRequests.length > 0 ? (
                        <FlatList
                          data={friendRequests}
                          renderItem={renderFriendRequest}
                          keyExtractor={item => item.id.toString()}
                          style={styles.friendRequestsList}
                          showsVerticalScrollIndicator={false}
                        />
                      ) : (
                        <View style={styles.emptyRequestsContainer}>
                          <Ionicons name="mail-outline" size={getResponsiveIconSize(48)} color={colors.text.secondary} />
                          <Text style={styles.emptyRequestsText}>
                            Henüz arkadaşlık isteğiniz yok
                          </Text>
                          <Text style={styles.emptyRequestsSubtext}>
                            Size gelen arkadaşlık istekleri burada görünecek
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Arama Sonuçları veya Arkadaş Listesi */}
              {showSearch ? (
                <>
                  {isSearching ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>Aranıyor...</Text>
                    </View>
                  ) : searchResults.length > 0 ? (
                    <FlatList
                      data={searchResults}
                      renderItem={renderSearchResult}
                      keyExtractor={item => item.id}
                      style={styles.searchResultsList}
                      showsVerticalScrollIndicator={false}
                    />
                  ) : searchQuery.length > 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateIcon}>🔍</Text>
                      <Text style={styles.emptyStateTitle}>Sonuç bulunamadı</Text>
                      <Text style={styles.emptyStateText}>
                        "{searchQuery}" için arama sonucu bulunamadı.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateIcon}>👥</Text>
                      <Text style={styles.emptyStateTitle}>Arkadaş ara</Text>
                      <Text style={styles.emptyStateText}>
                        İsim veya email ile arkadaş arayın.
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                (() => {
                  console.log('=== RENDERING FRIENDS LIST ===');
                  console.log('Rendering friends list, friends.length:', friends.length);
                  console.log('Friends data:', friends);
                  const friendsData = getFriendsWithOnlineStatus();
                  console.log('getFriendsWithOnlineStatus result:', friendsData);
                  
                  return friends.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateIcon}>👥</Text>
                      <Text style={styles.emptyStateTitle}>Arkadaş listesi boş</Text>
                      <Text style={styles.emptyStateText}>
                        Henüz arkadaşınız bulunmuyor.
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={friendsData}
                      renderItem={renderFriend}
                      keyExtractor={item => item.id}
                      style={styles.friendsList}
                      showsVerticalScrollIndicator={false}
                    />
                  );
                })()
              )}
            </>
          )}
        </View>
      </SafeAreaView>

      {/* Profil Popup */}
      {showProfilePopup && (
        <View style={styles.popupOverlay}>
          <View style={styles.profilePopup}>
            {/* Gradient Header */}
            <View style={styles.popupGradientHeader}>
              <TouchableOpacity 
                style={styles.popupCloseButton}
                onPress={() => setShowProfilePopup(false)}
              >
                <Ionicons name="close" size={getResponsiveIconSize(24)} color={colors.text.light} />
              </TouchableOpacity>
            </View>

            {/* Profil İçeriği */}
            <View style={styles.popupContent}>
              {/* Profil Fotoğrafı */}
              <View style={styles.popupImageContainer}>
                <View style={styles.popupImageWrapper}>
                  {selectedFriend?.profilePicture ? (
                    <Image
                      source={{ uri: selectedFriend.profilePicture }}
                      style={styles.popupProfileImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('👥 ChatScreen Popup: Image load error:', error.nativeEvent.error);
                        console.log('👥 ChatScreen Popup: Failed URL:', selectedFriend.profilePicture);
                      }}
                      onLoad={() => {
                        console.log('👥 ChatScreen Popup: Image loaded successfully:', selectedFriend.profilePicture);
                      }}
                    />
                  ) : (
                    <View style={styles.popupDefaultImage}>
                      <Ionicons name="person" size={getResponsiveIconSize(60)} color={colors.text.light} />
                    </View>
                  )}
                  {/* Durum İndikatörü */}
                  <View style={[
                    styles.popupStatusBadge,
                    { backgroundColor: getStatusColor(selectedFriend?.status) }
                  ]} />
                </View>
              </View>

              {/* Kullanıcı Bilgileri */}
              <View style={styles.popupInfo}>
                <Text style={styles.popupName}>{selectedFriend?.name}</Text>
                
                {/* Bilgi Kartları */}
                <View style={styles.popupInfoCards}>
                  {/* Yaş Bilgisi */}
                  <View style={styles.popupInfoCard}>
                    <View style={styles.popupInfoIconContainer}>
                      <Ionicons name="calendar-outline" size={getResponsiveIconSize(20)} color={colors.primary} />
                    </View>
                    <View style={styles.popupInfoTextContainer}>
                      <Text style={styles.popupInfoLabel}>Yaş</Text>
                      <Text style={styles.popupInfoValue}>
                        {selectedFriend?.age ? `${selectedFriend.age}` : 'Belirtilmemiş'}
                      </Text>
                    </View>
                  </View>

                  {/* Durum Bilgisi */}
                  <View style={styles.popupInfoCard}>
                    <View style={styles.popupInfoIconContainer}>
                      <Ionicons name="time-outline" size={getResponsiveIconSize(20)} color={colors.secondary} />
                    </View>
                    <View style={styles.popupInfoTextContainer}>
                      <Text style={styles.popupInfoLabel}>Durum</Text>
                      <Text style={styles.popupInfoValue}>
                        {selectedFriend?.status === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Ortak Arkadaşlar */}
                {selectedFriend?.mutualFriends > 0 && (
                  <View style={styles.popupMutualFriends}>
                    <Ionicons name="people-outline" size={getResponsiveIconSize(16)} color={colors.text.secondary} />
                    <Text style={styles.popupMutualText}>
                      {selectedFriend.mutualFriends} ortak arkadaş
                    </Text>
                  </View>
                )}

                {/* Araç Bilgileri */}
                {selectedFriend?.vehicles && selectedFriend.vehicles.length > 0 && (
                  <View style={styles.popupVehiclesSection}>
                    <Text style={styles.popupVehiclesTitle}>Araç Bilgileri</Text>
                    {selectedFriend.vehicles.slice(0, 2).map((vehicle, index) => (
                      <View key={vehicle.id || index} style={styles.popupVehicleCard}>
                        <View style={styles.popupVehicleHeader}>
                          <View style={styles.popupVehicleIconContainer}>
                            <Ionicons name="car-outline" size={getResponsiveIconSize(18)} color={colors.primary} />
                          </View>
                          <View style={styles.popupVehicleInfo}>
                            <Text style={styles.popupVehicleBrandModel}>
                              {vehicle.brand} {vehicle.model}
                            </Text>
                            <Text style={styles.popupVehiclePlate}>
                              {vehicle.plate_number}
                            </Text>
                          </View>
                          {vehicle.is_primary && (
                            <View style={styles.popupPrimaryBadge}>
                              <Text style={styles.popupPrimaryText}>Ana</Text>
                            </View>
                          )}
                        </View>
                        {(vehicle.year || vehicle.color) && (
                          <View style={styles.popupVehicleDetails}>
                            {vehicle.year && (
                              <Text style={styles.popupVehicleDetail}>
                                {vehicle.year} • {vehicle.color}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    ))}
                    {selectedFriend.vehicles.length > 2 && (
                      <Text style={styles.popupMoreVehicles}>
                        +{selectedFriend.vehicles.length - 2} araç daha
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Aksiyon Butonları */}
              <View style={styles.popupActions}>
                <TouchableOpacity 
                  style={styles.popupMessageButton}
                  onPress={() => {
                    console.log('🚀 ChatScreen: Mesaj Gönder butonuna tıklandı');
                    console.log('🚀 ChatScreen: selectedFriend:', selectedFriend);
                    setShowProfilePopup(false);
                    console.log('🚀 ChatScreen: PrivateChat ekranına yönlendiriliyor...');
                    navigation.navigate('PrivateChat', { friend: selectedFriend });
                  }}
                >
                  <Ionicons name="chatbubble-ellipses" size={getResponsiveIconSize(22)} color={colors.text.light} />
                  <Text style={styles.popupButtonText}>Mesaj Gönder</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: getContainerPadding(),
    paddingVertical: spacing.md,
    minHeight: getHeaderHeight(),
    borderBottomLeftRadius: scale(25),
    borderBottomRightRadius: scale(25),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  localChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: getResponsiveBorderRadius(20),
    minHeight: getMinTouchTarget(),
  },
  localChatButtonText: {
    color: colors.text.light,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIndicator: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: spacing.xs,
  },
  connectionText: {
    fontSize: fontSizes.sm,
    color: colors.text.light,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: fontSizes.title,
    fontWeight: '800',
    color: colors.text.light,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: getResponsiveBorderRadius(25),
    padding: spacing.xs,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: getResponsiveBorderRadius(20),
    alignItems: 'center',
    minHeight: getMinTouchTarget(),
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  chatsList: {
    flex: 1,
    paddingVertical: scale(8),
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getContainerPadding(),
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: getContainerPadding(),
    marginVertical: scale(4),
    borderRadius: scale(16),
    minHeight: getListItemHeight(),
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border.light + '30',
  },
  chatAvatar: {
    position: 'relative',
    marginRight: spacing.md,
  },
  chatAvatarImage: {
    width: getResponsiveIconSize(40),
    height: getResponsiveIconSize(40),
    borderRadius: getResponsiveIconSize(20),
    backgroundColor: colors.surface,
  },
  chatAvatarText: {
    fontSize: getResponsiveIconSize(32),
  },
  unreadBadge: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: getResponsiveBorderRadius(10),
    minWidth: scale(20),
    height: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: colors.text.light,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chatName: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  chatTime: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
  },
  chatLastMessage: {
    fontSize: fontSizes.md,
    color: colors.text.secondary,
    lineHeight: fontSizes.md * 1.4,
    letterSpacing: 0.1,
  },
  // Friends styles
  friendsList: {
    flex: 1,
    paddingVertical: scale(8),
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getContainerPadding(),
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: getContainerPadding(),
    marginVertical: scale(4),
    borderRadius: scale(16),
    minHeight: getListItemHeight(),
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border.light + '30',
  },
  friendAvatar: {
    position: 'relative',
    marginRight: spacing.md,
  },
  friendAvatarImage: {
    width: getResponsiveIconSize(40),
    height: getResponsiveIconSize(40),
    borderRadius: getResponsiveIconSize(20),
    backgroundColor: colors.surface,
  },
  friendAvatarText: {
    fontSize: getResponsiveIconSize(32),
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    borderWidth: 2,
    borderColor: colors.surface,
  },
  friendContent: {
    flex: 1,
  },
  friendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  friendName: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  friendLastSeen: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
  },
  mutualFriends: {
    fontSize: fontSizes.md,
    color: colors.text.secondary,
  },
  friendActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  messageFriendButton: {
    padding: spacing.sm,
    borderRadius: getResponsiveBorderRadius(20),
    backgroundColor: colors.primaryAlpha,
    minWidth: getMinTouchTarget(),
    minHeight: getMinTouchTarget(),
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeFriendButton: {
    padding: spacing.sm,
    borderRadius: getResponsiveBorderRadius(20),
    backgroundColor: colors.errorAlpha || 'rgba(255, 59, 48, 0.1)',
    minWidth: getMinTouchTarget(),
    minHeight: getMinTouchTarget(),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRequestsContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background.secondary,
    borderRadius: getResponsiveBorderRadius(12),
    marginTop: spacing.sm,
  },
  emptyRequestsText: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyRequestsSubtext: {
    fontSize: fontSizes.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: fontSizes.md * 1.4,
  },
  // Boş durum stilleri
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getContainerPadding(),
    paddingVertical: spacing.xxl,
  },
  emptyStateIcon: {
    fontSize: getResponsiveIconSize(64),
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: fontSizes.lg,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: fontSizes.lg * 1.5,
  },
  // Arama stilleri
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getContainerPadding(),
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkGray,
    borderRadius: getResponsiveBorderRadius(20),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    minHeight: getResponsiveInputHeight(),
  },
  searchIcon: {
    marginRight: spacing.sm,
    fontSize: getResponsiveIconSize(20),
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.lg,
    color: colors.text.primary,
  },
  clearSearchButton: {
    padding: spacing.xs,
    minWidth: getMinTouchTarget(),
    minHeight: getMinTouchTarget(),
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFriendHeaderButton: {
    padding: spacing.sm,
    borderRadius: getResponsiveBorderRadius(20),
    backgroundColor: colors.primaryAlpha,
    minWidth: getMinTouchTarget(),
    minHeight: getMinTouchTarget(),
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSizes.lg,
    color: colors.text.secondary,
  },
  searchResultsList: {
    flex: 1,
    paddingVertical: scale(8),
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getContainerPadding(),
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: getContainerPadding(),
    marginVertical: scale(4),
    borderRadius: scale(16),
    minHeight: getListItemHeight(),
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border.light + '30',
  },
  searchResultAvatar: {
    marginRight: spacing.md,
  },
  searchResultAvatarImage: {
    width: getResponsiveIconSize(40),
    height: getResponsiveIconSize(40),
    borderRadius: getResponsiveIconSize(20),
    backgroundColor: colors.surface,
  },
  searchResultAvatarText: {
    fontSize: getResponsiveIconSize(32),
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultHeader: {
    marginBottom: spacing.xs,
  },
  searchResultName: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  searchResultEmail: {
    fontSize: fontSizes.md,
    color: colors.text.tertiary,
  },
  searchResultMutual: {
    fontSize: fontSizes.md,
    color: colors.text.secondary,
  },
  addFriendButton: {
    padding: spacing.sm,
    borderRadius: getResponsiveBorderRadius(20),
    backgroundColor: colors.primary,
    minWidth: getMinTouchTarget(),
    minHeight: getMinTouchTarget(),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentRequestButton: {
    backgroundColor: colors.success || '#4CAF50',
  },
  // Arkadaşlık istekleri stilleri
  friendRequestsSection: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  friendRequestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getContainerPadding(),
    paddingVertical: spacing.md,
  },
  friendRequestsTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  toggleRequestsButton: {
    padding: spacing.xs,
    minWidth: getMinTouchTarget(),
    minHeight: getMinTouchTarget(),
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendRequestsList: {
    maxHeight: getResponsiveHeight(25),
    paddingVertical: scale(8),
  },
  friendRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getContainerPadding(),
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: getContainerPadding(),
    marginVertical: scale(4),
    borderRadius: scale(16),
    minHeight: getListItemHeight(),
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border.light + '30',
  },
  friendRequestAvatar: {
    marginRight: spacing.md,
  },
  friendRequestAvatarText: {
    fontSize: getResponsiveIconSize(32),
  },
  friendRequestContent: {
    flex: 1,
  },
  friendRequestName: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  friendRequestEmail: {
    fontSize: fontSizes.md,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  friendRequestTime: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
  },
  friendRequestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acceptButton: {
    backgroundColor: colors.success,
    width: getMinTouchTarget(),
    height: getMinTouchTarget(),
    borderRadius: getResponsiveBorderRadius(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: colors.error,
    width: getMinTouchTarget(),
    height: getMinTouchTarget(),
    borderRadius: getResponsiveBorderRadius(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Profil Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModal: {
    width: getResponsiveWidth(90),
    maxWidth: isTablet ? getResponsiveWidth(60) : getResponsiveWidth(90),
    maxHeight: getResponsiveHeight(80),
    backgroundColor: colors.background.primary,
    borderRadius: getResponsiveBorderRadius(20),
    overflow: 'hidden',
    ...getPlatformShadow(10),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: getContainerPadding(),
    paddingBottom: spacing.sm,
  },
  closeButton: {
    width: getMinTouchTarget(),
    height: getMinTouchTarget(),
    borderRadius: getResponsiveBorderRadius(20),
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContent: {
    flex: 1,
  },
  profileImageContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  profileImage: {
    width: getAvatarSize('xlarge'),
    height: getAvatarSize('xlarge'),
    borderRadius: getAvatarSize('xlarge') / 2,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  defaultProfileImage: {
    width: getAvatarSize('xlarge'),
    height: getAvatarSize('xlarge'),
    borderRadius: getAvatarSize('xlarge') / 2,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.primary,
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: getContainerPadding(),
    marginBottom: spacing.xl,
  },
  profileName: {
    fontSize: fontSizes.title,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  ageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: getResponsiveBorderRadius(25),
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  ageText: {
    fontSize: fontSizes.xl,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: getContainerPadding(),
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: getResponsiveBorderRadius(25),
    gap: spacing.sm,
    minHeight: getResponsiveButtonHeight(),
    ...getPlatformShadow(3),
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: getResponsiveBorderRadius(25),
    gap: spacing.sm,
    minHeight: getResponsiveButtonHeight(),
    ...getPlatformShadow(3),
  },
  buttonText: {
    color: colors.text.light,
    fontSize: fontSizes.lg,
    fontWeight: '600',
  },
  
  // Popup Stilleri
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  profilePopup: {
    width: getResponsiveWidth(92),
    maxWidth: isTablet ? getResponsiveWidth(65) : getResponsiveWidth(92),
    backgroundColor: colors.surface,
    borderRadius: getResponsiveBorderRadius(30),
    overflow: 'hidden',
    ...getPlatformShadow(15),
    borderWidth: 1,
    borderColor: colors.border.light + '40',
  },
  popupGradientHeader: {
    height: getResponsiveHeight(8),
    backgroundColor: colors.primary,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderTopLeftRadius: getResponsiveBorderRadius(30),
    borderTopRightRadius: getResponsiveBorderRadius(30),
  },
  popupCloseButton: {
    padding: spacing.sm,
    borderRadius: getResponsiveBorderRadius(25),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: getMinTouchTarget(),
    minHeight: getMinTouchTarget(),
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  popupContent: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  popupImageContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: -spacing.xl, // Gradient header ile overlap
  },
  popupImageWrapper: {
    position: 'relative',
  },
  popupProfileImage: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    borderWidth: 5,
    borderColor: colors.surface,
    ...getPlatformShadow(8),
  },
  popupDefaultImage: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: colors.surface,
    ...getPlatformShadow(8),
  },
  popupStatusBadge: {
    position: 'absolute',
    bottom: scale(8),
    right: scale(8),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 3,
    borderColor: colors.surface,
    ...getPlatformShadow(3),
  },
  popupInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  popupName: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  popupInfoCards: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  popupInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: getResponsiveBorderRadius(20),
    borderWidth: 1,
    borderColor: colors.border.light + '30',
    ...getPlatformShadow(2),
  },
  popupInfoIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  popupInfoTextContainer: {
    flex: 1,
  },
  popupInfoLabel: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    fontWeight: '500',
    marginBottom: scale(2),
  },
  popupInfoValue: {
    fontSize: fontSizes.lg,
    color: colors.text.primary,
    fontWeight: '700',
  },
  popupMutualFriends: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: getResponsiveBorderRadius(15),
    borderWidth: 1,
    borderColor: colors.border.light + '20',
    gap: spacing.xs,
  },
  popupMutualText: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  popupActions: {
    width: '100%',
  },
  popupMessageButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: getResponsiveBorderRadius(25),
    gap: spacing.sm,
    minHeight: getResponsiveButtonHeight(),
    ...getPlatformShadow(6),
    borderWidth: 1,
    borderColor: colors.primary,
  },
  popupButtonText: {
    color: colors.text.light,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Araç Bilgileri Stilleri
  popupVehiclesSection: {
    width: '100%',
    marginTop: spacing.md,
  },
  popupVehiclesTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  popupVehicleCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: getResponsiveBorderRadius(15),
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light + '20',
    ...getPlatformShadow(2),
  },
  popupVehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  popupVehicleIconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  popupVehicleInfo: {
    flex: 1,
  },
  popupVehicleBrandModel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: scale(2),
  },
  popupVehiclePlate: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  popupPrimaryBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: getResponsiveBorderRadius(10),
  },
  popupPrimaryText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.text.light,
  },
  popupVehicleDetails: {
    marginTop: spacing.xs,
    paddingLeft: scale(44), // Icon + margin ile hizalama
  },
  popupVehicleDetail: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  popupMoreVehicles: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
