import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
  AppState,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
// React Native Maps import'u
import MapView, { Marker, Circle, PROVIDER_APPLE, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { colors } from '../constants/colors';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { 
  scale, 
  verticalScale, 
  scaleFont, 
  getResponsivePadding, 
  isIOS,
  isAndroid,
  isTablet,
  isSmallScreen,
  getBottomSafeArea
} from '../utils/responsive';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [showUserList, setShowUserList] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
  const [lastLocation, setLastLocation] = useState(null);
  const [lastLocationTime, setLastLocationTime] = useState(null);
  const [autoCenterEnabled, setAutoCenterEnabled] = useState(true); // Otomatik merkezleme kontrolü
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    let isMounted = true;
    let socketCleanup = null;
    
    const initialize = async () => {
      try {
        await initializeMap();
        if (isMounted) {
          socketCleanup = initializeSocket();
        }
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    
    initialize();
    
    return () => {
      isMounted = false;
      stopLocationTracking();
      
      // Socket cleanup
      if (socketCleanup) {
        socketCleanup();
      }
      
      // Kullanıcı uygulamayı kapatırken konum paylaşımını durdur
      if (isLocationSharing) {
        console.log('🚪 App closing, stopping location sharing...');
        stopLocationSharingOnExit();
      }
      
      socketService.removeAllListeners();
    };
  }, []);

  // Ekran focus olduğunda ayarları yenile
  useEffect(() => {
     const unsubscribe = navigation.addListener('focus', () => {
       console.log('MapScreen focused, reloading settings...');
       loadLocationSettings();
       loadNearbyUsers();
       
       // Eğer konum paylaşımı açıksa, hemen konum güncelle
       if (isLocationSharing && location) {
         console.log('📍 App focused, immediately sharing location...');
         shareLocationWithServer();
       }
     });

    return unsubscribe;
  }, [navigation, isLocationSharing, location, shareLocationWithServer]);

  // Socket.io bağlantısı kurulduğunda yakındaki kullanıcıları iste - Şimdilik devre dışı
  /*
  useEffect(() => {
    console.log('🔌 Socket effect triggered:', {
      isLocationSharing,
      socketConnected: socketService.isSocketConnected()
    });
    
    if (isLocationSharing && socketService.isSocketConnected()) {
      console.log('📍 Requesting nearby users via socket...');
      // Socket.io ile yakındaki kullanıcıları anında iste
      const success = socketService.requestNearbyUsers(5000, 100);
      console.log('📍 Socket request result:', success);
    } else if (isLocationSharing && !socketService.isSocketConnected()) {
      console.log('⚠️ Socket not connected, trying to connect...');
      socketService.connect();
    }
  }, [isLocationSharing, socketService.isSocketConnected()]);
  */

  // AppState değişikliklerini dinle (uygulama arka plana geçtiğinde)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('📱 App state changed:', nextAppState);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Uygulama arka plana geçtiğinde konum paylaşımını durdur
        if (isLocationSharing) {
          console.log('📱 App went to background, stopping location sharing...');
          stopLocationSharingOnExit();
        }
      } else if (nextAppState === 'active') {
        // Uygulama tekrar aktif olduğunda konum paylaşımını yeniden başlat
        if (isLocationSharing) {
          console.log('📱 App became active, restarting location sharing...');
          // Konum paylaşımını yeniden başlat
          setTimeout(() => {
            if (location) {
              shareLocationWithServer(location);
            }
          }, 1000);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isLocationSharing, location, stopLocationSharingOnExit, shareLocationWithServer]);

  // Animasyonları başlat
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const initializeMap = async () => {
    try {
      // Gizli güncelleme - loading ekranı gösterme
      setIsLoading(false);
      
       // Paralel olarak çalıştır
       await Promise.allSettled([
         getLocationPermission(),
         loadLocationSettings(),
         loadNearbyUsers()
       ]);
      
    } catch (error) {
      console.error('Map initialization error:', error);
    }
  };

  const initializeSocket = () => {
    console.log('🔌 Initializing Socket.io connection...');
    
    // Socket event listener'larını ayarla
    socketService.onUserLocationUpdate = handleUserLocationUpdate;
    socketService.onUserJoined = handleUserJoined;
    socketService.onUserLeft = handleUserLeft;
    
    // Socket bağlantısını başlat
    socketService.connect();

    // Socket event listener'ları ekle - ANLIK GÜNCELLEMELER
    socketService.on('user_location_update', (data) => {
      console.log('📍 Real-time location update received:', data);
      handleUserLocationUpdate(data);
    });
    
    socketService.on('nearby_users_list', (data) => {
      console.log('👥 Real-time nearby users list received:', data);
      if (data && data.users) {
        console.log(`👥 Setting ${data.users.length} nearby users`);
        setNearbyUsers(data.users);
      } else {
        console.log('👥 No users in socket response, setting empty array');
        setNearbyUsers([]);
      }
    });

    // Kullanıcı offline olduğunda
    socketService.on('user_offline', (data) => {
      console.log('👋 User went offline:', data);
      if (data && data.userId) {
        setNearbyUsers(prevUsers => 
          prevUsers.filter(user => user.userId !== data.userId)
        );
      }
    });

    // Kullanıcı online olduğunda
    socketService.on('user_online', (data) => {
      console.log('👋 User came online:', data);
      // Online olan kullanıcıyı yakındaki kullanıcılar listesine ekle
      if (data && data.userId) {
        // Bu kullanıcı zaten listede varsa güncelle, yoksa ekle
        setNearbyUsers(prevUsers => {
          const existingIndex = prevUsers.findIndex(user => user.userId === data.userId);
          if (existingIndex >= 0) {
            // Güncelle
            const updatedUsers = [...prevUsers];
            updatedUsers[existingIndex] = {
              ...updatedUsers[existingIndex],
              isOnline: true,
              lastSeen: data.timestamp || new Date().toISOString()
            };
            return updatedUsers;
          } else {
            // Yeni kullanıcı ekle
            return [...prevUsers, {
              userId: data.userId,
              firstName: data.firstName || 'Kullanıcı',
              lastName: data.lastName || '',
              isOnline: true,
              lastSeen: data.timestamp || new Date().toISOString(),
              location: data.location || null
            }];
          }
        });
      }
    });

    // Socket bağlantısı kurulduğunda yakındaki kullanıcıları iste
    socketService.on('connect', () => {
      console.log('✅ Socket connected, requesting nearby users...');
      console.log('🔌 Socket connection details:', {
        socketId: socketService.getSocketId(),
        isLocationSharing,
        hasLocation: !!location
      });
      
      // Bağlantı kurulduktan sonra yakındaki kullanıcıları iste
      setTimeout(() => {
        if (isLocationSharing) {
          console.log('📍 Requesting nearby users via socket...');
          const success = socketService.requestNearbyUsers(5000, 100);
          console.log('📍 Socket request success:', success);
          
          // Socket bağlandığında hemen konum güncelle
          if (location) {
            console.log('📍 Socket connected, immediately sharing location...');
            shareLocationWithServer();
          }
        }
      }, 1000);
    });

    // Socket bağlantı durumu kontrolü
    socketService.on('connection_status', (data) => {
      console.log('🔌 Socket connection status:', data);
    });

    // Socket hataları
    socketService.on('connection_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    socketService.on('nearby_users_error', (error) => {
      console.error('❌ Nearby users error:', error);
    });

    socketService.on('location_error', (error) => {
      console.error('❌ Location error:', error);
    });

    // Socket bağlantı durumunu kontrol et
    setTimeout(() => {
      const isConnected = socketService.isSocketConnected();
      console.log('🔍 Socket connection check:', isConnected);
      if (!isConnected) {
        console.log('⚠️ Socket not connected, retrying...');
        socketService.connect();
      }
    }, 2000);

    // Periyodik olarak socket bağlantısını kontrol et
    const socketCheckInterval = setInterval(() => {
      const isConnected = socketService.isSocketConnected();
      if (!isConnected && isLocationSharing) {
        console.log('🔄 Socket disconnected, attempting to reconnect...');
        socketService.connect();
      }
    }, 10000); // Her 10000ms'de bir kontrol et

    // Cleanup function
    return () => {
      clearInterval(socketCheckInterval);
    };
  };

  const loadLocationSettings = async () => {
    try {
      // Önce backend'den ayarları al
      const token = await apiService.getStoredToken();
      if (token) {
        apiService.setToken(token);
        const response = await apiService.getSettings();
        if (response.success && response.data.settings) {
          const settings = response.data.settings;
          setIsLocationSharing(settings.privacy?.showLocation || false);
          
          // Local storage'ı da güncelle
          await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
          return;
        }
      }
      
      // Backend'den alamazsa local storage'dan yükle
      const localSettings = await AsyncStorage.getItem('userSettings');
      if (localSettings) {
        const parsedSettings = JSON.parse(localSettings);
        setIsLocationSharing(parsedSettings.privacy?.showLocation || false);
      }
    } catch (error) {
      console.error('Settings load error:', error);
      // Hata durumunda local storage'dan yükle
      try {
        const localSettings = await AsyncStorage.getItem('userSettings');
        if (localSettings) {
          const parsedSettings = JSON.parse(localSettings);
          setIsLocationSharing(parsedSettings.privacy?.showLocation || false);
        }
      } catch (localError) {
        console.error('Local settings load error:', localError);
      }
    }
  };

  const loadNearbyUsers = async () => {
    try {
      console.log('🔍 Loading nearby users...');
      const token = await apiService.getStoredToken();
      if (!token) {
        console.log('❌ No token for loading nearby users');
        return;
      }

      apiService.setToken(token);
      
      // API bağlantısını test et
      console.log('🔍 Testing API connection...');
      const connectionTest = await apiService.testConnection();
      if (!connectionTest) {
        console.error('❌ API connection failed');
        return;
      }
      
      console.log('✅ API connection successful, requesting nearby users...');
      
      // Önce kullanıcı profilini kontrol et
      try {
        const profileResponse = await apiService.getProfile();
        console.log('👤 User profile:', {
          id: profileResponse.data?.id,
          firstName: profileResponse.data?.firstName,
          locationSharing: profileResponse.data?.settings?.privacy?.showLocation
        });
      } catch (profileError) {
        console.error('❌ Profile fetch error:', profileError);
      }
      
      // Konum ayarlarını kontrol et
      try {
        const settingsResponse = await apiService.getSettings();
        console.log('⚙️ User settings:', settingsResponse.data?.settings);
      } catch (settingsError) {
        console.error('❌ Settings fetch error:', settingsError);
      }
      
      const response = await apiService.getNearbyUsers(5000, 100); // 5km yarıçap, max 100 kullanıcı
      
      console.log('📍 Nearby users API response:', response);
      console.log('📍 Response success:', response.success);
      console.log('📍 Response data:', response.data);
      console.log('📍 Users count:', response.data?.users?.length || 0);
      
      if (response.success && response.data && response.data.users) {
        console.log('✅ Nearby users loaded:', response.data.users.length);
        console.log('👥 Users data:', response.data.users);
        setNearbyUsers(response.data.users);
      } else {
        console.log('⚠️ No users found or API error:', response);
        console.log('⚠️ Response message:', response.message);
        setNearbyUsers([]);
      }
    } catch (error) {
      console.error('❌ Load nearby users error:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      setNearbyUsers([]);
    }
  };

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        await getCurrentLocation();
        startLocationTracking();
      } else {
        console.log('Konum izni verilmedi, harita placeholder modunda çalışacak');
        // İzin verilmediğinde de haritayı göstermeye devam et
        setLocationPermission(false);
      }
    } catch (error) {
      console.error('Konum izni hatası:', error);
      setLocationPermission(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        maximumAge: 1000, // 1 saniye - daha güncel
        timeout: 5000,    // 5 saniye - hızlı
      });
      
      setLocation(location.coords);
      setLocationAccuracy(location.coords.accuracy);
      setLastLocationUpdate(new Date());
      
      // İlk konum için lastLocation ve lastLocationTime'ı set et
      setLastLocation(location);
      setLastLocationTime(new Date().getTime());
      
      // İlk konum alındığında haritayı otomatik merkezle
      if (mapRef.current) {
        try {
          mapRef.current.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000); // 1 saniyede yumuşak geçiş
        } catch (error) {
          console.error('Initial auto center error:', error);
        }
      }
      
      // Konum paylaşımı aktifse sunucuya gönder
      if (isLocationSharing) {
        await shareLocationWithServer(location.coords);
      }
    } catch (error) {
      console.error('Konum alınamadı:', error);
      Alert.alert('Konum Hatası', 'Konumunuz alınamadı. Lütfen tekrar deneyin.');
    }
  };

  const locationIntervalRef = useRef(null);

  const startLocationTracking = useCallback(() => {
    if (isTrackingLocation || locationIntervalRef.current) return;
    
    setIsTrackingLocation(true);
    
    // Her 500ms'de bir konum güncelle - anlık takip
    locationIntervalRef.current = setInterval(async () => {
      if (isLocationSharing && locationPermission) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            maximumAge: 500, // 500ms - çok güncel veri
            timeout: 1000,   // 1000ms timeout - hızlı
          });
          
          // Hız hesapla (önceki konum ile)
          const speed = calculateSpeed(location.coords);
          setCurrentSpeed(speed);
          
          // Önceki konum bilgilerini güncelle
          setLastLocation(location);
          setLastLocationTime(new Date().getTime());
          
          // State güncellemelerini batch'le
          setLocation(location.coords);
          setLocationAccuracy(location.coords.accuracy);
          setLastLocationUpdate(new Date());
          
          // Konum güncellendiğinde haritayı otomatik merkezle (sadece etkinse)
          if (mapRef.current && autoCenterEnabled) {
            try {
              mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 500); // 500ms'de yumuşak geçiş
            } catch (error) {
              console.error('Auto center error:', error);
            }
          }
          
          await shareLocationWithServer(location.coords);
        } catch (error) {
          console.error('Location tracking error:', error);
          // Hata durumunda tracking'i durdur
          if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
            stopLocationTracking();
          }
        }
      }
        }, 500); // 500ms'de bir güncelle - anlık
  }, [isLocationSharing, locationPermission, isTrackingLocation, shareLocationWithServer]);

  const stopLocationTracking = useCallback(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setIsTrackingLocation(false);
  }, []);

  // Uygulama kapanırken konum paylaşımını durdur
  const stopLocationSharingOnExit = useCallback(async () => {
    try {
      console.log('🚪 Stopping location sharing on app exit...');
      
      const token = await apiService.getStoredToken();
      if (!token) {
        console.log('No token available for stopping location sharing');
        return;
      }

      apiService.setToken(token);
      
      // Önce kullanıcı profilini al (userId için)
      const profileResponse = await apiService.getProfile();
      const userId = profileResponse.data?.id;
      
      if (userId) {
        // Backend'e kullanıcıyı offline olarak işaretle
        await apiService.setUserOffline(userId);
        
        // Socket ile diğer kullanıcılara offline olduğunu bildir
        if (socketService.isSocketConnected()) {
          socketService.emit('user_offline', {
            userId: userId,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        // Fallback: sadece konum paylaşımını durdur
        await apiService.stopLocationSharing();
      }
      
      console.log('✅ Location sharing stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping location sharing on exit:', error);
    }
  }, []);

  const shareLocationWithServer = useCallback(async (coords) => {
    try {
      // Konum verisi kontrolü
      if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
        console.warn('Invalid location data:', coords);
        return;
      }

      const token = await apiService.getStoredToken();
      if (!token) {
        console.warn('No auth token available for location sharing');
        return;
      }

      apiService.setToken(token);
      
      // API bağlantısını test et
      console.log('🔍 API bağlantısı test ediliyor...');
      const connectionTest = await apiService.testConnection();
      if (!connectionTest) {
        console.error('❌ API bağlantısı başarısız, location share atlanıyor');
        return;
      }
      
      // REST API ile konumu kaydet
      const response = await apiService.updateUserLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || 0,
        timestamp: new Date().toISOString()
      });

      if (response.success) {
        console.log('Location saved to server:', response.data);
        
        // Socket.io ile diğer kullanıcılara gerçek zamanlı bildir
        if (socketService.isSocketConnected()) {
          socketService.sendLocationUpdate({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Location sharing error:', error);
      // Network hatası durumunda retry mekanizması eklenebilir
      if (error.message.includes('Network request failed')) {
        console.warn('Network error, location will be retried on next update');
      }
    }
  }, []);

  const toggleLocationSharing = async () => {
    if (!locationPermission) {
      Alert.alert('Konum İzni Gerekli', 'Önce konum iznini etkinleştirin.');
      return;
    }

    const newSharingState = !isLocationSharing;
    setIsLocationSharing(newSharingState);

    // Ayarları kaydet
    try {
      // Önce mevcut ayarları al
      const settings = await AsyncStorage.getItem('userSettings');
      const parsedSettings = settings ? JSON.parse(settings) : {};
      
      // Privacy ayarlarını güncelle
      parsedSettings.privacy = {
        ...parsedSettings.privacy,
        showLocation: newSharingState
      };
      
      // Local storage'a kaydet
      await AsyncStorage.setItem('userSettings', JSON.stringify(parsedSettings));
      
      // Sunucuya ayarları gönder
      const token = await apiService.getStoredToken();
      if (token) {
        apiService.setToken(token);
        const response = await apiService.updateSettings(parsedSettings);
        
        if (response.success) {
          console.log('Konum paylaşım ayarı başarıyla güncellendi:', newSharingState);
          
          // Başarılı mesajı göster
          Alert.alert(
            'Başarılı', 
            newSharingState ? 'Konum paylaşımı açıldı' : 'Konum paylaşımı kapatıldı'
          );
        } else {
          console.error('Settings update failed:', response.message);
          Alert.alert('Hata', 'Ayarlar güncellenirken bir hata oluştu');
          
          // Hata durumunda eski duruma geri döndür
          setIsLocationSharing(!newSharingState);
        }
      } else {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        setIsLocationSharing(!newSharingState);
      }
    } catch (error) {
      console.error('Settings save error:', error);
      Alert.alert('Hata', 'Ayarlar kaydedilirken bir hata oluştu');
      
      // Hata durumunda eski duruma geri döndür
      setIsLocationSharing(!newSharingState);
    }

    // Konum paylaşımı açıldıysa ve konum varsa, hemen paylaş
    if (newSharingState && location) {
      await shareLocationWithServer(location);
    }
  };


  const centerOnUserLocation = useCallback(() => {
    if (location && location.latitude && location.longitude && mapRef.current) {
      try {
        // Otomatik merkezlemeyi tekrar etkinleştir
        setAutoCenterEnabled(true);
        
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      } catch (error) {
        console.error('Error centering map:', error);
      }
    }
  }, [location]);

  const toggleMapType = () => {
    setMapType(mapType === 'standard' ? 'satellite' : 'standard');
  };

  const handleUserLocationUpdate = useCallback((data) => {
    if (!data || !data.userId || !data.location) {
      console.warn('Invalid user location update data:', data);
      return;
    }

    console.log('📍 User location update received:', data);
    console.log('📍 Current location state:', location);

    setNearbyUsers(prevUsers => {
      const existingUserIndex = prevUsers.findIndex(user => user.userId === data.userId);
      
      if (existingUserIndex >= 0) {
        // Kullanıcıyı güncelle
        const updatedUsers = [...prevUsers];
        const existingUser = updatedUsers[existingUserIndex];
        
        // Mesafe hesapla (eğer kendi konumumuz varsa)
        let newDistance = existingUser.distance || 0;
        if (location && location.latitude && location.longitude && data.location && data.location.latitude && data.location.longitude) {
          newDistance = calculateDistance(
            location.latitude, location.longitude,
            parseFloat(data.location.latitude), parseFloat(data.location.longitude)
          );
          console.log(`📍 Updated distance for user ${data.userId}: ${Math.round(newDistance)}m`);
          console.log(`📍 My location: ${location.latitude}, ${location.longitude}`);
          console.log(`📍 Their location: ${data.location.latitude}, ${data.location.longitude}`);
        }
        
        updatedUsers[existingUserIndex] = {
          ...existingUser,
          location: data.location,
          lastSeen: data.timestamp,
          isOnline: true,
          distance: newDistance,
          firstName: data.firstName || existingUser.firstName,
          lastName: data.lastName || existingUser.lastName
        };
        return updatedUsers;
      } else {
        // Yeni kullanıcı ekle
        let newDistance = 0;
        if (location && location.latitude && location.longitude && data.location && data.location.latitude && data.location.longitude) {
          newDistance = calculateDistance(
            location.latitude, location.longitude,
            parseFloat(data.location.latitude), parseFloat(data.location.longitude)
          );
          console.log(`📍 New user ${data.userId} distance: ${Math.round(newDistance)}m`);
        }
        
        return [...prevUsers, {
          userId: data.userId,
          firstName: data.firstName || 'Kullanıcı',
          lastName: data.lastName || '',
          location: data.location,
          lastSeen: data.timestamp,
          isOnline: true,
          distance: newDistance
        }];
      }
    });
  }, [location]);

  // Mesafe hesaplama fonksiyonu
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    try {
      // Koordinatların geçerli olduğunu kontrol et
      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
        console.log('Distance calculation: Invalid coordinates');
        return 0;
      }

      const R = 6371000; // Dünya'nın yarıçapı (metre)
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      // Mesafenin geçerli olduğunu kontrol et
      if (isNaN(distance) || distance < 0) {
        console.log('Distance calculation: Invalid distance result');
        return 0;
      }
      
      // GPS hatası düzeltmesi: Eğer mesafe 50 metreden azsa, çok daha az göster
      if (distance < 50) {
        return Math.max(distance * 0.2, 1); // GPS hatasını büyük oranda düzelt, minimum 1m
      }
      
      return distance;
    } catch (error) {
      console.error('Distance calculation error:', error);
      return 0;
    }
  };

  // Hız hesaplama fonksiyonu - düzeltildi
  const calculateSpeed = (newLocation) => {
    try {
      // Gerekli verilerin varlığını kontrol et
      if (!newLocation || !lastLocation || !lastLocationTime) {
        console.log('Speed calculation: Missing required data');
        return currentSpeed || 0; // Önceki hızı koru
      }

      // Koordinatların geçerli olduğunu kontrol et
      if (!newLocation.latitude || !newLocation.longitude || 
          !lastLocation.latitude || !lastLocation.longitude ||
          isNaN(newLocation.latitude) || isNaN(newLocation.longitude) ||
          isNaN(lastLocation.latitude) || isNaN(lastLocation.longitude)) {
        console.log('Speed calculation: Invalid coordinates');
        return currentSpeed || 0; // Önceki hızı koru
      }

      const now = new Date().getTime();
      const timeDiff = (now - lastLocationTime) / 1000; // saniye cinsinden

      // Zaman farkının geçerli olduğunu kontrol et
      if (timeDiff <= 0 || timeDiff > 10) { // 10 saniyeden fazla geçmişse geçersiz
        console.log('Speed calculation: Invalid time difference:', timeDiff);
        return currentSpeed || 0; // Önceki hızı koru
      }

      // Çok kısa süre için hız hesaplama
      if (timeDiff < 0.2) {
        return currentSpeed || 0; // Çok hızlı güncelleme, önceki hızı koru
      }

      const distance = calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

      // Mesafenin geçerli olduğunu kontrol et
      if (isNaN(distance) || distance < 0) {
        console.log('Speed calculation: Invalid distance:', distance);
        return currentSpeed || 0; // Önceki hızı koru
      }

      // Çok küçük mesafe için hız 0
      if (distance < 0.1) {
        return 0; // Çok küçük mesafe, hız 0
      }

      const speedMs = distance / timeDiff; // m/s
      const speedKmh = speedMs * 3.6; // km/h

      // Hızın geçerli olduğunu kontrol et
      if (isNaN(speedKmh) || speedKmh < 0) {
        console.log('Speed calculation: Invalid speed:', speedKmh);
        return currentSpeed || 0; // Önceki hızı koru
      }

      // Maksimum hız sınırı (200 km/h)
      const finalSpeed = Math.min(speedKmh, 200);
      console.log(`🚗 Speed calculated: ${finalSpeed.toFixed(1)} km/h (distance: ${distance.toFixed(1)}m, time: ${timeDiff.toFixed(1)}s)`);
      
      return finalSpeed;
    } catch (error) {
      console.error('Speed calculation error:', error);
      return currentSpeed || 0; // Hata durumunda önceki hızı koru
    }
  };

  const handleUserJoined = (data) => {
    console.log('User joined:', data);
  };

  const handleUserLeft = (data) => {
    setNearbyUsers(prevUsers => 
      prevUsers.filter(user => user.userId !== data.userId)
    );
  };

  const region = {
    latitude: location?.latitude || 40.9884, // Bağdat Caddesi koordinatları
    longitude: location?.longitude || 29.0255,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };


  // Loading ekranı kaldırıldı - gizli güncelleme

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Modern Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.headerBackground}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <Ionicons name="map" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Harita</Text>
                </View>
              </View>
              
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={[
                    styles.locationToggleButton,
                    isLocationSharing && styles.locationToggleButtonActive
                  ]}
                  onPress={toggleLocationSharing}
                >
                  <Ionicons
                    name={isLocationSharing ? 'location' : 'location-outline'}
                    size={18}
                    color={isLocationSharing ? '#FFFFFF' : colors.primary}
                  />
                </TouchableOpacity>
                
                <View style={styles.statusIndicator}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: isLocationSharing ? colors.success : colors.warning }
                  ]} />
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Map */}
        <View style={styles.map}>
          {(Platform?.OS === 'ios' || Constants?.platform?.ios) ? (
            // iOS: Apple Maps
            <MapView
              ref={mapRef}
              style={styles.mapView}
              provider={PROVIDER_APPLE}
              mapType={mapType}
              initialRegion={region}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={true}
              showsScale={true}
              showsBuildings={true}
              showsTraffic={false}
              showsIndoors={true}
              onRegionChangeComplete={(region) => {
                // Kullanıcı manuel olarak haritayı hareket ettirdiğinde otomatik merkezlemeyi durdur
                setAutoCenterEnabled(false);
              }}
              onRegionChangeStart={() => {
                // Kullanıcı haritayı hareket ettirmeye başladığında otomatik merkezlemeyi durdur
                setAutoCenterEnabled(false);
              }}
            >
              {/* Kullanıcının kendi konumu */}
              {location && location.latitude && location.longitude && (
                <Marker
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  title="Konumunuz"
                  description={`Doğruluk: ${locationAccuracy ? Math.round(locationAccuracy) : 'N/A'}m`}
                  pinColor={colors.primary}
                >
                  <View style={styles.userMarker}>
                    <Ionicons name="person" size={isTablet ? 24 : 20} color="#FFFFFF" />
                  </View>
                </Marker>
              )}


               {/* Diğer kullanıcıların konumları - Üçgen icon ile */}
               {nearbyUsers.map((user, index) => {
                 // Sadece geçerli konum verilerine sahip kullanıcıları göster
                 if (!user.location || !user.location.latitude || !user.location.longitude) {
                   return null;
                 }
                 
                 console.log(`📍 User ${index} data:`, {
                   userId: user.userId,
                   firstName: user.firstName,
                   first_name: user.first_name,
                   lastName: user.lastName,
                   last_name: user.last_name,
                   location: user.location
                 });
                 
                 return (
                   <Marker
                     key={user.userId}
                     coordinate={{
                       latitude: user.location.latitude,
                       longitude: user.location.longitude,
                     }}
                     title={`${user.firstName || user.first_name || `Kullanıcı ${index + 1}`} ${user.lastName || user.last_name || ''}`}
                     description={`${user.distance ? `${Math.round(user.distance)}m uzaklıkta` : 'Yakında'} • ${user.isOnline ? 'Çevrimiçi' : `Son görülme: ${new Date(user.lastSeen).toLocaleTimeString()}`}`}
                     pinColor={colors.secondary}
                   >
                     <View style={styles.triangleMarker}>
                       <Ionicons name="triangle" size={isTablet ? 20 : 16} color="#FFFFFF" />
                     </View>
                   </Marker>
                 );
               })}

              {/* Kullanıcının konum doğruluğu için daire */}
              {location && location.latitude && location.longitude && locationAccuracy && (
                <Circle
                  center={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  radius={locationAccuracy}
                  strokeColor={colors.primary + '40'}
                  fillColor={colors.primary + '20'}
                  strokeWidth={2}
                />
              )}
            </MapView>
          ) : (
            // Android: Placeholder
            <View style={[styles.mapView, styles.androidPlaceholder]}>
              <View style={styles.placeholderContent}>
                <Ionicons name="map-outline" size={64} color={colors.primary} />
                <Text style={styles.placeholderTitle}>Harita</Text>
                <Text style={styles.placeholderSubtitle}>
                  {(Platform?.OS === 'ios' || Constants?.platform?.ios) ? 'iOS için harita yükleniyor...' : 'Android için harita özelliği yakında gelecek'}
                </Text>
                <Text style={styles.placeholderInfo}>
                  Konumunuz: {location && location.latitude && location.longitude ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Alınıyor...'}
                </Text>
                <Text style={styles.placeholderInfo}>
                  Yakındaki kullanıcılar: {nearbyUsers.length}
                </Text>
                <TouchableOpacity 
                  style={styles.placeholderButton}
                  onPress={toggleLocationSharing}
                >
                  <Ionicons 
                    name={isLocationSharing ? 'location' : 'location-outline'} 
                    size={20} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.placeholderButtonText}>
                    {isLocationSharing ? 'Konum Paylaşımını Durdur' : 'Konum Paylaşımını Başlat'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Hız Göstergesi - Sol Üst */}
        <View style={styles.speedIndicator}>
          <View style={styles.speedContainer}>
            <Text style={styles.speedValue}>
              {isNaN(currentSpeed) ? 0 : Math.round(currentSpeed)}
            </Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
          <View style={styles.speedStatus}>
            <View style={[
              styles.speedDot,
              { backgroundColor: (isNaN(currentSpeed) ? 0 : currentSpeed) > 1 ? colors.success : colors.warning }
            ]} />
            <Text style={styles.speedStatusText}>
              {(isNaN(currentSpeed) ? 0 : currentSpeed) > 1 ? 'Hareket Halinde' : 'Durmakta'}
            </Text>
          </View>
        </View>

        {/* Kontrol Butonları - Alt Sağ */}
        <Animated.View 
          style={[
            styles.controlButtons,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.controlButtonsContainer}>
            {/* Konuma Odaklan Butonu */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={centerOnUserLocation}
            >
              <Ionicons name="locate" size={isTablet ? 28 : 24} color={colors.primary} />
            </TouchableOpacity>

            {/* Harita Türü Değiştir Butonu */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleMapType}
            >
              <Ionicons
                name={mapType === 'standard' ? 'map' : 'globe'}
                size={isTablet ? 28 : 24}
                color={colors.primary}
              />
            </TouchableOpacity>

             {/* Kullanıcı Listesi Butonu kaldırıldı */}
          </View>
        </Animated.View>

        {/* Kullanıcı Listesi - Şimdilik devre dışı */}
        {/* 
        {showUserList && (
          <Animated.View 
            style={[
              styles.userList,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.userListContent}>
              <View style={styles.userListHeader}>
                <Text style={styles.userListTitle}>Yakındaki Kullanıcılar</Text>
                <TouchableOpacity onPress={() => setShowUserList(false)}>
                  <Ionicons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
              
              {nearbyUsers.length > 0 ? (
                nearbyUsers.map((user, index) => (
                  <View key={user.userId || index} style={styles.userItem}>
                    <View style={styles.userAvatar}>
                      <Ionicons name="person" size={isTablet ? 24 : 20} color="#FFFFFF" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {user.firstName || user.first_name || `Kullanıcı ${index + 1}`} {user.lastName || user.last_name || ''}
                      </Text>
                      <Text style={styles.userLastSeen}>
                        {user.distance ? `${Math.round(user.distance)}m uzaklıkta` : 'Yakında'}
                      </Text>
                      <Text style={styles.userLastSeen}>
                        {user.isOnline ? 'Çevrimiçi' : `Son görülme: ${user.lastSeen ? new Date(user.lastSeen).toLocaleTimeString() : 'Bilinmiyor'}`}
                      </Text>
                    </View>
                    <View style={styles.userStatus}>
                      <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                    </View>
                  </View>
                ))
              ) : (
              <View style={styles.noUsersContainer}>
                <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.noUsersText}>Yakında kullanıcı bulunmuyor</Text>
                <Text style={styles.noUsersSubtext}>
                  Konum paylaşımı: {isLocationSharing ? 'Açık' : 'Kapalı'}
                </Text>
                <Text style={styles.noUsersSubtext}>
                  Socket: {socketService.isSocketConnected() ? 'Bağlı' : 'Bağlı değil'}
                </Text>
                <Text style={styles.noUsersSubtext}>
                  Debug: {nearbyUsers.length} kullanıcı bulundu
                </Text>
                <TouchableOpacity 
                  style={styles.debugButton}
                  onPress={() => {
                    console.log('🔍 Debug info requested');
                    console.log('🔍 Location sharing:', isLocationSharing);
                    console.log('🔍 Socket connected:', socketService.isSocketConnected());
                    console.log('🔍 Nearby users count:', nearbyUsers.length);
                    console.log('🔍 Current location:', location);
                    
                    // Socket bağlantısını test et
                    socketService.testConnection().then(debugInfo => {
                      console.log('🔍 Socket debug info:', debugInfo);
                    });
                    
                    // API bağlantısını test et
                    apiService.testConnection().then(result => {
                      console.log('🔍 API connection test:', result);
                    });
                  }}
                >
                  <Text style={styles.debugButtonText}>Debug Bilgileri</Text>
                </TouchableOpacity>
              </View>
              )}
            </View>
          </Animated.View>
        )}
        */}

      </SafeAreaView>
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: scaleFont(18),
    color: colors.text.secondary,
    marginTop: verticalScale(15),
  },
  map: {
    flex: 1,
  },
  mapView: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: (Platform?.OS === 'ios' || Constants?.platform?.ios) ? 44 : (StatusBar?.currentHeight || Constants?.statusBarHeight || 24),
  },
  headerBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(25px)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(isTablet ? 24 : 16),
    paddingVertical: verticalScale(isTablet ? 16 : 12),
    minHeight: verticalScale(isTablet ? 70 : 56),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: scale(isTablet ? 48 : 40),
    height: scale(isTablet ? 48 : 40),
    borderRadius: scale(isTablet ? 24 : 20),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(isTablet ? 14 : 12),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: scaleFont(isTablet ? 22 : 18),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: scaleFont(isTablet ? 13 : 11),
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '600',
    opacity: 0.9,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationToggleButton: {
    width: scale(isTablet ? 44 : 38),
    height: scale(isTablet ? 44 : 38),
    borderRadius: scale(isTablet ? 22 : 19),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(isTablet ? 12 : 10),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  locationToggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  statusIndicator: {
    width: scale(isTablet ? 12 : 10),
    height: scale(isTablet ? 12 : 10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: scale(isTablet ? 10 : 8),
    height: scale(isTablet ? 10 : 8),
    borderRadius: scale(isTablet ? 5 : 4),
  },
  speedIndicator: {
    position: 'absolute',
    left: scale(isTablet ? 24 : isSmallScreen ? 12 : 16),
    top: (Platform?.OS === 'ios' || Constants?.platform?.ios) ? 44 + verticalScale(isTablet ? 90 : isSmallScreen ? 60 : 70) : (StatusBar?.currentHeight || Constants?.statusBarHeight || 24) + verticalScale(isTablet ? 90 : isSmallScreen ? 60 : 70),
    zIndex: 1000,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: scale(isTablet ? 20 : isSmallScreen ? 14 : 16),
    padding: scale(isTablet ? 20 : isSmallScreen ? 12 : 16),
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: scale(isTablet ? 140 : isSmallScreen ? 100 : 120),
    backdropFilter: 'blur(20px)',
  },
  speedContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(isTablet ? 8 : 6),
  },
  speedValue: {
    fontSize: scaleFont(isTablet ? 36 : 28),
    fontWeight: '800',
    color: colors.primary,
    lineHeight: scaleFont(isTablet ? 40 : 32),
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  speedUnit: {
    fontSize: scaleFont(isTablet ? 16 : 14),
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: verticalScale(isTablet ? -4 : -2),
    opacity: 0.8,
  },
  speedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedDot: {
    width: scale(isTablet ? 8 : 6),
    height: scale(isTablet ? 8 : 6),
    borderRadius: scale(isTablet ? 4 : 3),
    marginRight: scale(isTablet ? 6 : 4),
  },
  speedStatusText: {
    fontSize: scaleFont(isTablet ? 13 : 11),
    fontWeight: '600',
    color: colors.text.secondary,
    opacity: 0.9,
  },
  controlButtons: {
    position: 'absolute',
    right: scale(isTablet ? 24 : isSmallScreen ? 12 : 16),
    bottom: verticalScale(isTablet ? 120 : isSmallScreen ? 80 : 100),
    zIndex: 1000,
  },
  controlButtonsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: scale(isTablet ? 30 : isSmallScreen ? 20 : 25),
    padding: scale(isTablet ? 8 : isSmallScreen ? 4 : 6),
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
  },
  controlButton: {
    width: scale(isTablet ? 56 : isSmallScreen ? 40 : 46),
    height: scale(isTablet ? 56 : isSmallScreen ? 40 : 46),
    borderRadius: scale(isTablet ? 28 : isSmallScreen ? 20 : 23),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: scale(isTablet ? 4 : isSmallScreen ? 2 : 3),
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.warning,
    borderRadius: scale(isTablet ? 12 : 10),
    minWidth: scale(isTablet ? 24 : 20),
    height: scale(isTablet ? 24 : 20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: scaleFont(isTablet ? 14 : 12),
    fontWeight: 'bold',
  },
  userList: {
    position: 'absolute',
    bottom: verticalScale(isTablet ? 40 : 20),
    left: getResponsivePadding(isTablet ? 30 : 20),
    right: getResponsivePadding(isTablet ? 30 : 20),
    maxHeight: verticalScale(isTablet ? 400 : 300),
    zIndex: 1000,
  },
  userListContent: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: scale(isTablet ? 24 : 18),
    padding: scale(isTablet ? 24 : 18),
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
  },
  userListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(isTablet ? 20 : 15),
  },
  userListTitle: {
    fontSize: scaleFont(isTablet ? 24 : 20),
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(isTablet ? 18 : 12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: scale(isTablet ? 12 : 8),
    marginVertical: verticalScale(isTablet ? 4 : 2),
    paddingHorizontal: scale(isTablet ? 12 : 8),
  },
  userAvatar: {
    width: scale(isTablet ? 54 : 44),
    height: scale(isTablet ? 54 : 44),
    borderRadius: scale(isTablet ? 27 : 22),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(isTablet ? 20 : 15),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scaleFont(isTablet ? 22 : 18),
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  userLastSeen: {
    fontSize: scaleFont(isTablet ? 15 : 13),
    color: colors.text.secondary,
    marginTop: scale(isTablet ? 4 : 2),
    fontWeight: '500',
    opacity: 0.8,
  },
  userStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: scale(isTablet ? 16 : 12),
    height: scale(isTablet ? 16 : 12),
    borderRadius: scale(isTablet ? 8 : 6),
  },
  noUsersContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(isTablet ? 30 : 20),
  },
  noUsersText: {
    fontSize: scaleFont(isTablet ? 18 : 16),
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: verticalScale(10),
    fontWeight: '600',
  },
  noUsersSubtext: {
    fontSize: scaleFont(isTablet ? 14 : 12),
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: verticalScale(5),
    lineHeight: scaleFont(18),
  },
  userMarker: {
    width: scale(isTablet ? 50 : 40),
    height: scale(isTablet ? 50 : 40),
    borderRadius: scale(isTablet ? 25 : 20),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: isTablet ? 4 : 3,
    borderColor: '#FFFFFF',
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  otherUserMarker: {
    width: scale(isTablet ? 40 : 30),
    height: scale(isTablet ? 40 : 30),
    borderRadius: scale(isTablet ? 20 : 15),
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: isTablet ? 3 : 2,
    borderColor: '#FFFFFF',
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Android placeholder styles
  androidPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(40),
  },
  placeholderTitle: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: verticalScale(20),
    marginBottom: verticalScale(10),
  },
  placeholderSubtitle: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: verticalScale(20),
    lineHeight: scaleFont(22),
  },
  placeholderInfo: {
    fontSize: scaleFont(14),
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  placeholderButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: getResponsivePadding(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(20),
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  placeholderButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  debugButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: getResponsivePadding(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    marginTop: verticalScale(15),
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(14),
    fontWeight: '600',
    textAlign: 'center',
  },
});
