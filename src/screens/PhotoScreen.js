import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { 
  scale, 
  verticalScale, 
  moderateScale, 
  scaleFont, 
  getResponsivePadding, 
  getResponsiveFontSize,
  isIOS,
  isAndroid,
  isTablet,
  isSmallScreen,
  isLargeScreen,
  getStatusBarHeight,
  getBottomSafeArea,
  getMinTouchTarget,
  getPlatformShadow,
  getGridColumns
} from '../utils/responsive';
import { colors } from '../constants/colors';
import apiService from '../services/api';
import socketService from '../services/socketService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PhotoScreen() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  // Component mount olduğunda fotoğrafları yükle
  useEffect(() => {
    loadPhotos();
    setupSocketListeners();
    loadCurrentUser();
    
    return () => {
      // Cleanup socket listeners
      socketService.off('new_photo', handleNewPhoto);
      socketService.off('photo_like_updated', handlePhotoLikeUpdated);
    };
  }, []);

  // Tab değiştiğinde fotoğrafları yeniden yükle - artık sadece feed var
  useEffect(() => {
    loadPhotos();
  }, []);

  // Socket event listeners
  const setupSocketListeners = () => {
    socketService.on('new_photo', handleNewPhoto);
    socketService.on('photo_like_updated', handlePhotoLikeUpdated);
  };

  // Yeni fotoğraf geldiğinde
  const handleNewPhoto = (data) => {
    console.log('New photo received:', data);
    // Yeni fotoğrafı yükle
    loadPhotos();
  };

  // Fotoğraf beğenisi güncellendiğinde
  const handlePhotoLikeUpdated = (data) => {
    console.log('Photo like updated:', data);
    setPhotos(prevPhotos => 
      prevPhotos.map(photo => 
        photo.id === data.photoId 
          ? { ...photo, likes: data.liked ? photo.likes + 1 : Math.max(0, photo.likes - 1) }
          : photo
      )
    );
  };

  // Fotoğrafları yükle
  const loadPhotos = async () => {
    try {
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        console.log('Token bulunamadı, fotoğraflar yüklenemiyor');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      
      setLoading(true);
      const endpoint = '/photos/feed';
      const response = await apiService.get(endpoint);
      
      if (response.success) {
        setPhotos(response.data.photos || []);
      } else {
        Alert.alert('Hata', 'Fotoğraflar yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Load photos error:', error);
      Alert.alert('Hata', 'Fotoğraflar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPhotos();
    setRefreshing(false);
  };

  // Mevcut kullanıcı bilgisini yükle
  const loadCurrentUser = async () => {
    try {
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        console.log('Token bulunamadı, kullanıcı bilgisi yüklenemiyor');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      
      const response = await apiService.getProfile();
      if (response.success) {
        setCurrentUserId(response.data.user.id);
        console.log('Current user ID loaded:', response.data.user.id);
      }
    } catch (error) {
      console.error('Load current user error:', error);
      // Fallback olarak token'dan user ID'yi al
      try {
        const token = await apiService.getStoredToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUserId(payload.userId);
          console.log('Current user ID from token:', payload.userId);
        }
      } catch (tokenError) {
        console.error('Token parse error:', tokenError);
      }
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri iznine ihtiyacımız var.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });

    if (!result.canceled) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera iznine ihtiyacımız var.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });

    if (!result.canceled) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  // Fotoğraf yükleme fonksiyonu
  const uploadPhoto = async (uri) => {
    try {
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      
      setUploading(true);
      
      const formData = new FormData();
      formData.append('photo', {
        uri: uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });
      formData.append('caption', '');

      const response = await apiService.post('/photos/upload', formData);

      if (response.success) {
        // Socket ile yeni fotoğrafı bildir
        socketService.emit('photo_shared', {
          photoId: response.data.photo.id,
          timestamp: new Date().toISOString()
        });
        
        // Fotoğraf yükleme için aktivite oluştur
        socketService.createActivity(
          'photo',
          'Fotoğraf paylaşıldı',
          'Yeni fotoğraf paylaştınız',
          { 
            photoId: response.data.photo.id,
            hasCaption: false,
            captionLength: 0
          }
        );
        
        // Fotoğrafları yeniden yükle
        await loadPhotos();
        
        Alert.alert('Başarılı', 'Fotoğraf başarıyla yüklendi');
      } else {
        Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Upload photo error:', error);
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  // Fotoğraf beğenme fonksiyonu
  const likePhoto = async (photoId) => {
    try {
      // Token'ı kontrol et
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      
      const response = await apiService.post(`/photos/${photoId}/like`);
      
      if (response.success) {
        // Socket ile beğeniyi bildir
        socketService.emit('photo_liked', {
          photoId: photoId,
          liked: response.liked,
          timestamp: new Date().toISOString()
        });
        
        // Fotoğraf beğenme için aktivite oluştur
        if (response.liked) {
          socketService.createActivity(
            'like',
            'Fotoğraf beğenildi',
            'Bir fotoğrafı beğendiniz',
            { photoId: photoId, action: 'liked' }
          );
        }
        
        // Local state'i güncelle
        setPhotos(prevPhotos => 
          prevPhotos.map(photo => 
            photo.id === photoId 
              ? { 
                  ...photo, 
                  likes: response.liked ? photo.likes + 1 : Math.max(0, photo.likes - 1),
                  isLiked: response.liked
                }
              : photo
          )
        );
      }
    } catch (error) {
      console.error('Like photo error:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Fotoğraf Ekle',
      'Nasıl fotoğraf eklemek istiyorsunuz?',
      [
        { text: 'Kameradan Çek', onPress: takePhoto },
        { text: 'Galeriden Seç', onPress: pickImage },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  };

  const openPhotoModal = (photo) => {
    console.log('Modal açılıyor:', photo);
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhoto(null);
    setShowComments(false);
    setComments([]);
    setNewComment('');
  };

  const addComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: Date.now(),
        user: 'Sen', // Gerçek uygulamada current user name
        text: newComment.trim(),
        time: 'Şimdi',
        avatar: '👤'
      };
      setComments(prev => [...prev, comment]);
      setNewComment('');
    }
  };

  const toggleComments = () => {
    console.log('toggleComments çağrıldı, mevcut showComments:', showComments);
    setShowComments(!showComments);
    if (!showComments && comments.length === 0) {
      console.log('Mock yorumlar ekleniyor...');
      // Mock yorumlar ekle
      setComments([
        {
          id: 1,
          user: 'Ahmet Yılmaz',
          text: 'Harika bir fotoğraf! 📸',
          time: '2 saat önce',
          avatar: '👤'
        },
        {
          id: 2,
          user: 'Ayşe Demir',
          text: 'Çok güzel bir manzara 😍',
          time: '1 saat önce',
          avatar: '👤'
        },
        {
          id: 3,
          user: 'Mehmet Kaya',
          text: 'Nerede çekildi bu?',
          time: '30 dk önce',
          avatar: '👤'
        }
      ]);
    }
  };




  const deletePhoto = async (photo) => {
    Alert.alert(
      'Fotoğrafı Sil',
      'Bu fotoğrafı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Token'ı kontrol et
              const token = await apiService.getStoredToken();
              if (!token) {
                Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
                return;
              }
              
              // Token'ı API servisine set et
              apiService.setToken(token);
              
              const response = await apiService.delete(`/photos/${photo.id}`);
              if (response.success) {
                Alert.alert('Başarılı', 'Fotoğraf silindi');
                await loadPhotos(); // Fotoğrafları yeniden yükle
              } else {
                Alert.alert('Hata', 'Fotoğraf silinirken bir hata oluştu');
              }
            } catch (error) {
              console.error('Delete photo error:', error);
              Alert.alert('Hata', 'Fotoğraf silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  const renderPhoto = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.photoCard}
        onPress={() => openPhotoModal(item)}
        activeOpacity={0.9}
      >
        <Image source={{ uri: item.uri }} style={styles.photo} />
        <View style={styles.photoOverlay}>
          <View style={styles.photoHeader}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                {item.profile_picture ? (
                  <Image source={{ uri: item.profile_picture }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={scale(16)} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{item.user}</Text>
                <Text style={styles.photoTime}>{item.time}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.photoFooter}>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={scale(14)} color="#FFFFFF" />
              <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
            </View>
            
            <View style={styles.actions}>
              <TouchableOpacity 
                style={[styles.actionButton, item.isLiked && styles.likedButton]}
                onPress={() => likePhoto(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={item.isLiked ? "heart" : "heart-outline"} 
                  size={scale(18)} 
                  color={item.isLiked ? "#FF6B6B" : "#FFFFFF"} 
                />
                <Text style={[styles.actionText, item.isLiked && styles.likedText]}>
                  {item.likes || 0}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={scale(18)} color="#FFFFFF" />
                <Text style={styles.actionText}>{item.comments || 0}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                <Ionicons name="share-outline" size={scale(18)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={isIOS ? "light-content" : "light-content"}
        backgroundColor={isAndroid ? colors.primary : "transparent"}
        translucent={isAndroid}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient
          colors={colors.gradients.redBlack}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Fotoğraflar</Text>
        </LinearGradient>


        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fotoğraflar yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderPhoto}
            keyExtractor={item => item.id.toString()}
            numColumns={1}
            contentContainerStyle={styles.photosGrid}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
                title="Yenileniyor..."
                titleColor={colors.text.secondary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="camera-outline" size={scale(80)} color={colors.text.secondary} />
                </View>
                <Text style={styles.emptyText}>
                  Henüz fotoğraf paylaşılmamış
                </Text>
                <Text style={styles.emptySubText}>
                  İlk fotoğrafı siz paylaşarak başlayın! 📸
                </Text>
                <TouchableOpacity 
                  style={styles.emptyActionButton}
                  onPress={showImageOptions}
                >
                  <Ionicons name="camera" size={scale(20)} color="#FFFFFF" />
                  <Text style={styles.emptyActionText}>Fotoğraf Paylaş</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* Floating Action Button */}
        <TouchableOpacity 
          style={[styles.fab, uploading && styles.fabDisabled]} 
          onPress={showImageOptions}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="camera" size={scale(24)} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        {/* Photo Modal */}
        {showPhotoModal && selectedPhoto && (
          <View style={styles.photoModalOverlay}>
            {console.log('Modal render ediliyor, selectedPhoto:', selectedPhoto)}
            <TouchableOpacity 
              style={styles.photoModalCloseButton}
              onPress={closePhotoModal}
            >
              <Ionicons name="close" size={scale(30)} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Image
              source={{ uri: selectedPhoto.uri }}
              style={styles.photoModalImage}
              resizeMode="contain"
            />
            
            <View style={styles.photoModalInfo}>
              <View style={styles.photoModalUserInfo}>
                <View style={styles.photoModalAvatar}>
                  {selectedPhoto.profile_picture ? (
                    <Image source={{ uri: selectedPhoto.profile_picture }} style={styles.photoModalAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={scale(20)} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.photoModalUserDetails}>
                  <Text style={styles.photoModalUserName}>{selectedPhoto.user}</Text>
                  <Text style={styles.photoModalTime}>{selectedPhoto.time}</Text>
                </View>
              </View>
              
              <View style={styles.photoModalActions}>
                {console.log('Actions render ediliyor, showComments:', showComments)}
                <TouchableOpacity 
                  style={[styles.photoModalActionButton, selectedPhoto.isLiked && styles.photoModalLikedButton]}
                  onPress={() => likePhoto(selectedPhoto.id)}
                >
                  <Ionicons 
                    name={selectedPhoto.isLiked ? "heart" : "heart-outline"} 
                    size={scale(20)} 
                    color={selectedPhoto.isLiked ? "#FF6B6B" : "#FFFFFF"} 
                  />
                  <Text style={[styles.photoModalActionText, selectedPhoto.isLiked && styles.photoModalLikedText]}>
                    {selectedPhoto.likes || 0}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.photoModalActionButton,
                    showComments && styles.photoModalCommentButtonActive
                  ]}
                  onPress={() => {
                    console.log('Yorum butonuna tıklandı');
                    toggleComments();
                  }}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name={showComments ? "chatbubble" : "chatbubble-outline"} 
                    size={scale(20)} 
                    color={showComments ? "#4ECDC4" : "#FFFFFF"} 
                  />
                  <Text style={[
                    styles.photoModalActionText,
                    showComments && styles.photoModalCommentTextActive
                  ]}>
                    {comments.length || 0}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.photoModalActionButton}>
                  <Ionicons name="share-outline" size={scale(20)} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Yorumlar Bölümü */}
            {showComments && (
              <View style={styles.photoModalComments}>
                <View style={styles.photoModalCommentsHeader}>
                  <Text style={styles.photoModalCommentsTitle}>
                    Yorumlar ({comments.length})
                  </Text>
                  <TouchableOpacity onPress={toggleComments}>
                    <Ionicons name="close" size={scale(20)} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.photoModalCommentsList}>
                  {comments.map((comment) => (
                    <View key={comment.id} style={styles.photoModalCommentItem}>
                      <View style={styles.photoModalCommentAvatar}>
                        <Text style={styles.photoModalCommentAvatarText}>{comment.avatar}</Text>
                      </View>
                      <View style={styles.photoModalCommentContent}>
                        <View style={styles.photoModalCommentHeader}>
                          <Text style={styles.photoModalCommentUser}>{comment.user}</Text>
                          <Text style={styles.photoModalCommentTime}>{comment.time}</Text>
                        </View>
                        <Text style={styles.photoModalCommentText}>{comment.text}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                
                <View style={styles.photoModalCommentInput}>
                  <TextInput
                    style={styles.photoModalCommentTextInput}
                    placeholder="Yorum yazın..."
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={200}
                  />
                  <TouchableOpacity 
                    style={[
                      styles.photoModalCommentSendButton,
                      !newComment.trim() && styles.photoModalCommentSendButtonDisabled
                    ]}
                    onPress={addComment}
                    disabled={!newComment.trim()}
                  >
                    <Ionicons 
                      name="send" 
                      size={scale(18)} 
                      color={newComment.trim() ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)"} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: isAndroid ? getStatusBarHeight() : 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(isIOS ? 20 : 16),
    paddingTop: isAndroid ? verticalScale(10) : verticalScale(20),
    borderBottomLeftRadius: scale(25),
    borderBottomRightRadius: scale(25),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '800',
    color: colors.text.light,
    fontFamily: isIOS ? 'System' : 'Roboto',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  photosGrid: {
    padding: scale(12),
    paddingBottom: getBottomSafeArea() + verticalScale(120),
  },
  photoCard: {
    width: '100%',
    marginHorizontal: scale(12),
    marginVertical: scale(8),
    borderRadius: scale(24),
    overflow: 'hidden',
    backgroundColor: colors.surface,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: colors.border.light + '30',
  },
  photo: {
    width: '100%',
    height: verticalScale(isTablet ? 280 : 220),
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
    padding: scale(16),
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: scale(isTablet ? 48 : 40),
    height: scale(isTablet ? 48 : 40),
    borderRadius: scale(isTablet ? 24 : 20),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    ...getPlatformShadow(4),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: isIOS ? 'System' : 'Roboto',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.4,
    marginBottom: scale(2),
  },
  photoTime: {
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: isIOS ? 'System' : 'Roboto',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  photoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(12),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationText: {
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255, 255, 255, 0.95)',
    marginLeft: scale(6),
    fontFamily: isIOS ? 'System' : 'Roboto',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    minWidth: getMinTouchTarget(),
    minHeight: getMinTouchTarget(),
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  likedButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  actionText: {
    fontSize: getResponsiveFontSize(13),
    color: '#FFFFFF',
    marginLeft: scale(6),
    fontFamily: isIOS ? 'System' : 'Roboto',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  likedText: {
    color: '#FF6B6B',
  },
  fab: {
    position: 'absolute',
    bottom: verticalScale(100) + getBottomSafeArea(),
    right: scale(20),
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...getPlatformShadow(8),
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 1000,
  },
  fabDisabled: {
    backgroundColor: colors.text.secondary,
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(50),
  },
  loadingText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.text.secondary,
    marginTop: verticalScale(10),
    fontFamily: isIOS ? 'System' : 'Roboto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(80),
    paddingHorizontal: getResponsivePadding(40),
  },
  emptyIconContainer: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  emptyText: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: isIOS ? '700' : 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: verticalScale(8),
    fontFamily: isIOS ? 'System' : 'Roboto',
  },
  emptySubText: {
    fontSize: getResponsiveFontSize(16),
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: verticalScale(30),
    fontFamily: isIOS ? 'System' : 'Roboto',
    lineHeight: getResponsiveFontSize(22),
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    ...getPlatformShadow(3),
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(16),
    fontWeight: isIOS ? '600' : '500',
    marginLeft: scale(8),
    fontFamily: isIOS ? 'System' : 'Roboto',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: scale(isTablet ? 18 : 15),
  },
  // Photo Modal Styles
  photoModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  photoModalCloseButton: {
    position: 'absolute',
    top: isAndroid ? StatusBar.currentHeight + scale(20) : scale(50),
    right: scale(20),
    zIndex: 2001,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: scale(25),
    width: scale(50),
    height: scale(50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: screenWidth * 0.95,
    height: screenHeight * 0.7,
    maxWidth: scale(400),
    maxHeight: scale(600),
  },
  photoModalInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: scale(20),
    paddingVertical: scale(20),
    paddingBottom: getBottomSafeArea() + scale(20),
    zIndex: 2001,
  },
  photoModalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(15),
  },
  photoModalAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  photoModalAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: scale(18),
  },
  photoModalUserDetails: {
    flex: 1,
  },
  photoModalUserName: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: scale(2),
    letterSpacing: 0.3,
  },
  photoModalTime: {
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  photoModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  photoModalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: scale(20),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    minWidth: scale(60),
    minHeight: scale(44),
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  photoModalLikedButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  photoModalActionText: {
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
    marginLeft: scale(6),
    fontWeight: '600',
  },
  photoModalLikedText: {
    color: '#FF6B6B',
  },
  photoModalCommentButtonActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.3)',
    borderColor: 'rgba(78, 205, 196, 0.6)',
    borderWidth: 3,
  },
  photoModalCommentTextActive: {
    color: '#4ECDC4',
  },
  // Yorumlar Stilleri
  photoModalComments: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    marginTop: scale(15),
    maxHeight: verticalScale(300),
    zIndex: 2000,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  photoModalCommentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
    paddingBottom: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  photoModalCommentsTitle: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  photoModalCommentsList: {
    maxHeight: verticalScale(120),
  },
  photoModalCommentItem: {
    flexDirection: 'row',
    marginBottom: scale(12),
    paddingHorizontal: scale(4),
  },
  photoModalCommentAvatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  photoModalCommentAvatarText: {
    fontSize: scale(16),
  },
  photoModalCommentContent: {
    flex: 1,
  },
  photoModalCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  photoModalCommentUser: {
    fontSize: getResponsiveFontSize(13),
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: scale(8),
  },
  photoModalCommentTime: {
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255, 255, 255, 0.6)',
  },
  photoModalCommentText: {
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: getResponsiveFontSize(18),
  },
  photoModalCommentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: scale(10),
    paddingTop: scale(10),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  photoModalCommentTextInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: getResponsiveFontSize(13),
    color: '#FFFFFF',
    marginRight: scale(8),
    maxHeight: verticalScale(80),
  },
  photoModalCommentSendButton: {
    backgroundColor: colors.primary,
    borderRadius: scale(20),
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalCommentSendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
