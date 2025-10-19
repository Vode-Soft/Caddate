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

export default function ConfessionScreen() {
  const [confession, setConfession] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confessions, setConfessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const renderConfessionItem = ({ item }) => (
    <View style={styles.confessionItem}>
      <View style={styles.confessionHeader}>
        <View style={styles.anonymousIcon}>
          <Ionicons name="person-circle-outline" size={scale(20)} color={colors.text.tertiary} />
        </View>
        <Text style={styles.anonymousLabel}>Anonim</Text>
      </View>
      <View style={styles.confessionContent}>
        <Text style={styles.confessionText}>{item.content}</Text>
        <View style={styles.confessionFooter}>
          <View style={styles.timestampContainer}>
            <Ionicons name="time-outline" size={scale(12)} color={colors.text.tertiary} />
            <Text style={styles.confessionTimestamp}>{item.timeAgo || item.timestamp}</Text>
          </View>
          <TouchableOpacity 
            style={styles.likeButton}
            onPress={() => handleLikeConfession(item.id)}
          >
            <Ionicons name="heart-outline" size={scale(16)} color={colors.primary} />
            <Text style={styles.likeCount}>{item.likesCount || item.likes || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
          <View style={styles.headerIconContainer}>
            <Ionicons name="heart-circle-outline" size={scale(32)} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>İtiraf</Text>
          <Text style={styles.headerSubtitle}>Anonim olarak paylaş</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Submit Confession Section */}
        <View style={styles.submitSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="create-outline" size={scale(24)} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>İtirafını Paylaş</Text>
          </View>
          <View style={styles.inputContainer}>
            <View style={styles.inputHeader}>
              <Ionicons name="chatbubble-outline" size={scale(20)} color={colors.text.secondary} />
              <Text style={styles.inputLabel}>Anonim İtiraf</Text>
            </View>
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={scale(16)} color="#FFFFFF" style={{ marginRight: scale(5) }} />
                    <Text style={styles.submitButtonText}>Gönder</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Confessions List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderLeft}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="chatbubbles-outline" size={scale(20)} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Diğer İtiraflar</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.debugButton} onPress={debugAuth}>
                <Ionicons name="bug-outline" size={scale(16)} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.refreshButton} onPress={loadConfessions}>
                <Ionicons name="refresh" size={scale(20)} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

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
              <View style={styles.emptyActionContainer}>
                <Ionicons name="arrow-up" size={scale(16)} color={colors.primary} />
                <Text style={styles.emptyActionText}>Yukarıdaki alana yazarak başla</Text>
              </View>
            </View>
          ) : (
            <ScrollView 
              style={styles.confessionsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.confessionsListContent}
            >
              {confessions.map(renderConfessionItem)}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: getBottomSafeArea() + verticalScale(20),
    paddingBottom: verticalScale(20),
    paddingHorizontal: getResponsivePadding(20),
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: scale(25),
    padding: scale(8),
    marginBottom: verticalScale(10),
  },
  headerTitle: {
    fontSize: scaleFont(28),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: verticalScale(5),
  },
  headerSubtitle: {
    fontSize: scaleFont(16),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  submitSection: {
    padding: getResponsivePadding(20),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  sectionIconContainer: {
    backgroundColor: colors.primaryAlpha,
    borderRadius: scale(20),
    padding: scale(8),
    marginRight: scale(10),
  },
  sectionTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
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
    color: '#FFFFFF',
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
    paddingBottom: verticalScale(20),
  },
  confessionItem: {
    backgroundColor: colors.surface,
    borderRadius: scale(15),
    marginBottom: verticalScale(15),
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
    overflow: 'hidden',
  },
  confessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(15),
    paddingTop: getResponsivePadding(15),
    paddingBottom: getResponsivePadding(8),
    backgroundColor: colors.primaryAlpha,
  },
  anonymousIcon: {
    marginRight: scale(8),
  },
  anonymousLabel: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
    fontWeight: '500',
  },
  confessionContent: {
    padding: getResponsivePadding(15),
  },
  confessionText: {
    fontSize: scaleFont(16),
    color: colors.text.primary,
    lineHeight: scaleFont(22),
    marginBottom: verticalScale(10),
  },
  confessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confessionTimestamp: {
    fontSize: scaleFont(12),
    color: colors.text.tertiary,
    marginLeft: scale(5),
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryAlpha,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(15),
  },
  likeCount: {
    fontSize: scaleFont(12),
    color: colors.primary,
    marginLeft: scale(5),
    fontWeight: '600',
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
});
