import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  Dimensions,
  Switch,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';
import socketService from '../services/socketService';
import { colors } from '../constants/colors';
import { 
  scale, 
  verticalScale, 
  scaleFont, 
  getResponsivePadding, 
  isIOS,
  isAndroid,
  isTablet,
  isSmallScreen,
  isLargeScreen,
  getBottomSafeArea
} from '../utils/responsive';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const bottomSafeArea = getBottomSafeArea();

export default function ProfileScreen({ route, navigation }) {
  const { onLogout } = route.params || {};
  const stackNavigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [userInfo, setUserInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    birth_date: '',
    gender: '',
    profile_picture: '',
    is_verified: false,
    email_verified: false,
  });
  const [editData, setEditData] = useState({});
  const [profileData, setProfileData] = useState(null); // Gelişmiş profil bilgileri
  const [socialMedia, setSocialMedia] = useState({
    instagram: '',
    tiktok: ''
  });
  const [userStats, setUserStats] = useState({
    friends: 0,
    messages: 0,
    photos: 0
  });
  const [socialStats, setSocialStats] = useState({
    profileVisits: 0,
    todayVisits: 0,
    weekVisits: 0,
    monthVisits: 0,
    followers: 0,
    following: 0
  });
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  
  // Araç bilgileri için state'ler
  const [vehicles, setVehicles] = useState([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleFormData, setVehicleFormData] = useState({
    plate_number: '',
    brand: '',
    model: '',
    additional_info: '',
    photo: null
  });
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  
  // Arkadaş detay modalı için state'ler
  const [showFriendDetailModal, setShowFriendDetailModal] = useState(false);
  const [selectedFriendDetail, setSelectedFriendDetail] = useState(null);
  const [isLoadingFriendDetail, setIsLoadingFriendDetail] = useState(false);


  const menuItems = [
    {
      id: '1',
      title: 'Profil Ayarları',
      icon: 'person-outline',
      color: colors.primary,
      onPress: () => stackNavigation.navigate('Settings'),
    },
    {
      id: '2',
      title: 'Abonelik Planım',
      icon: 'diamond-outline',
      color: colors.secondary,
      onPress: () => Alert.alert('Abonelik Planım', 'Şu anda ücretsiz plandasınız.\n\nPremium özellikler yakında eklenecek.'),
    },
    {
      id: '3',
      title: 'Güvenlik',
      icon: 'shield-outline',
      color: colors.accent,
      onPress: () => Alert.alert('Güvenlik', 'Şifre değiştirme ve güvenlik seçenekleri yakında eklenecek.'),
    },
    {
      id: '4',
      title: 'Yardım & Destek',
      icon: 'help-circle-outline',
      color: colors.info,
      onPress: () => Alert.alert('Yardım & Destek', 'Sorularınız için:\n\n📧 Email: destek@caddate.com\n\nYakında canlı destek eklenecek.'),
    },
    {
      id: '5',
      title: 'Hakkında',
      icon: 'information-circle-outline',
      color: colors.primary,
      onPress: () => Alert.alert('Hakkında', 'Caddate v1.0.0\nBağdat Caddesi\'nin sosyal uygulaması'),
    },
  ];

  // Profil bilgilerini yükle
  useEffect(() => {
    loadProfile();
    loadUserStats();
    loadActivities();
    loadFriends();
    loadVehicles();

    // Socket bağlantısını başlat
    socketService.connect();

    // İstatistikleri her 5 dakikada bir güncelle (daha az sık)
    const statsInterval = setInterval(() => {
      loadUserStats();
    }, 300000); // 5 dakika

    return () => {
      clearInterval(statsInterval);
      // Socket event listener'larını temizle
      socketService.off('new_activity');
      socketService.off('activities_list');
    };
  }, []);

  // Ekran focus olduğunda istatistikleri yenile
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserStats();
      loadActivities();
      loadSocialStats();
    });

    return unsubscribe;
  }, [navigation]);

  // Socket event listener'ları
  useEffect(() => {
    // Yeni aktivite geldiğinde
    const handleNewActivity = (activity) => {
      console.log('Yeni aktivite alındı:', activity);
      setActivities(prevActivities => [activity, ...prevActivities.slice(0, 4)]); // Son 5 aktiviteyi tut
      
      // Bildirim göster
      setNotificationMessage(activity.title);
      setShowNotification(true);
      
      // 3 saniye sonra bildirimi gizle
      setTimeout(() => {
        setShowNotification(false);
      }, 3000);
    };

    // Aktivite listesi geldiğinde
    const handleActivitiesList = (activitiesList) => {
      console.log('Aktivite listesi alındı:', activitiesList);
      setActivities(activitiesList);
    };

    // Event listener'ları ekle
    socketService.on('new_activity', handleNewActivity);
    socketService.on('activities_list', handleActivitiesList);

    return () => {
      // Cleanup
      socketService.off('new_activity', handleNewActivity);
      socketService.off('activities_list', handleActivitiesList);
    };
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        if (onLogout) {
          onLogout();
        }
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      
      const response = await apiService.getProfile();
      
      if (response.success) {
        setUserInfo(response.data.user);
        setEditData(response.data.user);
        
        // Gelişmiş profil bilgilerini yükle
        if (response.data.profile) {
          setProfileData(response.data.profile);
          // Sosyal medya linklerini state'e aktar
          if (response.data.profile.social_media) {
            const socialMediaData = typeof response.data.profile.social_media === 'string' 
              ? JSON.parse(response.data.profile.social_media) 
              : response.data.profile.social_media;
            setSocialMedia({
              instagram: socialMediaData.instagram || '',
              tiktok: socialMediaData.tiktok || ''
            });
          }
        }
      }
    } catch (error) {
      console.error('Profile load error:', error);
      
      // Hata mesajını daha detaylı göster
      let errorMessage = 'Profil bilgileri yüklenirken bir hata oluştu';
      
      if (error.message.includes('deaktif')) {
        errorMessage = 'Hesabınız deaktif durumda. Lütfen yönetici ile iletişime geçin.';
      } else if (error.message.includes('Sunucuya bağlanılamıyor')) {
        errorMessage = 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.';
      } else if (error.message.includes('Token süresi dolmuş') || error.message.includes('Erişim token')) {
        errorMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
        // Token süresi dolmuşsa çıkış yap
        apiService.clearToken();
        if (onLogout) {
          onLogout();
        }
        return;
      }
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        console.log('No token found for stats loading');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      
      console.log('Loading user stats...');
      const response = await apiService.getUserStats();
      
      if (response.success) {
        console.log('User stats loaded successfully:', response.data);
        setUserStats(response.data);
      } else {
        console.error('Failed to load user stats:', response.message);
      }
    } catch (error) {
      console.error('User stats load error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      // İstatistik yükleme hatası kritik değil, sessizce devam et
      // Ancak varsayılan değerleri kullan
      setUserStats({
        friends: 0,
        messages: 0,
        photos: 0
      });
    }
  };

  const loadActivities = async () => {
    try {
      console.log('Loading activities...');
      // Socket üzerinden aktivite listesini iste
      socketService.requestActivities();
    } catch (error) {
      console.error('Activities load error:', error);
      // Hata durumunda boş liste kullan
      setActivities([]);
    }
  };

  const loadSocialStats = async () => {
    try {
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        console.log('No token found for social stats loading');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      
      console.log('Loading social stats...');
      
      // Profil ziyaret istatistiklerini yükle
      const visitStatsResponse = await apiService.getProfileVisitStats();
      if (visitStatsResponse.success) {
        const visitStats = visitStatsResponse.data;
        
        // Takip istatistiklerini yükle
        const followStatsResponse = await apiService.getFollowStats();
        if (followStatsResponse.success) {
          const followStats = followStatsResponse.data;
          
          setSocialStats({
            profileVisits: visitStats.totalVisits,
            todayVisits: visitStats.todayVisits,
            weekVisits: visitStats.weekVisits,
            monthVisits: visitStats.monthVisits,
            followers: followStats.followersCount,
            following: followStats.followingCount
          });
        }
      }
      
      // Son ziyaretçileri yükle
      const visitorsResponse = await apiService.getRecentVisitors(5);
      if (visitorsResponse.success) {
        setRecentVisitors(visitorsResponse.data);
      }
      
    } catch (error) {
      console.error('Social stats load error:', error);
      // Hata durumunda varsayılan değerleri kullan
      setSocialStats({
        profileVisits: 0,
        todayVisits: 0,
        weekVisits: 0,
        monthVisits: 0,
        followers: 0,
        following: 0
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...userInfo });
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      apiService.setToken(token);
      
      // Temel profil bilgilerini güncelle
      const response = await apiService.updateProfile(editData);
      
      if (response.success) {
        setUserInfo(response.data.user);
        
        // Sosyal medya linklerini de güncelle
        try {
          const socialMediaResponse = await apiService.updateAdvancedProfile({
            socialMedia: socialMedia
          });
          
          if (socialMediaResponse.success) {
            setProfileData(socialMediaResponse.data);
          }
        } catch (socialError) {
          console.error('Social media update error:', socialError);
          // Sosyal medya güncelleme hatası kritik değil, devam et
        }
        
        setIsEditing(false);
        Alert.alert('Başarılı', 'Profil başarıyla güncellendi');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Hata', error.message || 'Profil güncellenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ ...userInfo });
    // Sosyal medya değişikliklerini geri al
    if (profileData && profileData.social_media) {
      const socialMediaData = typeof profileData.social_media === 'string' 
        ? JSON.parse(profileData.social_media) 
        : profileData.social_media;
      setSocialMedia({
        instagram: socialMediaData.instagram || '',
        tiktok: socialMediaData.tiktok || ''
      });
    } else {
      setSocialMedia({
        instagram: '',
        tiktok: ''
      });
    }
  };

  const handleImagePicker = () => {
    setShowImagePicker(true);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        await uploadProfilePicture(imageUri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu');
    } finally {
      setShowImagePicker(false);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        await uploadProfilePicture(imageUri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu');
    } finally {
      setShowImagePicker(false);
    }
  };

  const uploadProfilePicture = async (imageUri) => {
    try {
      console.log('📸 ProfileScreen: uploadProfilePicture başlatıldı');
      console.log('📸 ProfileScreen: imageUri:', imageUri);
      setIsUploading(true);
      
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      console.log('📸 ProfileScreen: Token alındı:', token ? 'Mevcut' : 'Yok');
      if (!token) {
        console.log('📸 ProfileScreen: Token yok, hata döndürülüyor');
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      console.log('📸 ProfileScreen: Token API servisine set edildi');
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('profile_picture', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });

      console.log('📸 ProfileScreen: FormData oluşturuldu');
      console.log('📸 ProfileScreen: Image URI:', imageUri);
      console.log('📸 ProfileScreen: Token (first 20 chars):', token.substring(0, 20) + '...');
      
      console.log('📸 ProfileScreen: API servisine istek gönderiliyor...');
      const response = await apiService.uploadProfilePicture(formData);
      
      console.log('📸 ProfileScreen: API yanıtı alındı:', response);
      
      if (response.success) {
        console.log('📸 ProfileScreen: Başarılı yanıt');
        console.log('📸 ProfileScreen: Profile picture URL:', response.data.profile_picture);
        console.log('📸 ProfileScreen: User info before update:', userInfo);
        
        // State'i güncelle
        const newUserInfo = { ...userInfo, profile_picture: response.data.profile_picture };
        const newEditData = { ...editData, profile_picture: response.data.profile_picture };
        
        setUserInfo(newUserInfo);
        setEditData(newEditData);
        
        console.log('📸 ProfileScreen: State güncellendi');
        console.log('📸 ProfileScreen: User info after update:', newUserInfo);
        Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
      } else {
        console.log('📸 ProfileScreen: Başarısız yanıt:', response);
        Alert.alert('Hata', response.message || 'Fotoğraf yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('📸 ProfileScreen: Upload error:', error);
      console.error('📸 ProfileScreen: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert('Hata', error.message || 'Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      console.log('📸 ProfileScreen: Upload işlemi tamamlandı');
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await apiService.logout();
              apiService.clearToken();
              if (onLogout) {
                onLogout();
              }
            } catch (error) {
              console.error('Logout error:', error);
              // Hata olsa bile çıkış yap
              apiService.clearToken();
              if (onLogout) {
                onLogout();
              }
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Hesabı Sil', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await apiService.deleteAccount();
              apiService.clearToken();
              if (onLogout) {
                onLogout();
              }
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert('Hata', error.message || 'Hesap silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatActivityTime = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Az önce';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} dk önce`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} saat önce`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} gün önce`;
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'message':
        return 'chatbubble';
      case 'photo':
        return 'heart';
      case 'friend_request':
        return 'person-add';
      case 'like':
        return 'thumbs-up';
      default:
        return 'notifications';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'message':
        return colors.secondary;
      case 'photo':
        return colors.primary;
      case 'friend_request':
        return colors.accent;
      case 'like':
        return colors.success;
      default:
        return colors.text.secondary;
    }
  };

  // Email doğrulama kodu gönder
  const sendEmailVerification = async () => {
    try {
      setIsVerifyingEmail(true);
      
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      
      const response = await apiService.sendVerificationCode(userInfo.email, 'email_verification');
      
      if (response.success) {
        setShowVerificationModal(true);
        Alert.alert('Başarılı', 'Doğrulama kodu e-posta adresinize gönderildi');
      } else {
        Alert.alert('Hata', response.message || 'Doğrulama kodu gönderilemedi');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      Alert.alert('Hata', error.message || 'Doğrulama kodu gönderilirken bir hata oluştu');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Email doğrulama kodunu doğrula
  const verifyEmailCode = async () => {
    try {
      if (!verificationCode.trim()) {
        Alert.alert('Hata', 'Lütfen doğrulama kodunu girin');
        return;
      }

      setIsVerifyingEmail(true);
      
      const response = await apiService.verifyCode(userInfo.email, verificationCode, 'email_verification');
      
      if (response.success) {
        setShowVerificationModal(false);
        setVerificationCode('');
        
        // Kullanıcı bilgilerini güncelle
        setUserInfo({...userInfo, email_verified: true, is_verified: true});
        
        Alert.alert('Başarılı', 'E-posta adresiniz başarıyla doğrulandı');
      } else {
        Alert.alert('Hata', response.message || 'Doğrulama kodu hatalı');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      Alert.alert('Hata', error.message || 'Doğrulama sırasında bir hata oluştu');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Arkadaş listesini yükle
  const loadFriends = async () => {
    try {
      setIsLoadingFriends(true);
      
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        console.log('No token found for friends loading');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      
      const response = await apiService.getFriends();
      
      if (response.success) {
        setFriends(response.data);
      } else {
        console.error('Failed to load friends:', response.message);
      }
    } catch (error) {
      console.error('Friends load error:', error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  // Araç bilgilerini yükle
  const loadVehicles = async () => {
    try {
      setIsLoadingVehicles(true);
      
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        console.log('No token found for vehicles loading');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      
      const response = await apiService.getUserVehicles();
      
      if (response.success) {
        setVehicles(response.data || []);
      } else {
        console.error('Failed to load vehicles:', response.message);
      }
    } catch (error) {
      console.error('Vehicles load error:', error);
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  // Araç modal'ını aç
  const openVehicleModal = (vehicle = null) => {
    if (vehicle) {
      setSelectedVehicle(vehicle);
      setVehicleFormData({
        plate_number: vehicle.plate_number || '',
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        additional_info: vehicle.additional_info || '',
        photo: vehicle.photo_url || null
      });
    } else {
      setSelectedVehicle(null);
      setVehicleFormData({
        plate_number: '',
        brand: '',
        model: '',
        additional_info: '',
        photo: null
      });
    }
    setShowVehicleModal(true);
  };

  // Araç fotoğrafı seçici
  const handleVehiclePhotoPicker = () => {
    Alert.alert(
      'Araç Fotoğrafı',
      'Fotoğraf seçme yöntemini seçin',
      [
        {
          text: 'Galeri',
          onPress: () => pickVehicleImageFromGallery(),
        },
        {
          text: 'Kamera',
          onPress: () => takeVehiclePhoto(),
        },
        {
          text: 'İptal',
          style: 'cancel',
        },
      ]
    );
  };

  // Galeriden araç fotoğrafı seç
  const pickVehicleImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Seçilen fotoğrafı form verilerine ekle
        setVehicleFormData(prev => ({
          ...prev,
          photo: result.assets[0].uri
        }));
      }
    } catch (error) {
      console.error('Vehicle image picker error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu');
    }
  };

  // Kamera ile araç fotoğrafı çek
  const takeVehiclePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Çekilen fotoğrafı form verilerine ekle
        setVehicleFormData(prev => ({
          ...prev,
          photo: result.assets[0].uri
        }));
      }
    } catch (error) {
      console.error('Vehicle camera error:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu');
    }
  };

  // Arkadaş detaylarını yükle
  const loadFriendDetail = async (friend) => {
    try {
      setIsLoadingFriendDetail(true);
      setSelectedFriendDetail(null);
      
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      apiService.setToken(token);
      
      // Arkadaş profil bilgilerini ve araçlarını paralel olarak yükle
      const [profileResponse, vehiclesResponse] = await Promise.all([
        apiService.getUserProfile(friend.id),
        apiService.getFriendVehicles(friend.id)
      ]);
      
      if (profileResponse.success) {
        const friendData = {
          ...profileResponse.data,
          vehicles: vehiclesResponse.success ? vehiclesResponse.data.vehicles : []
        };
        setSelectedFriendDetail(friendData);
        setShowFriendDetailModal(true);
      } else {
        Alert.alert('Hata', profileResponse.message || 'Arkadaş bilgileri yüklenemedi');
      }
    } catch (error) {
      console.error('Friend detail load error:', error);
      Alert.alert('Hata', 'Arkadaş bilgileri yüklenirken bir hata oluştu');
    } finally {
      setIsLoadingFriendDetail(false);
    }
  };

  // Araç kaydetme fonksiyonu
  const saveVehicle = async () => {
    try {
      setIsSavingVehicle(true);

      // Form doğrulama
      if (!vehicleFormData.plate_number.trim() || !vehicleFormData.brand.trim() || !vehicleFormData.model.trim()) {
        Alert.alert('Hata', 'Plaka, marka ve model alanları zorunludur');
        return;
      }

      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      apiService.setToken(token);

      let response;
      if (selectedVehicle) {
        // Güncelleme
        response = await apiService.updateVehicle(selectedVehicle.id, vehicleFormData);
      } else {
        // Yeni ekleme
        response = await apiService.addVehicle(vehicleFormData);
      }

      if (response.success) {
        Alert.alert('Başarılı', selectedVehicle ? 'Araç güncellendi' : 'Araç eklendi');
        setShowVehicleModal(false);
        setSelectedVehicle(null);
        setVehicleFormData({
          plate_number: '',
          brand: '',
          model: '',
          additional_info: '',
          photo: null
        });
        // Araç listesini yenile
        loadVehicles();
      } else {
        Alert.alert('Hata', response.message || 'Araç kaydedilirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Vehicle save error:', error);
      Alert.alert('Hata', error.message || 'Araç kaydedilirken bir hata oluştu');
    } finally {
      setIsSavingVehicle(false);
    }
  };

  // Arkadaş çıkar
  const removeFriend = async (friendId, friendName) => {
    Alert.alert(
      'Arkadaş Çıkar',
      `${friendName} arkadaş listenizden çıkarılsın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.removeFriend(friendId);
              
              if (response.success) {
                // Arkadaş listesini güncelle
                setFriends(friends.filter(friend => friend.id !== friendId));
                // İstatistikleri güncelle
                setUserStats(prev => ({...prev, friends: prev.friends - 1}));
                Alert.alert('Başarılı', 'Arkadaş listeden çıkarıldı');
              } else {
                Alert.alert('Hata', response.message || 'Arkadaş çıkarılırken bir hata oluştu');
              }
            } catch (error) {
              console.error('Remove friend error:', error);
              Alert.alert('Hata', error.message || 'Arkadaş çıkarılırken bir hata oluştu');
            }
          }
        }
      ]
    );
  };


  const renderStat = (stat, index) => (
    <TouchableOpacity 
      key={index} 
      style={styles.statCard}
      onPress={() => {
        if (stat.label === 'Arkadaş') {
          setShowFriendsModal(true);
        } else {
          Alert.alert('Bilgi', `${stat.label} detayları yakında eklenecek`);
        }
      }}
    >
      <Ionicons name={stat.icon} size={24} color={colors.primary} />
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
    </TouchableOpacity>
  );

  // İstatistikler ve hızlı erişim verileri - gerçek verilerle
  const stats = [
    { label: 'Arkadaş', value: userStats.friends.toString(), icon: 'people' },
    { label: 'Mesaj', value: userStats.messages.toString(), icon: 'chatbubbles' },
    { label: 'Fotoğraf', value: userStats.photos.toString(), icon: 'camera' },
  ];

  // Sosyal istatistikler
  const socialStatsData = [
    { label: 'Ziyaret', value: socialStats.profileVisits.toString(), icon: 'eye' },
    { label: 'Takipçi', value: socialStats.followers.toString(), icon: 'heart' },
    { label: 'Takip', value: socialStats.following.toString(), icon: 'person-add' },
  ];

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={item.onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={24} color={colors.text.primary} />
      </View>
      <Text style={styles.menuTitle}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
    </View>
  );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <LinearGradient
            colors={colors.gradients.redBlack}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={isEditing ? handleCancel : handleEdit}
              >
                <Ionicons 
                  name={isEditing ? "close" : "create-outline"} 
                  size={24} 
                  color={colors.text.light} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.profileImageContainer}
                onPress={isEditing ? handleImagePicker : null}
                onLongPress={() => setShowImagePreview(true)}
                disabled={!isEditing && !userInfo.profile_picture}
              >
                <Image
                  source={{ 
                    uri: userInfo.profile_picture || 'https://via.placeholder.com/120x120/cccccc/666666?text=Profil' 
                  }}
                  style={styles.profileImage}
                  onError={(error) => {
                    console.log('Image load error:', error);
                  }}
                />
                {isEditing && (
                  <View style={styles.imageEditOverlay}>
                    <Ionicons name="camera" size={24} color={colors.text.light} />
                  </View>
                )}
                {isUploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color={colors.text.light} />
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <Ionicons name="settings-outline" size={24} color={colors.text.light} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {userInfo.first_name} {userInfo.last_name}
              </Text>
              <Text style={styles.userAge}>
                {calculateAge(userInfo.birth_date)} yaşında
              </Text>
              <Text style={styles.userEmail}>{userInfo.email}</Text>
            </View>
          </LinearGradient>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {stats.map(renderStat)}
          </View>


          {/* Araç Bilgileri - Modern Tasarım */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="car-sport" size={24} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Araç Bilgileri</Text>
                  <Text style={styles.sectionSubtitle}>
                    {vehicles.length > 0 ? `${vehicles.length} araç` : 'Araç ekleyin'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.addVehicleButton}
                onPress={() => openVehicleModal()}
              >
                <Ionicons name="add-circle" size={24} color={colors.primary} />
                <Text style={styles.addVehicleText}>Ekle</Text>
              </TouchableOpacity>
            </View>
            
            {isLoadingVehicles ? (
              <View style={styles.vehicleLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.vehicleLoadingText}>Araçlar yükleniyor...</Text>
              </View>
            ) : vehicles.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.vehicleScrollContainer}
                contentContainerStyle={styles.vehicleScrollContent}
              >
                {vehicles.map((vehicle, index) => (
                  <View 
                    key={vehicle.id || index} 
                    style={[
                      styles.vehicleCard,
                      index === vehicles.length - 1 && styles.lastVehicleCard
                    ]}
                  >
                    {/* Araç Fotoğrafı */}
                    <View style={styles.vehicleImageContainer}>
                      {vehicle.photo_url ? (
                        <Image
                          source={{ uri: vehicle.photo_url }}
                          style={styles.vehicleImage}
                        />
                      ) : (
                        <View style={styles.vehicleImagePlaceholder}>
                          <Ionicons name="car" size={32} color={colors.text.tertiary} />
                        </View>
                      )}
                      {vehicle.is_primary && (
                        <View style={styles.primaryVehicleBadge}>
                          <Ionicons name="star" size={12} color={colors.text.light} />
                        </View>
                      )}
                    </View>
                    
                    {/* Araç Bilgileri */}
                    <View style={styles.vehicleCardContent}>
                      <View style={styles.vehicleCardHeader}>
                        <Text style={styles.vehicleBrandModel}>
                          {vehicle.brand} {vehicle.model}
                        </Text>
                        <TouchableOpacity 
                          style={styles.vehicleEditButton}
                          onPress={() => openVehicleModal(vehicle)}
                        >
                          <Ionicons name="create-outline" size={16} color={colors.text.secondary} />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.vehiclePlateContainer}>
                        <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                        <Text style={styles.vehiclePlate}>{vehicle.plate_number}</Text>
                      </View>
                      
                      {vehicle.additional_info && (
                        <Text style={styles.vehicleAdditionalInfo} numberOfLines={2}>
                          {vehicle.additional_info}
                        </Text>
                      )}
                      
                      <View style={styles.vehicleCardFooter}>
                        <View style={styles.vehicleStatusContainer}>
                          <View style={styles.vehicleStatusDot} />
                          <Text style={styles.vehicleStatusText}>Aktif</Text>
                        </View>
                        {vehicle.is_primary && (
                          <View style={styles.primaryLabel}>
                            <Text style={styles.primaryLabelText}>Ana Araç</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noVehicleContainer}>
                <View style={styles.noVehicleIconContainer}>
                  <Ionicons name="car-outline" size={48} color={colors.text.tertiary} />
                </View>
                <Text style={styles.noVehicleText}>Henüz araç eklenmemiş</Text>
                <Text style={styles.noVehicleSubtext}>
                  Araç bilgilerinizi ekleyerek arkadaşlarınızla paylaşın
                </Text>
                <TouchableOpacity 
                  style={styles.addFirstVehicleButton}
                  onPress={() => openVehicleModal()}
                >
                  <Ionicons name="add-circle" size={20} color={colors.text.light} />
                  <Text style={styles.addFirstVehicleText}>İlk Aracını Ekle</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
            <View style={styles.activityCard}>
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <View key={activity.id || index} style={styles.activityItem}>
                    <Ionicons 
                      name={getActivityIcon(activity.type)} 
                      size={20} 
                      color={getActivityColor(activity.type)} 
                    />
                    <Text style={styles.activityText}>{activity.title}</Text>
                    <Text style={styles.activityTime}>{formatActivityTime(activity.timestamp)}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.noActivityContainer}>
                  <Ionicons name="time-outline" size={24} color={colors.text.tertiary} />
                  <Text style={styles.noActivityText}>Henüz aktivite bulunmuyor</Text>
                </View>
              )}
            </View>
          </View>


          {/* Profile Form - Modern Design */}
          <View style={styles.formContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="person-circle" size={24} color={colors.primary} />
              </View>
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
            </View>
            
            {/* Personal Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Kişisel Bilgiler</Text>
              </View>
              
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="person" size={16} color={colors.text.secondary} />
                    <Text style={styles.label}>Ad</Text>
                  </View>
                  {isEditing ? (
                    <TextInput
                      style={styles.modernInput}
                      value={editData.first_name || ''}
                      onChangeText={(text) => setEditData({...editData, first_name: text})}
                      placeholder="Adınız"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  ) : (
                    <View style={styles.valueContainer}>
                      <Text style={styles.value}>{userInfo.first_name || 'Belirtilmemiş'}</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="person" size={16} color={colors.text.secondary} />
                    <Text style={styles.label}>Soyad</Text>
                  </View>
                  {isEditing ? (
                    <TextInput
                      style={styles.modernInput}
                      value={editData.last_name || ''}
                      onChangeText={(text) => setEditData({...editData, last_name: text})}
                      placeholder="Soyadınız"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  ) : (
                    <View style={styles.valueContainer}>
                      <Text style={styles.value}>{userInfo.last_name || 'Belirtilmemiş'}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Contact Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="mail-outline" size={20} color={colors.secondary} />
                <Text style={styles.cardTitle}>İletişim Bilgileri</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Ionicons name="mail" size={16} color={colors.text.secondary} />
                  <Text style={styles.label}>E-posta</Text>
                </View>
                <View style={styles.valueContainer}>
                  <Text style={styles.value}>{userInfo.email}</Text>
                  {userInfo.email_verified ? (
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} style={styles.verifiedIcon} />
                  ) : (
                    <TouchableOpacity 
                      style={styles.verifyButton}
                      onPress={sendEmailVerification}
                      disabled={isVerifyingEmail}
                    >
                      <Ionicons 
                        name="mail-unread" 
                        size={16} 
                        color={colors.warning} 
                        style={styles.verifyIcon} 
                      />
                      <Text style={styles.verifyText}>
                        {isVerifyingEmail ? 'Gönderiliyor...' : 'Doğrula'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

            </View>

            {/* Personal Details Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                <Text style={styles.cardTitle}>Kişisel Detaylar</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Ionicons name="calendar" size={16} color={colors.text.secondary} />
                  <Text style={styles.label}>Doğum Tarihi</Text>
                </View>
                {isEditing ? (
                  <TextInput
                    style={styles.modernInput}
                    value={editData.birth_date || ''}
                    onChangeText={(text) => setEditData({...editData, birth_date: text})}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.text.tertiary}
                  />
                ) : (
                  <View style={styles.valueContainer}>
                    <Text style={styles.value}>
                      {userInfo.birth_date ? 
                        userInfo.birth_date.split('T')[0].split('-').reverse().join('/') : 
                        'Belirtilmemiş'
                      }
                    </Text>
                    {userInfo.birth_date && (
                      <Text style={styles.ageText}>({calculateAge(userInfo.birth_date)} yaşında)</Text>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Ionicons name="male-female" size={16} color={colors.text.secondary} />
                  <Text style={styles.label}>Cinsiyet</Text>
                </View>
                {isEditing ? (
                  <View style={styles.genderContainer}>
                    {[
                      { value: 'male', label: 'Erkek', icon: 'male' },
                      { value: 'female', label: 'Kadın', icon: 'female' },
                      { value: 'other', label: 'Diğer', icon: 'transgender' }
                    ].map((gender) => (
                      <TouchableOpacity
                        key={gender.value}
                        style={[
                          styles.genderOption,
                          editData.gender === gender.value && styles.genderOptionSelected
                        ]}
                        onPress={() => setEditData({...editData, gender: gender.value})}
                      >
                        <Ionicons 
                          name={gender.icon} 
                          size={18} 
                          color={editData.gender === gender.value ? '#FFFFFF' : colors.text.secondary} 
                        />
                        <Text style={[
                          styles.genderText,
                          editData.gender === gender.value && styles.genderTextSelected
                        ]}>
                          {gender.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.valueContainer}>
                    <Ionicons 
                      name={userInfo.gender === 'male' ? 'male' : userInfo.gender === 'female' ? 'female' : 'transgender'} 
                      size={16} 
                      color={colors.primary} 
                    />
                    <Text style={styles.value}>
                      {userInfo.gender === 'male' ? 'Erkek' : 
                       userInfo.gender === 'female' ? 'Kadın' : 
                       userInfo.gender === 'other' ? 'Diğer' : userInfo.gender || 'Belirtilmemiş'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Sosyal Medya Linkleri */}
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="share-social-outline" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Sosyal Medya</Text>
              </View>
              
              {isEditing ? (
                <>
                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="logo-instagram" size={16} color={colors.text.secondary} />
                      <Text style={styles.label}>Instagram</Text>
                    </View>
                    <TextInput
                      style={styles.modernInput}
                      value={socialMedia.instagram}
                      onChangeText={(text) => setSocialMedia({...socialMedia, instagram: text})}
                      placeholder="@kullanıcıadı veya URL"
                      placeholderTextColor={colors.text.tertiary}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="logo-tiktok" size={16} color={colors.text.secondary} />
                      <Text style={styles.label}>TikTok</Text>
                    </View>
                    <TextInput
                      style={styles.modernInput}
                      value={socialMedia.tiktok}
                      onChangeText={(text) => setSocialMedia({...socialMedia, tiktok: text})}
                      placeholder="@kullanıcıadı"
                      placeholderTextColor={colors.text.tertiary}
                      autoCapitalize="none"
                    />
                  </View>
                </>
              ) : (
                <View style={styles.socialMediaContainer}>
                  {Object.keys(socialMedia).filter(key => socialMedia[key]).length > 0 ? (
                    <View style={styles.socialMediaLinks}>
                      {socialMedia.instagram && (
                        <TouchableOpacity 
                          style={styles.socialMediaLink}
                          onPress={() => {
                            const url = socialMedia.instagram.startsWith('http') 
                              ? socialMedia.instagram 
                              : socialMedia.instagram.startsWith('@')
                              ? `https://instagram.com/${socialMedia.instagram.substring(1)}`
                              : `https://instagram.com/${socialMedia.instagram}`;
                            Linking.openURL(url).catch(err => Alert.alert('Hata', 'Link açılamadı'));
                          }}
                        >
                          <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                          <Text style={styles.socialMediaText} numberOfLines={1}>
                            {socialMedia.instagram}
                          </Text>
                        </TouchableOpacity>
                      )}
                      
                      {socialMedia.tiktok && (
                        <TouchableOpacity 
                          style={styles.socialMediaLink}
                          onPress={() => {
                            const url = socialMedia.tiktok.startsWith('http') 
                              ? socialMedia.tiktok 
                              : socialMedia.tiktok.startsWith('@')
                              ? `https://tiktok.com/@${socialMedia.tiktok.substring(1)}`
                              : `https://tiktok.com/@${socialMedia.tiktok}`;
                            Linking.openURL(url).catch(err => Alert.alert('Hata', 'Link açılamadı'));
                          }}
                        >
                          <Ionicons name="logo-tiktok" size={24} color="#000000" />
                          <Text style={styles.socialMediaText} numberOfLines={1}>
                            {socialMedia.tiktok}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noSocialMediaContainer}>
                      <Ionicons name="share-social-outline" size={32} color={colors.text.tertiary} />
                      <Text style={styles.noSocialMediaText}>Henüz sosyal medya linki eklenmemiş</Text>
                      <Text style={styles.noSocialMediaSubtext}>
                        Düzenle butonuna tıklayarak sosyal medya hesaplarınızı ekleyin
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {isEditing && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={isLoading}
                >
                  <Ionicons name="checkmark" size={20} color={colors.text.light} />
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={isLoading}
                >
                  <Ionicons name="close" size={20} color={colors.text.secondary} />
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.primary} />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>

                <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.actionText, styles.deleteText]}>Hesabı Sil</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
        </SafeAreaView>

        {/* Image Picker Modal */}
        <Modal
          visible={showImagePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowImagePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Profil Fotoğrafı Seç</Text>
              
              <TouchableOpacity style={styles.modalOption} onPress={pickImage}>
                <Ionicons name="image-outline" size={24} color={colors.primary} />
                <Text style={styles.modalOptionText}>Galeriden Seç</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={24} color={colors.primary} />
                <Text style={styles.modalOptionText}>Fotoğraf Çek</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancel} 
                onPress={() => setShowImagePicker(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Image Preview Modal */}
        <Modal
          visible={showImagePreview}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImagePreview(false)}
        >
          <View style={styles.imagePreviewOverlay}>
            <TouchableOpacity 
              style={styles.imagePreviewCloseButton}
              onPress={() => setShowImagePreview(false)}
            >
              <Ionicons name="close" size={30} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Image
              source={{ 
                uri: userInfo.profile_picture || 'https://via.placeholder.com/400x400/cccccc/666666?text=Profil' 
              }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          </View>
        </Modal>

        {/* Email Doğrulama Modal */}
        <Modal
          visible={showVerificationModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowVerificationModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.verificationModalContent}>
              <Text style={styles.verificationModalTitle}>E-posta Doğrulama</Text>
              <Text style={styles.verificationModalSubtitle}>
                {userInfo.email} adresine gönderilen doğrulama kodunu girin
              </Text>
              
              <TextInput
                style={styles.verificationInput}
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="Doğrulama kodu"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={true}
              />
              
              <View style={styles.verificationButtonContainer}>
                <TouchableOpacity
                  style={[styles.verificationButton, styles.cancelVerificationButton]}
                  onPress={() => {
                    setShowVerificationModal(false);
                    setVerificationCode('');
                  }}
                >
                  <Text style={styles.cancelVerificationButtonText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.verificationButton, styles.confirmVerificationButton]}
                  onPress={verifyEmailCode}
                  disabled={isVerifyingEmail || !verificationCode.trim()}
                >
                  <Text style={styles.confirmVerificationButtonText}>
                    {isVerifyingEmail ? 'Doğrulanıyor...' : 'Doğrula'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Arkadaş Listesi Modal */}
        <Modal
          visible={showFriendsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFriendsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.friendsModalContent}>
              <View style={styles.friendsModalHeader}>
                <Text style={styles.friendsModalTitle}>Arkadaşlarım</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowFriendsModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
              
              {isLoadingFriends ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Arkadaşlar yükleniyor...</Text>
                </View>
              ) : friends.length > 0 ? (
                <ScrollView style={styles.friendsList}>
                  {friends.map((friend) => (
                    <View key={friend.id} style={styles.friendItem}>
                      <TouchableOpacity
                        style={styles.friendItemContent}
                        onPress={() => loadFriendDetail(friend)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={{ 
                            uri: friend.profile_picture || 'https://via.placeholder.com/50x50/cccccc/666666?text=Profil' 
                          }}
                          style={styles.friendAvatar}
                        />
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>{friend.name}</Text>
                          <Text style={styles.friendEmail}>{friend.email}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeFriendButton}
                        onPress={() => removeFriend(friend.id, friend.name)}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.warning} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noFriendsContainer}>
                  <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
                  <Text style={styles.noFriendsText}>Henüz arkadaşınız yok</Text>
                  <Text style={styles.noFriendsSubtext}>Yeni arkadaşlar ekleyerek sosyal ağınızı genişletin</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Arkadaş Detay Modal */}
        <Modal
          visible={showFriendDetailModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowFriendDetailModal(false);
            setSelectedFriendDetail(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.friendDetailModalContent}>
              <View style={styles.friendDetailModalHeader}>
                <Text style={styles.friendDetailModalTitle}>Arkadaş Detayları</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setShowFriendDetailModal(false);
                    setSelectedFriendDetail(null);
                  }}
                >
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
              
              {isLoadingFriendDetail ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Yükleniyor...</Text>
                </View>
              ) : selectedFriendDetail ? (
                <ScrollView style={styles.friendDetailContent}>
                  {/* Kullanıcı İsmi */}
                  <View style={styles.friendDetailSection}>
                    <View style={styles.friendDetailInfoRow}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                      <Text style={styles.friendDetailLabel}>İsim:</Text>
                      <Text style={styles.friendDetailValue}>
                        {selectedFriendDetail.first_name} {selectedFriendDetail.last_name}
                      </Text>
                    </View>
                  </View>

                  {/* Yaş */}
                  {selectedFriendDetail.birth_date && (
                    <View style={styles.friendDetailSection}>
                      <View style={styles.friendDetailInfoRow}>
                        <Ionicons name="calendar" size={20} color={colors.primary} />
                        <Text style={styles.friendDetailLabel}>Yaş:</Text>
                        <Text style={styles.friendDetailValue}>
                          {calculateAge(selectedFriendDetail.birth_date)} yaşında
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Durum */}
                  <View style={styles.friendDetailSection}>
                    <View style={styles.friendDetailInfoRow}>
                      <Ionicons name="information-circle" size={20} color={colors.primary} />
                      <Text style={styles.friendDetailLabel}>Durum:</Text>
                      <Text style={styles.friendDetailValue}>
                        {selectedFriendDetail.is_active ? 'Aktif' : 'Pasif'}
                      </Text>
                    </View>
                  </View>

                  {/* Araç Fotoğrafı */}
                  {selectedFriendDetail.vehicles && selectedFriendDetail.vehicles.length > 0 && (
                    <View style={styles.friendDetailSection}>
                      <Text style={styles.friendDetailSectionTitle}>Araç Fotoğrafları</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehiclePhotosContainer}>
                        {selectedFriendDetail.vehicles.map((vehicle) => (
                          vehicle.photo_url ? (
                            <View key={vehicle.id} style={styles.vehiclePhotoItem}>
                              <Image
                                source={{ uri: apiService.getFullImageUrl(vehicle.photo_url) }}
                                style={styles.vehiclePhotoImage}
                                resizeMode="cover"
                              />
                            </View>
                          ) : null
                        ))}
                      </ScrollView>
                      {selectedFriendDetail.vehicles.filter(v => v.photo_url).length === 0 && (
                        <Text style={styles.noVehiclePhotoText}>Araç fotoğrafı bulunmuyor</Text>
                      )}
                    </View>
                  )}

                  {(!selectedFriendDetail.vehicles || selectedFriendDetail.vehicles.length === 0) && (
                    <View style={styles.friendDetailSection}>
                      <Text style={styles.noVehicleText}>Araç bilgisi bulunmuyor</Text>
                    </View>
                  )}
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>

        {/* Araç Modal */}
        <Modal
          visible={showVehicleModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowVehicleModal(false);
            setSelectedVehicle(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.vehicleModalContent}>
              <View style={styles.vehicleModalHeader}>
                <Text style={styles.vehicleModalTitle}>
                  {selectedVehicle ? 'Araç Düzenle' : 'Yeni Araç Ekle'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setShowVehicleModal(false);
                    setSelectedVehicle(null);
                  }}
                >
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.vehicleForm}>
                {/* Araç Fotoğrafı */}
                <View style={styles.vehiclePhotoSection}>
                  <Text style={styles.inputLabel}>Araç Fotoğrafı</Text>
                  <TouchableOpacity 
                    style={styles.vehiclePhotoContainer}
                    onPress={() => handleVehiclePhotoPicker()}
                  >
                    {vehicleFormData.photo ? (
                      <Image
                        source={{ uri: vehicleFormData.photo }}
                        style={styles.vehiclePhotoPreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.vehiclePhotoPlaceholder}>
                        <Ionicons name="camera" size={32} color={colors.text.tertiary} />
                        <Text style={styles.vehiclePhotoText}>Fotoğraf Ekle</Text>
                      </View>
                    )}
                    <View style={styles.vehiclePhotoOverlay}>
                      <Ionicons name="camera" size={20} color={colors.text.light} />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Plaka *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="34 ABC 123"
                    value={vehicleFormData.plate_number}
                    onChangeText={(text) => setVehicleFormData(prev => ({...prev, plate_number: text}))}
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
                
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.inputLabel}>Marka *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="BMW"
                      value={vehicleFormData.brand}
                      onChangeText={(text) => setVehicleFormData(prev => ({...prev, brand: text}))}
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>
                  
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.inputLabel}>Model *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="3.20i"
                      value={vehicleFormData.model}
                      onChangeText={(text) => setVehicleFormData(prev => ({...prev, model: text}))}
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ek Bilgiler</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Renk, yıl, özel özellikler..."
                    value={vehicleFormData.additional_info}
                    onChangeText={(text) => setVehicleFormData(prev => ({...prev, additional_info: text}))}
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                <View style={styles.vehicleActions}>
                  <TouchableOpacity
                    style={[styles.saveButton, isSavingVehicle && styles.saveButtonDisabled]}
                    onPress={saveVehicle}
                    disabled={isSavingVehicle}
                  >
                    {isSavingVehicle ? (
                      <ActivityIndicator size="small" color={colors.text.light} />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {selectedVehicle ? 'Güncelle' : 'Kaydet'}
                      </Text>
                    )}
                  </TouchableOpacity>
                  
                  {selectedVehicle && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        Alert.alert(
                          'Araç Sil',
                          'Bu aracı silmek istediğinizden emin misiniz?',
                          [
                            { text: 'İptal', style: 'cancel' },
                            { 
                              text: 'Sil', 
                              style: 'destructive',
                              onPress: () => {
                                // Araç silme işlemi
                                setShowVehicleModal(false);
                                setSelectedVehicle(null);
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.warning} />
                      <Text style={styles.deleteButtonText}>Sil</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Notification Toast */}
        {showNotification && (
          <View style={styles.notificationContainer}>
            <View style={styles.notificationContent}>
              <Ionicons name="notifications" size={20} color="#FFFFFF" />
              <Text style={styles.notificationText}>{notificationMessage}</Text>
            </View>
          </View>
        )}
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
    paddingTop: isAndroid ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    paddingBottom: bottomSafeArea + scale(90), // Alt navbar için boşluk
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
  },
  header: {
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(30),
    paddingTop: isAndroid ? verticalScale(20) : verticalScale(40),
    borderBottomLeftRadius: scale(25),
    borderBottomRightRadius: scale(25),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(20),
    backgroundColor: colors.surface,
    marginHorizontal: getResponsivePadding(20),
    marginTop: verticalScale(-20),
    borderRadius: scale(20),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border.light + '20',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: scaleFont(isTablet ? 24 : 20),
    fontWeight: '800',
    color: colors.text.primary,
    marginTop: verticalScale(5),
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
    marginTop: verticalScale(2),
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: getResponsivePadding(20),
    marginTop: verticalScale(30),
  },
  sectionTitle: {
    fontSize: scaleFont(isTablet ? 24 : 20),
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: verticalScale(15),
    letterSpacing: 0.3,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    padding: getResponsivePadding(20),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border.light + '20',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  activityText: {
    flex: 1,
    fontSize: scaleFont(14),
    color: colors.text.primary,
    marginLeft: scale(15),
  },
  activityTime: {
    fontSize: scaleFont(12),
    color: colors.text.tertiary,
  },
  editButton: {
    padding: scale(10),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingsButton: {
    padding: scale(10),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileImageContainer: {
    alignItems: 'center',
  },
  profileImage: {
    width: scale(isTablet ? 120 : 100),
    height: scale(isTablet ? 120 : 100),
    borderRadius: scale(isTablet ? 60 : 50),
    borderWidth: scale(4),
    borderColor: '#FFFFFF',
  },
  userInfo: {
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(20),
    marginTop: verticalScale(20),
  },
  userName: {
    fontSize: scaleFont(isTablet ? 28 : 24),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: verticalScale(5),
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userAge: {
    fontSize: scaleFont(16),
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: verticalScale(5),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  userEmail: {
    fontSize: scaleFont(14),
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  formContainer: {
    marginHorizontal: getResponsivePadding(20),
    marginTop: verticalScale(30),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    paddingHorizontal: getResponsivePadding(5),
  },
  sectionIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    padding: getResponsivePadding(20),
    marginBottom: verticalScale(16),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border.light + '20',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light + '30',
  },
  cardTitle: {
    fontSize: scaleFont(16),
    fontWeight: '800',
    color: colors.text.primary,
    marginLeft: scale(8),
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  halfWidth: {
    width: '48%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  label: {
    fontSize: scaleFont(13),
    fontWeight: '700',
    color: colors.text.secondary,
    marginLeft: scale(6),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modernInput: {
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: scale(16),
    paddingHorizontal: getResponsivePadding(16),
    paddingVertical: verticalScale(16),
    fontSize: scaleFont(15),
    backgroundColor: colors.background,
    color: colors.text.primary,
    fontFamily: 'System',
    fontWeight: '500',
    letterSpacing: 0.2,
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: getResponsivePadding(4),
  },
  value: {
    fontSize: scaleFont(15),
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.2,
  },
  verifiedIcon: {
    marginLeft: scale(8),
  },
  ageText: {
    fontSize: scaleFont(13),
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginLeft: scale(8),
  },
  buttonContainer: {
    marginTop: verticalScale(24),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    flex: 1,
    marginHorizontal: scale(4),
  },
  saveButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border.light,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(15),
    fontWeight: '700',
    marginLeft: scale(8),
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: scaleFont(15),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  actionsContainer: {
    paddingHorizontal: getResponsivePadding(20),
    paddingBottom: verticalScale(20),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: getResponsivePadding(15),
    borderRadius: scale(8),
    marginBottom: verticalScale(10),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutButton: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  actionText: {
    marginLeft: scale(8),
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.primary,
  },
  logoutText: {
    marginLeft: scale(8),
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#FF6B6B',
  },
  deleteText: {
    color: '#FF4444',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(15),
    borderRadius: scale(15),
    marginBottom: verticalScale(10),
    shadowColor: colors.shadow.light,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  menuIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(15),
  },
  menuTitle: {
    flex: 1,
    fontSize: scaleFont(16),
    color: colors.text.primary,
  },
  // Profil fotoğrafı stilleri
  imageEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: scale(15),
    width: scale(30),
    height: scale(30),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: scale(isTablet ? 60 : 50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Cinsiyet seçimi stilleri
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(8),
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: getResponsivePadding(12),
    marginHorizontal: scale(4),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: colors.border.light,
    backgroundColor: colors.background,
  },
  genderOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  genderText: {
    fontSize: scaleFont(13),
    color: colors.text.secondary,
    fontWeight: '600',
    marginLeft: scale(6),
  },
  genderTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Modal stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    padding: getResponsivePadding(25),
    width: screenWidth * 0.8,
    maxWidth: scale(300),
  },
  modalTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: verticalScale(20),
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(15),
    paddingHorizontal: getResponsivePadding(20),
    borderRadius: scale(12),
    backgroundColor: colors.background,
    marginBottom: verticalScale(10),
  },
  modalOptionText: {
    fontSize: scaleFont(16),
    color: colors.text.primary,
    marginLeft: scale(15),
    fontWeight: '500',
  },
  modalCancel: {
    paddingVertical: verticalScale(15),
    alignItems: 'center',
    marginTop: verticalScale(10),
  },
  modalCancelText: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
    fontWeight: '500',
  },
  // Image Preview Modal stilleri
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewCloseButton: {
    position: 'absolute',
    top: isAndroid ? StatusBar.currentHeight + scale(20) : scale(50),
    right: scale(20),
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: scale(20),
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
    maxWidth: scale(400),
    maxHeight: scale(600),
  },
  // Aktivite stilleri
  noActivityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(20),
  },
  noActivityText: {
    fontSize: scaleFont(14),
    color: colors.text.tertiary,
    marginLeft: scale(10),
    fontStyle: 'italic',
  },
  // Bildirim stilleri
  notificationContainer: {
    position: 'absolute',
    top: isAndroid ? StatusBar.currentHeight + scale(20) : scale(60),
    left: scale(20),
    right: scale(20),
    zIndex: 1000,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: getResponsivePadding(15),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: scaleFont(14),
    fontWeight: '500',
    marginLeft: scale(10),
    flex: 1,
  },
  // Doğrulama butonları
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  verifyIcon: {
    marginRight: scale(4),
  },
  verifyText: {
    fontSize: scaleFont(12),
    color: colors.warning,
    fontWeight: '600',
  },
  // Doğrulama modal stilleri
  verificationModalContent: {
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    padding: getResponsivePadding(25),
    width: screenWidth * 0.9,
    maxWidth: scale(350),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  verificationModalTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: verticalScale(10),
  },
  verificationModalSubtitle: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: verticalScale(20),
    lineHeight: scaleFont(20),
  },
  verificationInput: {
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: scale(12),
    paddingHorizontal: getResponsivePadding(16),
    paddingVertical: verticalScale(14),
    fontSize: scaleFont(18),
    textAlign: 'center',
    backgroundColor: colors.background,
    color: colors.text.primary,
    marginBottom: verticalScale(20),
    letterSpacing: scale(2),
  },
  verificationButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verificationButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    marginHorizontal: scale(4),
  },
  cancelVerificationButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  confirmVerificationButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelVerificationButtonText: {
    color: colors.text.secondary,
    fontSize: scaleFont(15),
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmVerificationButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(15),
    fontWeight: '700',
    textAlign: 'center',
  },
  // Arkadaş listesi modal stilleri
  friendsModalContent: {
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    padding: getResponsivePadding(20),
    width: screenWidth * 0.95,
    maxHeight: screenHeight * 0.8,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  friendsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    paddingBottom: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light + '30',
  },
  friendsModalTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  closeButton: {
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: colors.background,
  },
  friendsList: {
    maxHeight: screenHeight * 0.6,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: getResponsivePadding(15),
    backgroundColor: colors.background,
    borderRadius: scale(12),
    marginBottom: verticalScale(8),
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  friendAvatar: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    marginRight: scale(15),
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(2),
  },
  friendEmail: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
  },
  removeFriendButton: {
    padding: scale(8),
    borderRadius: scale(8),
    backgroundColor: colors.warning + '20',
  },
  noFriendsContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  noFriendsText: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: verticalScale(15),
    marginBottom: verticalScale(8),
  },
  noFriendsSubtext: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: scaleFont(20),
  },
  
  // Araç Bölümü Stilleri - Modern Tasarım
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(20),
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(15),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionSubtitle: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
    marginTop: verticalScale(2),
    fontWeight: '500',
  },
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: getResponsivePadding(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  addVehicleText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: colors.primary,
    marginLeft: scale(4),
  },
  // Tam Dikdörtgen Araç Kartı Tasarımı
  vehicleScrollContainer: {
    marginHorizontal: -getResponsivePadding(10),
  },
  vehicleScrollContent: {
    paddingLeft: getResponsivePadding(20),
    paddingRight: getResponsivePadding(20),
    paddingVertical: verticalScale(5),
  },
  vehicleCard: {
    width: scale(340),
    backgroundColor: colors.surface,
    borderRadius: scale(12),
    marginRight: scale(12),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border.light + '20',
    overflow: 'hidden',
    flexShrink: 0,
  },
  lastVehicleCard: {
    marginRight: scale(20),
  },
  vehicleImageContainer: {
    width: '100%',
    height: verticalScale(200),
    backgroundColor: colors.background.secondary,
    overflow: 'hidden',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  vehicleImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  primaryVehicleBadge: {
    position: 'absolute',
    top: scale(10),
    right: scale(10),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleCardContent: {
    padding: getResponsivePadding(12),
    flex: 1,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(6),
  },
  vehicleBrandModel: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  vehicleEditButton: {
    padding: scale(4),
    borderRadius: scale(6),
    backgroundColor: colors.background.secondary,
  },
  vehiclePlateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  vehiclePlate: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    color: colors.primary,
    marginLeft: scale(4),
    letterSpacing: 0.5,
  },
  vehicleAdditionalInfo: {
    fontSize: scaleFont(10),
    color: colors.text.secondary,
    lineHeight: scaleFont(14),
    marginBottom: verticalScale(8),
  },
  vehicleCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleStatusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: colors.success,
    marginRight: scale(4),
  },
  vehicleStatusText: {
    fontSize: scaleFont(10),
    fontWeight: '600',
    color: colors.success,
  },
  primaryLabel: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
  },
  primaryLabelText: {
    fontSize: scaleFont(9),
    fontWeight: '700',
    color: colors.primary,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleBrandModel: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(2),
  },
  vehiclePlate: {
    fontSize: scaleFont(14),
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  primaryBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
    marginTop: verticalScale(4),
    alignSelf: 'flex-start',
  },
  primaryText: {
    fontSize: scaleFont(10),
    fontWeight: '700',
    color: colors.text.light,
  },
  vehicleActionButton: {
    padding: scale(8),
    borderRadius: scale(8),
    backgroundColor: colors.surface,
  },
  vehicleAdditionalInfo: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
    marginTop: verticalScale(8),
    fontStyle: 'italic',
  },
  // Yükleme Durumu
  vehicleLoadingContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    marginHorizontal: getResponsivePadding(20),
  },
  vehicleLoadingText: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    marginTop: verticalScale(10),
    fontWeight: '500',
  },
  
  // Boş Durum
  noVehicleContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    marginHorizontal: getResponsivePadding(20),
    borderWidth: 2,
    borderColor: colors.border.light + '30',
    borderStyle: 'dashed',
  },
  noVehicleIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  noVehicleText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  noVehicleSubtext: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: scaleFont(20),
    marginBottom: verticalScale(20),
    paddingHorizontal: getResponsivePadding(20),
  },
  addFirstVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addFirstVehicleText: {
    fontSize: scaleFont(14),
    fontWeight: '700',
    color: colors.text.light,
    marginLeft: scale(6),
  },
  
  // Araç Modal Stilleri
  vehicleModalContent: {
    backgroundColor: colors.background,
    borderRadius: scale(20),
    margin: getResponsivePadding(20),
    maxHeight: '80%',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  vehicleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  vehicleModalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: colors.text.primary,
  },
  vehicleForm: {
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(15),
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(8),
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: scale(12),
    paddingHorizontal: getResponsivePadding(15),
    paddingVertical: verticalScale(12),
    fontSize: scaleFont(16),
    backgroundColor: colors.surface,
    color: colors.text.primary,
    marginBottom: verticalScale(15),
  },
  textArea: {
    height: verticalScale(80),
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  vehicleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(20),
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    alignItems: 'center',
    marginRight: scale(10),
  },
  saveButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.light,
  },
  saveButtonDisabled: {
    backgroundColor: colors.text.tertiary,
    opacity: 0.6,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: getResponsivePadding(15),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
  },
  deleteButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: colors.warning,
    marginLeft: scale(5),
  },
  
  // Araç Fotoğrafı Stilleri
  vehiclePhotoSection: {
    marginBottom: verticalScale(20),
  },
  vehiclePhotoContainer: {
    position: 'relative',
    height: verticalScale(120),
    borderRadius: scale(15),
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  vehiclePhotoPreview: {
    width: '100%',
    height: '100%',
  },
  vehiclePhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehiclePhotoText: {
    fontSize: scaleFont(14),
    color: colors.text.tertiary,
    marginTop: verticalScale(8),
    fontWeight: '500',
  },
  vehiclePhotoOverlay: {
    position: 'absolute',
    bottom: scale(8),
    right: scale(8),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // Arkadaş detay modal stilleri
  friendItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendDetailModalContent: {
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    padding: getResponsivePadding(20),
    width: screenWidth * 0.95,
    maxHeight: screenHeight * 0.85,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  friendDetailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    paddingBottom: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light + '30',
  },
  friendDetailModalTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  friendDetailContent: {
    maxHeight: screenHeight * 0.65,
  },
  friendDetailSection: {
    marginBottom: verticalScale(20),
    paddingBottom: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light + '20',
  },
  friendDetailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  friendDetailLabel: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.secondary,
    marginLeft: scale(10),
    marginRight: scale(8),
    minWidth: scale(60),
  },
  friendDetailValue: {
    fontSize: scaleFont(16),
    fontWeight: '500',
    color: colors.text.primary,
    flex: 1,
  },
  friendDetailSectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: verticalScale(15),
  },
  vehiclePhotosContainer: {
    marginTop: verticalScale(10),
  },
  vehiclePhotoItem: {
    marginRight: scale(15),
    alignItems: 'center',
    width: scale(200),
  },
  vehiclePhotoImage: {
    width: scale(200),
    height: verticalScale(150),
    borderRadius: scale(12),
    backgroundColor: colors.background,
  },
  vehiclePhotoLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: verticalScale(8),
    textAlign: 'center',
  },
  vehiclePhotoPlate: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    color: colors.primary,
    marginTop: verticalScale(4),
    letterSpacing: 1,
  },
  noVehiclePhotoText: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: verticalScale(10),
  },
  noVehicleText: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  socialMediaContainer: {
    marginTop: verticalScale(10),
  },
  socialMediaLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  socialMediaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: colors.border.light + '30',
    flex: 1,
    minWidth: '48%',
  },
  socialMediaText: {
    fontSize: scaleFont(14),
    color: colors.text.primary,
    marginLeft: scale(8),
    flex: 1,
  },
  noSocialMediaContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(30),
    paddingHorizontal: scale(20),
  },
  noSocialMediaText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: verticalScale(12),
    textAlign: 'center',
  },
  noSocialMediaSubtext: {
    fontSize: scaleFont(14),
    color: colors.text.tertiary,
    marginTop: verticalScale(8),
    textAlign: 'center',
  },
});