import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import apiService from '../services/api';
import { 
  scale, 
  verticalScale, 
  scaleFont, 
  getResponsivePadding 
} from '../utils/responsive';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function FriendSuggestionsScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  
  const [suggestions, setSuggestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }
      
      apiService.setToken(token);
      
      const response = await apiService.get('/friend-suggestions');
      
      if (response.success) {
        setSuggestions(response.data.suggestions || []);
      } else {
        Alert.alert('Hata', response.message || 'Öneriler yüklenemedi');
      }
    } catch (error) {
      console.error('Suggestions load error:', error);
      Alert.alert('Hata', 'Öneriler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (currentIndex >= suggestions.length) return;
    
    const suggestion = suggestions[currentIndex];
    try {
      setIsProcessing(true);
      
      const response = await apiService.post(`/friend-suggestions/${suggestion.id}/like`);
      
      if (response.success) {
        if (response.isMatch) {
          Alert.alert('🎉 Eşleşme!', 'Yeni arkadaşlık oluşturuldu!');
        } else {
          Alert.alert('✅ Beğenildi', 'Kullanıcı beğenildi');
        }
        
        // Sonraki öneriye geç
        setCurrentIndex(prev => prev + 1);
      } else {
        Alert.alert('Hata', response.message || 'Beğeni işlemi başarısız');
      }
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePass = async () => {
    if (currentIndex >= suggestions.length) return;
    
    const suggestion = suggestions[currentIndex];
    try {
      setIsProcessing(true);
      
      const response = await apiService.post(`/friend-suggestions/${suggestion.id}/pass`);
      
      if (response.success) {
        // Sonraki öneriye geç
        setCurrentIndex(prev => prev + 1);
      } else {
        Alert.alert('Hata', response.message || 'Geçme işlemi başarısız');
      }
    } catch (error) {
      console.error('Pass error:', error);
      Alert.alert('Hata', 'Geçme işlemi sırasında bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSuggestionCard = () => {
    if (currentIndex >= suggestions.length) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="people-outline" size={scale(64)} color={colors.text.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            Tüm Öneriler Tükendi
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
            Daha fazla öneri için daha sonra tekrar kontrol edin
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.primary }]}
            onPress={loadSuggestions}
          >
            <Text style={styles.refreshButtonText}>Yenile</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const suggestion = suggestions[currentIndex];
    
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <View style={styles.profileImageContainer}>
            {suggestion.profilePicture ? (
              <Image
                source={{ uri: suggestion.profilePicture }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.defaultProfileImage, { backgroundColor: colors.primary }]}>
                <Ionicons name="person" size={scale(40)} color="#FFFFFF" />
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.text.primary }]}>
              {suggestion.firstName} {suggestion.lastName}
            </Text>
            {suggestion.age && (
              <Text style={[styles.age, { color: colors.text.secondary }]}>
                {suggestion.age} yaşında
              </Text>
            )}
            {suggestion.distance && (
              <Text style={[styles.distance, { color: colors.text.secondary }]}>
                📍 {suggestion.distance}m uzaklıkta
              </Text>
            )}
            {suggestion.mutualFriendsCount > 0 && (
              <Text style={[styles.mutualFriends, { color: colors.text.secondary }]}>
                👥 {suggestion.mutualFriendsCount} ortak arkadaş
              </Text>
            )}
          </View>
        </View>

        {suggestion.bio && (
          <View style={styles.bioContainer}>
            <Text style={[styles.bio, { color: colors.text.primary }]}>
              {suggestion.bio}
            </Text>
          </View>
        )}

        <View style={styles.suggestionReason}>
          <Text style={[styles.reasonText, { color: colors.text.tertiary }]}>
            {suggestion.suggestionReason === 'location' && '📍 Yakın konumda'}
            {suggestion.suggestionReason === 'mutual_friends' && '👥 Ortak arkadaşlar'}
            {suggestion.suggestionReason === 'random' && '🎲 Rastgele öneri'}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.primary }]}>
            Öneriler yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(24)} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Arkadaş Önerileri
        </Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {renderSuggestionCard()}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.passButton, { backgroundColor: colors.lightGray }]}
          onPress={handlePass}
          disabled={isProcessing}
        >
          <Ionicons name="close" size={scale(24)} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.likeButton, { backgroundColor: colors.primary }]}
          onPress={handleLike}
          disabled={isProcessing}
        >
          <Ionicons name="heart" size={scale(24)} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    padding: scale(8),
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
  },
  headerRight: {
    width: scale(40),
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(16),
  },
  card: {
    borderRadius: scale(16),
    padding: scale(20),
    marginVertical: verticalScale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  profileImageContainer: {
    marginRight: scale(16),
  },
  profileImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
  },
  defaultProfileImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: scaleFont(20),
    fontWeight: '600',
    marginBottom: verticalScale(4),
  },
  age: {
    fontSize: scaleFont(16),
    marginBottom: verticalScale(2),
  },
  distance: {
    fontSize: scaleFont(14),
    marginBottom: verticalScale(2),
  },
  mutualFriends: {
    fontSize: scaleFont(14),
  },
  bioContainer: {
    marginBottom: verticalScale(16),
  },
  bio: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(22),
  },
  suggestionReason: {
    alignItems: 'center',
  },
  reasonText: {
    fontSize: scaleFont(14),
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: scale(40),
    paddingVertical: verticalScale(20),
  },
  passButton: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButton: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: scaleFont(24),
    fontWeight: '600',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: scaleFont(16),
    textAlign: 'center',
    marginBottom: verticalScale(30),
  },
  refreshButton: {
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: scaleFont(16),
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
