import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import apiService from '../services/api';
import { colors } from '../constants/colors';
import { 
  scale, 
  verticalScale, 
  scaleFont, 
  getResponsivePadding, 
  isIOS,
  isAndroid,
  isTablet,
} from '../utils/responsive';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.9;
const CARD_HEIGHT = screenHeight * 0.7;
const SWIPE_THRESHOLD = 120;

export default function MatchesScreen({ route }) {
  const navigation = useNavigation();
  const [matches, setMatches] = useState([]);
  const [likesReceived, setLikesReceived] = useState([]);
  const [suggestedMatches, setSuggestedMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('discover'); // 'discover', 'matches', 'likes'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'mutual', 'age'
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Swipe state for discover cards
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refs for animations
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, [activeTab]);
  
  useEffect(() => {
    // Reset swipe position when index changes
    pan.setValue({ x: 0, y: 0 });
    rotate.setValue(0);
    opacity.setValue(1);
    likeOpacity.setValue(0);
    nopeOpacity.setValue(0);
  }, [currentIndex]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'discover') {
        await loadSuggestedMatches();
      } else {
        await Promise.all([loadMatches(), loadLikesReceived()]);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestedMatches = async () => {
    try {
      const response = await apiService.getSuggestedMatches();
      if (response.success) {
        const suggestions = response.data.suggestions || [];
        console.log('✅ Loaded suggestions:', suggestions.length);
        if (suggestions.length > 0) {
          console.log('📝 First suggestion:', { id: suggestions[0].id, name: `${suggestions[0].firstName} ${suggestions[0].lastName}` });
        }
        setSuggestedMatches(suggestions);
      } else {
        console.error('Load suggested matches error:', response.message);
      }
    } catch (error) {
      console.error('Load suggested matches error:', error);
    }
  };

  const loadMatches = async () => {
    try {
      const response = await apiService.getMatches({ mutualOnly: true });
      if (response.success) {
        setMatches(response.data.matches || []);
      } else {
        console.error('Load matches error:', response.message);
      }
    } catch (error) {
      console.error('Load matches error:', error);
    }
  };

  const loadLikesReceived = async () => {
    try {
      const response = await apiService.getLikesReceived();
      if (response.success) {
        setLikesReceived(response.data.likes || []);
      } else {
        console.error('Load likes received error:', response.message);
      }
    } catch (error) {
      console.error('Load likes received error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLikeBack = async (userId) => {
    try {
      const response = await apiService.likeUser(userId);
      if (response.success) {
        Alert.alert('Başarılı', 'Mutual match oluştu! 🔥');
        // Listeyi yenile
        await loadData();
      } else {
        Alert.alert('Hata', response.message || 'Beğenme işlemi başarısız');
      }
    } catch (error) {
      console.error('Like back error:', error);
      Alert.alert('Hata', 'Bir şeyler yanlış gitti');
    }
  };

  const handlePass = async (userId) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // Pass işlemi burada yapılabilir
      console.log('Passed user:', userId);
      // Sonraki karta geç
      nextCard();
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const handleLike = async (userId) => {
    if (isProcessing) return;
    if (!userId) {
      console.error('❌ handleLike: userId is undefined');
      Alert.alert('Hata', 'Kullanıcı bilgisi alınamadı');
      return;
    }
    setIsProcessing(true);
    try {
      console.log('💚 Like attempt - userId:', userId);
      const response = await apiService.likeUser(userId);
      if (response.success) {
        // Sonraki karta geç
        nextCard();
      } else {
        Alert.alert('Hata', response.message || 'Beğenme işlemi başarısız');
      }
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert('Hata', 'Bir şeyler yanlış gitti');
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const nextCard = () => {
    if (currentIndex < suggestedMatches.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Tüm kartlar tükendi, yenilerini yükle
      loadSuggestedMatches();
      setCurrentIndex(0);
    }
  };

  const swipeCard = (direction) => {
    if (isProcessing) return;
    const currentUser = suggestedMatches[currentIndex];
    if (!currentUser || !currentUser.id) {
      console.error('❌ swipeCard: No valid user at currentIndex:', currentIndex);
      return;
    }
    
    const toValue = direction === 'right' ? SWIPE_THRESHOLD * 2 : -SWIPE_THRESHOLD * 2;
    
    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: toValue, y: 0 },
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (direction === 'right') {
        handleLike(currentUser.id);
      } else {
        handlePass(currentUser.id);
      }
    });
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

  const applyFilters = (data) => {
    let filtered = [...data];

    // Arama filtresi
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => {
        const fullName = `${item.firstName} ${item.lastName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
      });
    }

    // Yaş filtresi
    if (minAge || maxAge) {
      filtered = filtered.filter(item => {
        if (!item.age) return false;
        const age = parseInt(item.age);
        if (minAge && age < parseInt(minAge)) return false;
        if (maxAge && age > parseInt(maxAge)) return false;
        return true;
      });
    }

    // Mutual filtresi (sadece matches için)
    if (activeTab === 'matches' && filterType === 'mutual') {
      filtered = filtered.filter(item => item.isMutual);
    }

    return filtered;
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    setFilterType('all');
    setMinAge('');
    setMaxAge('');
    setSearchQuery('');
  };

  const getFilteredMatches = () => {
    return applyFilters(matches);
  };

  const getFilteredLikes = () => {
    return applyFilters(likesReceived);
  };

  // PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        
        // Rotate based on horizontal movement
        rotate.setValue(gestureState.dx / 10);
        
        // Show like/nope overlay based on direction
        if (gestureState.dx > 50) {
          likeOpacity.setValue(Math.min(gestureState.dx / SWIPE_THRESHOLD, 1));
          nopeOpacity.setValue(0);
        } else if (gestureState.dx < -50) {
          nopeOpacity.setValue(Math.min(Math.abs(gestureState.dx) / SWIPE_THRESHOLD, 1));
          likeOpacity.setValue(0);
        } else {
          likeOpacity.setValue(0);
          nopeOpacity.setValue(0);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        
        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          swipeCard(gestureState.dx > 0 ? 'right' : 'left');
        } else {
          // Snap back to center
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
            }),
            Animated.spring(rotate, {
              toValue: 0,
              useNativeDriver: true,
            }),
          ]).start();
          likeOpacity.setValue(0);
          nopeOpacity.setValue(0);
        }
      },
    })
  ).current;

  const renderDiscoverCard = () => {
    if (!suggestedMatches[currentIndex]) {
      return renderEmptyState();
    }

    const user = suggestedMatches[currentIndex];
    const rotateStr = rotate.interpolate({
      inputRange: [-100, 0, 100],
      outputRange: ['-10deg', '0deg', '10deg'],
    });

    return (
      <Animated.View
        style={[
          styles.swipeCard,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { rotate: rotateStr },
            ],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Like/Nope Overlays */}
        <Animated.View style={[styles.swipeOverlay, styles.likeOverlay, { opacity: likeOpacity }]}>
          <View style={styles.swipeLabel}>
            <Text style={styles.swipeLabelText}>BEĞENDİN 💚</Text>
          </View>
        </Animated.View>
        <Animated.View style={[styles.swipeOverlay, styles.nopeOverlay, { opacity: nopeOpacity }]}>
          <View style={styles.swipeLabel}>
            <Text style={styles.swipeLabelText}>GEÇ 💔</Text>
          </View>
        </Animated.View>

        {/* Card Image */}
        <View style={styles.swipeCardImageContainer}>
          {user.profilePicture ? (
            <Image
              source={{ uri: apiService.getFullImageUrl(user.profilePicture) }}
              style={styles.swipeCardImage}
            />
          ) : (
            <LinearGradient colors={colors.gradients.primary} style={styles.swipeCardImage}>
              <Ionicons name="person" size={scale(80)} color="#FFFFFF" />
            </LinearGradient>
          )}
          
          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradientOverlay}
          >
            <View style={styles.cardInfoContainer}>
              <Text style={styles.cardNameLarge}>
                {user.firstName} {user.lastName}, {user.age || ''}
              </Text>
              {user.bio && (
                <Text style={styles.cardBio} numberOfLines={3}>
                  {user.bio}
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    );
  };

  const renderMatchCard = (match) => {
    return (
      <TouchableOpacity 
        key={match.id} 
        style={styles.matchCard}
        activeOpacity={0.8}
      >
        <View style={styles.cardImageContainer}>
          {match.profilePicture ? (
            <Image
              source={{ uri: apiService.getFullImageUrl(match.profilePicture) }}
              style={styles.cardImage}
            />
          ) : (
            <LinearGradient
              colors={colors.gradients.primary}
              style={styles.cardImagePlaceholder}
            >
              <Ionicons name="person" size={scale(40)} color="#FFFFFF" />
            </LinearGradient>
          )}
          {match.isMutual && (
            <View style={styles.mutualBadge}>
              <Ionicons name="heart" size={scale(12)} color="#FFFFFF" />
            </View>
          )}
        </View>
        <Text style={styles.cardName} numberOfLines={1}>
          {match.firstName} {match.lastName}
        </Text>
        {match.age && (
          <Text style={styles.cardAge}>{match.age} yaşında</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderLikeCard = (like) => {
    return (
      <View key={like.id} style={styles.likeCard}>
        <View style={styles.cardImageContainer}>
          {like.profilePicture ? (
            <Image
              source={{ uri: apiService.getFullImageUrl(like.profilePicture) }}
              style={styles.cardImage}
            />
          ) : (
            <LinearGradient
              colors={colors.gradients.primary}
              style={styles.cardImagePlaceholder}
            >
              <Ionicons name="person" size={scale(40)} color="#FFFFFF" />
            </LinearGradient>
          )}
        </View>
        <View style={styles.likeCardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {like.firstName} {like.lastName}
                </Text>
          {like.age && (
            <Text style={styles.cardAge}>{like.age} yaşında</Text>
          )}
          <View style={styles.likeCardActions}>
                <TouchableOpacity 
              style={styles.passButton}
              onPress={() => handlePass(like.id)}
            >
              <Ionicons name="close" size={scale(20)} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => handleLikeBack(like.id)}
            >
              <Ionicons name="heart" size={scale(20)} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
        </View>
    );
  };

  const renderEmptyState = () => {
    const emptyIcon = activeTab === 'matches' ? 'heart-outline' : 'people-outline';
    const emptyTitle = activeTab === 'matches' ? 'Henüz eşleşme yok' : 'Seni beğenen yok';
    const emptyMessage = activeTab === 'matches'
      ? 'Yakındaki kullanıcıları keşfet ve eşleşmelerini gör!'
      : 'Profilini güncelleyerek daha çok beğeni toplayabilirsin';

  return (
      <View style={styles.emptyState}>
        <LinearGradient
          colors={colors.gradients.primary}
          style={styles.emptyIconContainer}
        >
          <Ionicons name={emptyIcon} size={scale(60)} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
        {activeTab === 'matches' && (
            <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => navigation.navigate('Map')}
            >
            <Ionicons name="map" size={scale(20)} color="#FFFFFF" />
            <Text style={styles.emptyActionText}>Haritayı Keşfet</Text>
            </TouchableOpacity>
        )}
      </View>
    );
  };
                 
                 return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
            <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(24)} color={colors.text.primary} />
            </TouchableOpacity>
        <Text style={styles.headerTitle}>Eşleşmeler</Text>
        <View style={styles.headerRight}>
            <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowFilterModal(true)}
            >
              <Ionicons
              name="options" 
              size={scale(24)} 
              color={filterType !== 'all' || minAge || maxAge || searchQuery ? colors.primary : colors.text.secondary} 
              />
            </TouchableOpacity>
                       </View>
                     </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => setActiveTab('discover')}
        >
          <Ionicons 
            name="flame" 
            size={scale(20)} 
            color={activeTab === 'discover' ? colors.primary : colors.text.tertiary}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Keşfet
                </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matches' && styles.tabActive]}
          onPress={() => setActiveTab('matches')}
        >
          <Ionicons 
            name="people" 
            size={scale(20)} 
            color={activeTab === 'matches' ? colors.primary : colors.text.tertiary}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>
            Eşleşmeler {matches.length > 0 && `(${matches.length})`}
                </Text>
        </TouchableOpacity>
                <TouchableOpacity 
          style={[styles.tab, activeTab === 'likes' && styles.tabActive]}
          onPress={() => setActiveTab('likes')}
                >
                  <Ionicons 
            name="heart" 
            size={scale(20)} 
            color={activeTab === 'likes' ? colors.primary : colors.text.tertiary}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'likes' && styles.tabTextActive]}>
            Beğenenler {likesReceived.length > 0 && `(${likesReceived.length})`}
                  </Text>
                </TouchableOpacity>
              </View>
              
      {/* Search Bar - Only for Matches and Likes tabs */}
      {activeTab !== 'discover' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={scale(20)} color={colors.text.tertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="İsim ara..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={scale(20)} color={colors.text.tertiary} />
              </TouchableOpacity>
          )}
        </View>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
      ) : activeTab === 'discover' ? (
        <View style={styles.discoverContainer}>
          {renderDiscoverCard()}
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => swipeCard('left')}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={['#FF6B6B', '#EE5A6F']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="close" size={scale(30)} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonSuperlike}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={['#4A90E2', '#5BA3E3']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="star" size={scale(20)} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => swipeCard('right')}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={['#4ECDC4', '#44A08D']}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="heart" size={scale(30)} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {activeTab === 'matches' ? (
            getFilteredMatches().length > 0 ? (
              <View style={styles.gridContainer}>
                {getFilteredMatches().map(renderMatchCard)}
              </View>
            ) : (
              renderEmptyState()
            )
          ) : getFilteredLikes().length > 0 ? (
            <View style={styles.listContainer}>
              {getFilteredLikes().map(renderLikeCard)}
            </View>
          ) : (
            renderEmptyState()
          )}
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrele</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Ionicons name="close" size={scale(24)} color={colors.text.primary} />
              </TouchableOpacity>
                    </View>

            <ScrollView style={styles.modalBody}>
              {/* Match Type Filter - Only for Matches Tab */}
              {activeTab === 'matches' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Eşleşme Türü</Text>
                  <View style={styles.filterOptions}>
                    <TouchableOpacity
                      style={[styles.filterOption, filterType === 'all' && styles.filterOptionActive]}
                      onPress={() => setFilterType('all')}
                    >
                      <Text style={[styles.filterOptionText, filterType === 'all' && styles.filterOptionTextActive]}>
                        Tümü
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterOption, filterType === 'mutual' && styles.filterOptionActive]}
                      onPress={() => setFilterType('mutual')}
                    >
                      <Text style={[styles.filterOptionText, filterType === 'mutual' && styles.filterOptionTextActive]}>
                        Sadece Karşılıklı
                      </Text>
                    </TouchableOpacity>
                    </View>
                    </View>
              )}

              {/* Age Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Yaş Aralığı</Text>
                <View style={styles.ageInputContainer}>
                  <TextInput
                    style={styles.ageInput}
                    placeholder="Min yaş"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                    value={minAge}
                    onChangeText={setMinAge}
                  />
                  <Text style={styles.ageSeparator}>-</Text>
                  <TextInput
                    style={styles.ageInput}
                    placeholder="Max yaş"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                    value={maxAge}
                    onChangeText={setMaxAge}
                  />
                  </View>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearFilters}
                >
                  <Text style={styles.clearButtonText}>Temizle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApplyFilters}
                >
                  <LinearGradient
                    colors={colors.gradients.primary}
                    style={styles.applyButtonGradient}
                  >
                    <Text style={styles.applyButtonText}>Uygula</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
            </View>
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(15),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: scaleFont(isTablet ? 22 : 18),
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: colors.background,
    marginLeft: scale(5),
  },
  searchContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: getResponsivePadding(15),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: scale(25),
    paddingHorizontal: getResponsivePadding(15),
    height: scale(40),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: colors.text.primary,
    paddingVertical: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingHorizontal: getResponsivePadding(20),
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabIcon: {
    marginBottom: verticalScale(4),
  },
  tabText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(15),
    fontSize: scaleFont(16),
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: getResponsivePadding(15),
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listContainer: {
    flex: 1,
  },
  matchCard: {
    width: (screenWidth - 60) / 2,
    marginBottom: verticalScale(15),
    backgroundColor: colors.surface,
    borderRadius: scale(15),
    overflow: 'hidden',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutualBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: colors.success,
    borderRadius: scale(12),
    width: scale(24),
    height: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: colors.text.primary,
    paddingHorizontal: scale(10),
    paddingTop: verticalScale(8),
    marginBottom: verticalScale(4),
  },
  cardAge: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
    paddingHorizontal: scale(10),
    paddingBottom: verticalScale(10),
  },
  likeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: scale(15),
    marginBottom: verticalScale(15),
    padding: scale(15),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  likeCardInfo: {
    flex: 1,
    marginLeft: scale(15),
    justifyContent: 'center',
  },
  likeCardActions: {
    flexDirection: 'row',
    marginTop: verticalScale(10),
  },
  passButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(10),
  },
  likeButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(80),
  },
  emptyIconContainer: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  emptyTitle: {
    fontSize: scaleFont(isTablet ? 24 : 20),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: verticalScale(10),
  },
  emptyMessage: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: getResponsivePadding(40),
    marginBottom: verticalScale(30),
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: getResponsivePadding(25),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
  },
  emptyActionText: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: scale(8),
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: scale(25),
    borderTopRightRadius: scale(25),
    maxHeight: screenWidth * 1.2,
    paddingBottom: verticalScale(40),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(20),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalCloseButton: {
    padding: scale(5),
    borderRadius: scale(15),
    backgroundColor: colors.background,
  },
  modalBody: {
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(20),
  },
  filterSection: {
    marginBottom: verticalScale(25),
  },
  filterSectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(15),
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(10),
    borderRadius: scale(20),
    backgroundColor: colors.background,
    marginRight: scale(10),
    marginBottom: verticalScale(10),
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
  },
  filterOptionText: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ageInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: scale(10),
    paddingHorizontal: getResponsivePadding(15),
    paddingVertical: verticalScale(12),
    fontSize: scaleFont(14),
    color: colors.text.primary,
  },
  ageSeparator: {
    fontSize: scaleFont(18),
    color: colors.text.secondary,
    marginHorizontal: scale(10),
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(20),
  },
  clearButton: {
    flex: 1,
    paddingVertical: verticalScale(15),
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: scale(15),
    marginRight: scale(10),
  },
  clearButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.secondary,
  },
  applyButton: {
    flex: 1,
    borderRadius: scale(15),
    overflow: 'hidden',
    marginLeft: scale(10),
  },
  applyButtonGradient: {
    paddingVertical: verticalScale(15),
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Swipe Card Styles
  discoverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(20),
  },
  swipeCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: scale(20),
    backgroundColor: colors.surface,
    position: 'absolute',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  swipeCardImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: scale(20),
    overflow: 'hidden',
  },
  swipeCardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  cardInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: getResponsivePadding(20),
  },
  cardNameLarge: {
    fontSize: scaleFont(28),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: verticalScale(10),
  },
  cardBio: {
    fontSize: scaleFont(16),
    color: '#FFFFFF',
    lineHeight: scaleFont(22),
  },
  swipeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeOverlay: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  nopeOverlay: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderWidth: 3,
    borderColor: '#F44336',
  },
  swipeLabel: {
    paddingHorizontal: getResponsivePadding(30),
    paddingVertical: verticalScale(15),
    borderRadius: scale(15),
    borderWidth: 3,
  },
  swipeLabelText: {
    fontSize: scaleFont(32),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: CARD_HEIGHT + verticalScale(20),
    paddingHorizontal: getResponsivePadding(20),
    gap: scale(20),
  },
  actionButton: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    overflow: 'hidden',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  actionButtonSuperlike: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    overflow: 'hidden',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  actionButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});