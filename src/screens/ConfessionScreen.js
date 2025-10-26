import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
  Modal,
  Image,
  FlatList,
  Share,
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
  isIOS,
  isAndroid,
  isTablet,
  isSmallScreen,
  getBottomSafeArea
} from '../utils/responsive';
import apiService from '../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ConfessionScreen({ navigation }) {
  const [confession, setConfession] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confessions, setConfessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [confessionLikes, setConfessionLikes] = useState([]);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  const [showConfessionModal, setShowConfessionModal] = useState(false);

  useEffect(() => {
    loadConfessions();
  }, []);

  // Debug fonksiyonu
  const debugAuth = async () => {
    try {
      const token = await apiService.getStoredToken();
      console.log('🔍 Debug - Stored Token:', token);
      console.log('🔍 Debug - API Service Token:', apiService.token);
      
      if (token) {
        apiService.setToken(token);
        console.log('✅ Debug - Token set edildi');
      }
      
      // Test request
      const response = await apiService.getConfessions({ page: 1, limit: 1 });
      console.log('🔍 Debug - Test Response:', response);
    } catch (error) {
      console.error('❌ Debug Error:', error);
    }
  };

  const loadConfessions = async () => {
    try {
      setIsLoading(true);
      
      // Token kontrolü ve set etme
      const token = await apiService.getStoredToken();
      console.log('🔍 Token kontrol ediliyor:', token ? 'Token var' : 'Token yok');
      
      if (!token) {
        Alert.alert(
          'Oturum Süresi Dolmuş', 
          'Lütfen tekrar giriş yapın.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Navigation ile login ekranına yönlendir
                // navigation.navigate('Login');
              }
            }
          ]
        );
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      console.log('✅ Token API servisine set edildi');
      
      const response = await apiService.getConfessions({ page: 1, limit: 20 });
      console.log('📝 Confessions response:', response);
      
      if (response && response.success) {
        setConfessions(response.data?.confessions || []);
      } else {
        console.error('❌ Confessions API error:', response);
        const errorMessage = response?.message || 'İtiraflar yüklenemedi';
        
        // Eğer 401 hatası ise token süresi dolmuş
        if (errorMessage.includes('401') || errorMessage.includes('token') || errorMessage.includes('authorization')) {
          Alert.alert(
            'Oturum Süresi Dolmuş', 
            'Lütfen tekrar giriş yapın.',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  // Navigation ile login ekranına yönlendir
                  // navigation.navigate('Login');
                }
              }
            ]
          );
        } else {
          Alert.alert('Hata', errorMessage);
        }
      }
    } catch (error) {
      console.error('❌ İtiraflar yüklenirken hata:', error);
      
      // Network hatası kontrolü
      if (error.message.includes('Network') || error.message.includes('fetch')) {
        Alert.alert(
          'Bağlantı Hatası', 
          'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.'
        );
      } else {
        Alert.alert('Hata', error.message || 'İtiraflar yüklenirken bir hata oluştu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const submitConfession = async () => {
    if (!confession.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir itiraf yazın.');
      return;
    }

    if (confession.trim().length < 10) {
      Alert.alert('Uyarı', 'İtiraf en az 10 karakter olmalıdır.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Token kontrolü
      const token = await apiService.getStoredToken();
      console.log('🔍 Submit için token kontrol ediliyor:', token ? 'Token var' : 'Token yok');
      
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      // Token'ı API servisine set et
      apiService.setToken(token);
      console.log('✅ Submit için token API servisine set edildi');
      
      const response = await apiService.createConfession(confession.trim(), true);
      console.log('📝 Create confession response:', response);
      
      if (response && response.success) {
        Alert.alert('Başarılı', 'İtirafınız paylaşıldı!', [
          {
            text: 'Tamam',
            onPress: () => {
              setConfession('');
              setShowConfessionModal(false);
              loadConfessions(); // Refresh the list
            }
          }
        ]);
      } else {
        console.error('❌ Create confession API error:', response);
        const errorMessage = response?.message || 'İtiraf paylaşılamadı';
        
        // Eğer 401 hatası ise token süresi dolmuş
        if (errorMessage.includes('401') || errorMessage.includes('token') || errorMessage.includes('authorization')) {
          Alert.alert(
            'Oturum Süresi Dolmuş', 
            'Lütfen tekrar giriş yapın.',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  // Navigation ile login ekranına yönlendir
                  // navigation.navigate('Login');
                }
              }
            ]
          );
        } else {
          Alert.alert('Hata', errorMessage);
        }
      }
      
    } catch (error) {
      console.error('❌ İtiraf gönderilirken hata:', error);
      
      // Network hatası kontrolü
      if (error.message.includes('Network') || error.message.includes('fetch')) {
        Alert.alert(
          'Bağlantı Hatası', 
          'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.'
        );
      } else {
        Alert.alert('Hata', error.message || 'İtiraf gönderilirken bir hata oluştu.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeConfession = async (confessionId) => {
    try {
      console.log('❤️ Like confession attempt:', confessionId);
      
      // Token kontrolü
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      apiService.setToken(token);
      
      const response = await apiService.likeConfession(confessionId);
      console.log('❤️ Like confession response:', response);
      
      if (response && response.success) {
        // Beğeni sayısını güncelle
        setConfessions(prev => prev.map(confession => 
          confession.id === confessionId 
            ? { ...confession, likesCount: (confession.likesCount || 0) + 1 }
            : confession
        ));
      } else {
        const errorMessage = response?.message || 'Beğeni işlemi başarısız';
        
        // Eğer 401 hatası ise token süresi dolmuş
        if (errorMessage.includes('401') || errorMessage.includes('token') || errorMessage.includes('authorization')) {
          Alert.alert(
            'Oturum Süresi Dolmuş', 
            'Lütfen tekrar giriş yapın.',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  // Navigation ile login ekranına yönlendir
                  // navigation.navigate('Login');
                }
              }
            ]
          );
        } else {
          Alert.alert('Hata', errorMessage);
        }
      }
    } catch (error) {
      console.error('❌ Like confession error:', error);
      Alert.alert('Hata', error.message || 'Beğeni işlemi sırasında bir hata oluştu.');
    }
  };

  const handleShowLikes = async (confessionId) => {
    try {
      setIsLoadingLikes(true);
      setShowLikesModal(true);
      
      // Token kontrolü
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        setShowLikesModal(false);
        return;
      }
      
      apiService.setToken(token);
      
      const response = await apiService.getConfessionLikes(confessionId);
      console.log('👥 Confession likes response:', response);
      
      if (response && response.success) {
        setConfessionLikes(response.data.likes || []);
      } else {
        Alert.alert('Hata', response?.message || 'Beğenenler yüklenemedi');
        setShowLikesModal(false);
      }
    } catch (error) {
      console.error('❌ Get confession likes error:', error);
      Alert.alert('Hata', error.message || 'Beğenenler yüklenirken bir hata oluştu.');
      setShowLikesModal(false);
    } finally {
      setIsLoadingLikes(false);
    }
  };

  const handleShareConfession = async (confession) => {
    try {
      const shareContent = {
        message: `"${confession.content}"\n\n- Anonim İtiraf\n\nCadDate uygulamasından paylaşıldı`,
        title: 'İtiraf Paylaş',
      };

      if (Platform.OS === 'ios') {
        await Share.share(shareContent);
      } else {
        await Share.share(shareContent);
      }
    } catch (error) {
      console.error('❌ Share confession error:', error);
      Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu.');
    }
  };

  const renderConfessionItem = (item) => {
    if (!item || typeof item !== 'object') return null;
    const contentText = typeof item.content === 'string' ? item.content : '';
    const timeAgoText = item.timeAgo || item.timestamp || '';
    const likes = typeof item.likesCount === 'number' ? item.likesCount : (typeof item.likes === 'number' ? item.likes : 0);

    return (
      <View style={styles.confessionCard}>
        {/* Card Header with Gradient */}
        <LinearGradient
          colors={colors.gradients.primary}
          style={styles.cardHeader}
        >
          <View style={styles.cardHeaderContent}>
            <View style={styles.anonymousAvatar}>
              <Ionicons name="person-circle" size={scale(20)} color={colors.text.light} />
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.anonymousName}>Anonim</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={scale(10)} color={colors.text.light} />
                <Text style={styles.verifiedText}>Güvenli</Text>
              </View>
            </View>
          </View>
          <View style={styles.timeContainer}>
            <Ionicons name="time" size={scale(12)} color={colors.text.light} />
            <Text style={styles.timeText}>{timeAgoText}</Text>
          </View>
        </LinearGradient>

        {/* Card Content */}
        <View style={styles.cardContent}>
          <Text style={styles.confessionText} numberOfLines={6}>
            {contentText}
          </Text>
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.cardStats}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => handleLikeConfession(item.id)}
            >
              <Ionicons name="heart-outline" size={scale(14)} color={colors.primary} />
              <Text style={styles.statText}>{likes}</Text>
            </TouchableOpacity>
            {likes > 0 && (
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => handleShowLikes(item.id)}
              >
                <Ionicons name="people-outline" size={scale(14)} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleShareConfession(item)}
            >
              <Ionicons name="share-outline" size={scale(14)} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderLikeItem = ({ item }) => (
    <View style={styles.likeItem}>
      <View style={styles.likeUserInfo}>
        {item.profilePicture ? (
          <Image 
            source={{ uri: apiService.getFullImageUrl(item.profilePicture) }} 
            style={styles.likeUserAvatar} 
            resizeMode="cover"
            onError={(error) => {
              console.log('❌ Like item image load error:', error.nativeEvent.error);
              console.log('❌ Failed URL:', item.profilePicture);
            }}
            onLoad={() => {
              console.log('✅ Like item image loaded successfully:', item.profilePicture);
            }}
          />
        ) : (
          <View style={styles.likeUserAvatarPlaceholder}>
            <Ionicons name="person" size={scale(20)} color={colors.text.tertiary} />
          </View>
        )}
        <View style={styles.likeUserDetails}>
          <Text style={styles.likeUserName}>
            {item.firstName} {item.lastName}
          </Text>
          <View style={styles.likeUserMeta}>
            <Text style={styles.likeUserAge}>{item.age} yaş</Text>
            <Text style={styles.likeUserGender}>
              {item.gender === 'male' ? 'Erkek' : item.gender === 'female' ? 'Kadın' : 'Belirtilmemiş'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.likeTime}>{item.timeAgo}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={colors.gradients.redBlack}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={scale(24)} color={colors.text.light} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="heart-circle-outline" size={scale(32)} color={colors.text.light} />
            </View>
            <Text style={styles.headerTitle}>İtiraflar</Text>
            <Text style={styles.headerSubtitle}>Anonim paylaşımlar</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Confessions List */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={styles.loadingText}>İtiraflar yükleniyor...</Text>
            <Text style={styles.loadingSubtext}>Lütfen bekleyin</Text>
          </View>
        ) : confessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="chatbubbles-outline" size={scale(60)} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyText}>Henüz itiraf yok</Text>
            <Text style={styles.emptySubtext}>İlk itirafı sen yap!</Text>
            <TouchableOpacity 
              style={styles.emptyActionButton}
              onPress={() => setShowConfessionModal(true)}
            >
              <Ionicons name="add" size={scale(20)} color={colors.text.light} />
              <Text style={styles.emptyActionButtonText}>İtiraf Paylaş</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={confessions}
            renderItem={({ item }) => renderConfessionItem(item)}
            keyExtractor={(item) => item.id.toString()}
            style={styles.confessionsList}
            contentContainerStyle={styles.confessionsListContent}
            showsVerticalScrollIndicator={false}
            refreshing={isLoading}
            onRefresh={loadConfessions}
            numColumns={2}
            columnWrapperStyle={styles.row}
          />
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowConfessionModal(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={colors.gradients.primary}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={scale(24)} color={colors.text.light} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Confession Modal */}
      <Modal
        visible={showConfessionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConfessionModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowConfessionModal(false)}
            >
              <Ionicons name="close" size={scale(24)} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>İtirafını Paylaş</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <KeyboardAvoidingView 
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.confessionForm}>
              <View style={styles.formHeader}>
                <View style={styles.formIconContainer}>
                  <Ionicons name="shield-checkmark-outline" size={scale(24)} color={colors.success} />
                </View>
                <View style={styles.formHeaderText}>
                  <Text style={styles.formTitle}>Anonim İtiraf</Text>
                  <Text style={styles.formSubtitle}>Kimliğiniz gizli kalacak</Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.confessionInput}
                  placeholder="İtirafını buraya yaz..."
                  placeholderTextColor={colors.text.tertiary}
                  value={confession}
                  onChangeText={setConfession}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                <View style={styles.inputFooter}>
                  <View style={styles.characterCountContainer}>
                    <Ionicons name="text-outline" size={scale(14)} color={colors.text.tertiary} />
                    <Text style={styles.characterCount}>{confession.length}/500</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!confession.trim() || confession.trim().length < 10) && styles.submitButtonDisabled
                    ]}
                    onPress={submitConfession}
                    disabled={isSubmitting || !confession.trim() || confession.trim().length < 10}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={colors.text.light} />
                    ) : (
                      <>
                        <Ionicons name="send" size={scale(16)} color={colors.text.light} style={{ marginRight: scale(5) }} />
                        <Text style={styles.submitButtonText}>Paylaş</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.privacyInfo}>
                <Ionicons name="lock-closed-outline" size={scale(16)} color={colors.text.secondary} />
                <Text style={styles.privacyText}>
                  İtirafınız tamamen anonim olarak paylaşılacak. Kimliğiniz hiçbir şekilde açığa çıkmayacak.
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Beğenenler Modal */}
      <Modal
        visible={showLikesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLikesModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowLikesModal(false)}
            >
              <Ionicons name="close" size={scale(24)} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Beğenenler</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          {isLoadingLikes ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.modalLoadingText}>Beğenenler yükleniyor...</Text>
            </View>
          ) : confessionLikes.length === 0 ? (
            <View style={styles.modalEmptyContainer}>
              <Ionicons name="heart-outline" size={scale(60)} color={colors.text.tertiary} />
              <Text style={styles.modalEmptyText}>Henüz beğenen yok</Text>
              <Text style={styles.modalEmptySubtext}>İlk beğeneni sen ol!</Text>
            </View>
          ) : (
            <FlatList
              data={confessionLikes}
              renderItem={renderLikeItem}
              keyExtractor={(item, index) => `${item.firstName}-${index}`}
              style={styles.likesList}
              contentContainerStyle={styles.likesListContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: getBottomSafeArea() + verticalScale(10),
    paddingBottom: verticalScale(15),
    paddingHorizontal: getResponsivePadding(20),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: colors.primaryAlpha,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: scale(40), // Back button ile aynı genişlik
  },
  headerIconContainer: {
    backgroundColor: colors.primaryAlpha,
    borderRadius: scale(25),
    padding: scale(8),
    marginBottom: verticalScale(10),
  },
  headerTitle: {
    fontSize: scaleFont(28),
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: verticalScale(5),
  },
  headerSubtitle: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: scale(15),
    padding: getResponsivePadding(15),
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  inputLabel: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    marginLeft: scale(8),
    fontWeight: '500',
  },
  confessionInput: {
    fontSize: scaleFont(16),
    color: colors.text.primary,
    minHeight: verticalScale(100),
    maxHeight: verticalScale(150),
    textAlignVertical: 'top',
    fontFamily: isIOS ? 'System' : 'Roboto',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(15),
  },
  characterCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  characterCount: {
    fontSize: scaleFont(14),
    color: colors.text.tertiary,
    marginLeft: scale(5),
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: colors.text.tertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: colors.text.light,
    fontSize: scaleFont(16),
    fontWeight: 'bold',
  },
  listSection: {
    flex: 1,
    padding: getResponsivePadding(20),
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  debugButton: {
    backgroundColor: colors.warning + '20',
    borderRadius: scale(16),
    padding: scale(6),
  },
  refreshButton: {
    backgroundColor: colors.primaryAlpha,
    borderRadius: scale(20),
    padding: scale(8),
  },
  confessionsList: {
    flex: 1,
  },
  confessionsListContent: {
    padding: getResponsivePadding(15),
    paddingBottom: verticalScale(100), // FAB için boşluk
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: scale(5),
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: verticalScale(30),
    right: scale(20),
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty State Button
  emptyActionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(20),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyActionButtonText: {
    color: colors.text.light,
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    marginLeft: scale(8),
  },
  // Modal Styles
  modalContent: {
    flex: 1,
    padding: getResponsivePadding(20),
  },
  confessionForm: {
    flex: 1,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    backgroundColor: colors.success + '10',
    padding: getResponsivePadding(15),
    borderRadius: scale(12),
  },
  formIconContainer: {
    backgroundColor: colors.success + '20',
    borderRadius: scale(20),
    padding: scale(8),
    marginRight: scale(12),
  },
  formHeaderText: {
    flex: 1,
  },
  formTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: verticalScale(4),
  },
  formSubtitle: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    padding: getResponsivePadding(15),
    borderRadius: scale(12),
    marginTop: verticalScale(20),
  },
  privacyText: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    marginLeft: scale(8),
    flex: 1,
    lineHeight: scaleFont(20),
  },
  // Modern Confession Card Styles
  confessionCard: {
    backgroundColor: colors.surface,
    borderRadius: scale(16),
    marginBottom: verticalScale(15),
    marginHorizontal: scale(5),
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
    flex: 1,
    maxWidth: (screenWidth - scale(40)) / 2,
  },
  cardHeader: {
    paddingHorizontal: getResponsivePadding(12),
    paddingVertical: getResponsivePadding(10),
  },
  cardHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  anonymousAvatar: {
    marginRight: scale(8),
  },
  cardHeaderInfo: {
    flex: 1,
  },
  anonymousName: {
    fontSize: scaleFont(13),
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: verticalScale(2),
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '30',
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(8),
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: scaleFont(9),
    color: colors.text.light,
    fontWeight: '600',
    marginLeft: scale(3),
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  timeText: {
    fontSize: scaleFont(10),
    color: colors.text.light,
    marginLeft: scale(4),
    opacity: 0.9,
  },
  cardContent: {
    padding: getResponsivePadding(12),
    minHeight: verticalScale(80),
  },
  confessionText: {
    fontSize: scaleFont(14),
    color: colors.text.primary,
    lineHeight: scaleFont(20),
    textAlign: 'left',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(12),
    paddingVertical: getResponsivePadding(8),
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryAlpha,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  statText: {
    fontSize: scaleFont(11),
    color: colors.primary,
    marginLeft: scale(4),
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: scale(6),
    borderRadius: scale(8),
    backgroundColor: colors.text.tertiary + '20',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(50),
  },
  loadingIconContainer: {
    backgroundColor: colors.primaryAlpha,
    borderRadius: scale(40),
    padding: scale(20),
    marginBottom: verticalScale(20),
  },
  loadingText: {
    fontSize: scaleFont(18),
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: verticalScale(5),
  },
  loadingSubtext: {
    fontSize: scaleFont(14),
    color: colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(50),
    paddingHorizontal: getResponsivePadding(40),
  },
  emptyIconContainer: {
    backgroundColor: colors.primaryAlpha,
    borderRadius: scale(50),
    padding: scale(20),
    marginBottom: verticalScale(20),
  },
  emptyText: {
    fontSize: scaleFont(20),
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: scaleFont(16),
    color: colors.text.tertiary,
    marginBottom: verticalScale(20),
    textAlign: 'center',
  },
  emptyActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryAlpha,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
  },
  emptyActionText: {
    fontSize: scaleFont(14),
    color: colors.primary,
    marginLeft: scale(8),
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalCloseButton: {
    padding: scale(8),
  },
  modalTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalHeaderSpacer: {
    width: scale(40),
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(50),
  },
  modalLoadingText: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
    marginTop: verticalScale(15),
  },
  modalEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(50),
    paddingHorizontal: getResponsivePadding(40),
  },
  modalEmptyText: {
    fontSize: scaleFont(18),
    color: colors.text.secondary,
    fontWeight: '600',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(8),
  },
  modalEmptySubtext: {
    fontSize: scaleFont(14),
    color: colors.text.tertiary,
  },
  likesList: {
    flex: 1,
  },
  likesListContent: {
    padding: getResponsivePadding(20),
  },
  likeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: getResponsivePadding(15),
    borderRadius: scale(12),
    marginBottom: verticalScale(10),
    shadowColor: colors.shadow.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  likeUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  likeUserAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    marginRight: scale(12),
  },
  likeUserAvatarPlaceholder: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: colors.text.tertiary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  likeUserDetails: {
    flex: 1,
  },
  likeUserName: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(2),
  },
  likeUserMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  likeUserAge: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
  },
  likeUserGender: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
  },
  likeTime: {
    fontSize: scaleFont(12),
    color: colors.text.tertiary,
  },
});
