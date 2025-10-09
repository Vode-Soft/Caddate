import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  scale, 
  verticalScale, 
  scaleFont, 
  getResponsivePadding,
  isIOS,
  getPlatformShadow
} from '../utils/responsive';
import { colors } from '../constants/colors';
import apiService from '../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.9;
const CARD_HEIGHT = screenHeight * 0.65;
const SWIPE_THRESHOLD = 120;

export default function MatchesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('suggestions'); // suggestions, matches, likes
  const [suggestions, setSuggestions] = useState([]);
  const [matches, setMatches] = useState([]);
  const [likesReceived, setLikesReceived] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minAge: 18,
    maxAge: 99,
    maxDistance: 100, // km
    gender: 'all', // all, male, female
  });

  // Animasyon referansları
  const position = useRef(new Animated.ValueXY()).current;
  const swipeAnim = useRef(new Animated.Value(1)).current;
  const matchAnimScale = useRef(new Animated.Value(0)).current;
  const matchAnimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    // Reset card position when switching tabs
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(0);
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'suggestions') {
        console.log('🔍 Loading suggestions with filters:', {
          maxDistance: filters.maxDistance,
          minAge: filters.minAge,
          maxAge: filters.maxAge,
          gender: filters.gender
        });
        
        const response = await apiService.getSuggestedMatches({ 
          limit: 50,
          maxDistance: filters.maxDistance,
          minAge: filters.minAge,
          maxAge: filters.maxAge,
          gender: filters.gender
        });
        console.log('🎯 Suggestions response:', response);
        if (response.success) {
          console.log('✅ Suggestions data count:', response.data.suggestions.length);
          console.log('✅ First 3 suggestions:', response.data.suggestions.slice(0, 3));
          setSuggestions(response.data.suggestions);
        }
      } else if (activeTab === 'matches') {
        const response = await apiService.getMatches({ mutualOnly: true });
        console.log('💕 Matches response:', response);
        if (response.success) {
          setMatches(response.data.matches);
        }
      } else if (activeTab === 'likes') {
        const response = await apiService.getLikesReceived();
        console.log('💝 Likes response:', response);
        if (response.success) {
          setLikesReceived(response.data.likes);
        }
      }

      // Load stats
      const statsResponse = await apiService.getMatchStats();
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Load data error:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Swipe card logic
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe right - Like
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe left - Pass
          forceSwipe('left');
        } else {
          // Reset position
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? screenWidth + 100 : -screenWidth - 100;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = async (direction) => {
    const currentUsers = getCurrentUserList();
    const swipedUser = currentUsers[currentIndex];

    if (direction === 'right' && swipedUser) {
      // Like user
      await handleLike(swipedUser.id);
    }

    // Move to next card
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(currentIndex + 1);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const handleLike = async (userId) => {
    try {
      const response = await apiService.likeUser(userId);
      if (response.success && response.data.isMutual) {
        // Show match animation
        const user = getCurrentUserList().find(u => u.id === userId);
        setMatchedUser(user);
        showMatchAnimationHandler();
      }
      
      // Reload stats
      const statsResponse = await apiService.getMatchStats();
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert('Hata', 'Beğeni işlemi başarısız');
    }
  };

  const handlePass = () => {
    forceSwipe('left');
  };

  const handleLikeButton = () => {
    forceSwipe('right');
  };

  const showMatchAnimationHandler = () => {
    setShowMatchAnimation(true);
    
    Animated.parallel([
      Animated.spring(matchAnimScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(matchAnimOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      hideMatchAnimation();
    }, 3000);
  };

  const hideMatchAnimation = () => {
    Animated.parallel([
      Animated.timing(matchAnimScale, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(matchAnimOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowMatchAnimation(false);
      setMatchedUser(null);
      matchAnimScale.setValue(0);
      matchAnimOpacity.setValue(0);
    });
  };

  const getCurrentUserList = () => {
    if (activeTab === 'suggestions') return suggestions;
    if (activeTab === 'matches') return matches;
    if (activeTab === 'likes') return likesReceived;
    return [];
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-screenWidth / 2, 0, screenWidth / 2],
      outputRange: ['-10deg', '0deg', '10deg'],
      extrapolate: 'clamp',
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    };
  };

  const getLikeOpacity = () => {
    return position.x.interpolate({
      inputRange: [0, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  };

  const getNopeOpacity = () => {
    return position.x.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  };

  const renderCard = (user, index) => {
    if (!user) {
      console.log('⚠️ No user data for card at index:', index);
      return null;
    }

    console.log('🎴 Rendering card for user:', {
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      age: user.age
    });

    const isTopCard = index === currentIndex;
    const cardStyle = isTopCard ? getCardStyle() : {};
    
    // Profil fotoğrafı URL'ini düzenle
    const getProfileImageUrl = () => {
      if (user.profilePicture) {
        // Eğer tam URL ise olduğu gibi kullan
        if (user.profilePicture.startsWith('http')) {
          return user.profilePicture;
        }
        // Backend'den gelen relative path ise tam URL oluştur
        return `http://192.168.1.17:3000${user.profilePicture}`;
      }
      // Default avatar
      return 'https://ui-avatars.com/api/?name=' + 
             encodeURIComponent(user.name || `${user.firstName} ${user.lastName}`) + 
             '&size=600&background=667eea&color=fff&bold=true';
    };

    return (
      <Animated.View
        key={user.id}
        style={[
          styles.card,
          cardStyle,
          {
            zIndex: getCurrentUserList().length - index,
            position: 'absolute',
            top: isTopCard ? 0 : (index - currentIndex) * 5,
            opacity: index > currentIndex + 2 ? 0 : 1,
          },
        ]}
        {...(isTopCard ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => {
            setSelectedUser(user);
            setShowUserDetail(true);
          }}
          style={{ flex: 1 }}
        >
          <Image
            source={{ uri: getProfileImageUrl() }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={(e) => console.log('❌ Image load error:', e.nativeEvent.error)}
            onLoad={() => console.log('✅ Image loaded for user:', user.id)}
          />
        </TouchableOpacity>
        
        {/* Like/Nope overlays */}
        {isTopCard && (
          <>
            <Animated.View style={[styles.likeStamp, { opacity: getLikeOpacity() }]}>
              <Text style={styles.stampText}>BEĞEN</Text>
            </Animated.View>
            
            <Animated.View style={[styles.nopeStamp, { opacity: getNopeOpacity() }]}>
              <Text style={styles.stampText}>GEÇ</Text>
            </Animated.View>
          </>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.cardGradient}
        >
          <View style={styles.cardInfo}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user.name || `${user.firstName} ${user.lastName}`}
                {user.age && `, ${user.age}`}
              </Text>
              
              {user.distance && (
                <View style={styles.distanceContainer}>
                  <Ionicons name="location" size={scale(16)} color="#fff" />
                  <Text style={styles.distanceText}>
                    {user.distance < 1 
                      ? `${Math.round(user.distance * 1000)} m` 
                      : `${user.distance.toFixed(1)} km`} uzakta
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderSwipeCards = () => {
    const currentUsers = getCurrentUserList();
    
    if (currentIndex >= currentUsers.length) {
      return (
        <View style={styles.noMoreCards}>
          <MaterialCommunityIcons 
            name="cards-heart" 
            size={scale(80)} 
            color={colors.text.tertiary} 
          />
          <Text style={styles.noMoreCardsText}>
            {activeTab === 'suggestions' 
              ? 'Şimdilik bu kadar!' 
              : activeTab === 'matches'
              ? 'Henüz eşleşmen yok'
              : 'Henüz kimse seni beğenmemiş'}
          </Text>
          <Text style={styles.noMoreCardsSubText}>
            {activeTab === 'suggestions' 
              ? 'Biraz sonra tekrar dene' 
              : 'İnsanları beğenmeye başla!'}
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={scale(24)} color="#fff" />
            <Text style={styles.refreshButtonText}>Yenile</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cardsContainer}>
        {currentUsers
          .slice(currentIndex, currentIndex + 3)
          .reverse()
          .map((user, index) => renderCard(
            user, 
            currentIndex + (2 - index)
          ))}
      </View>
    );
  };

  const renderMatchAnimation = () => {
    if (!showMatchAnimation || !matchedUser) return null;

    return (
      <Animated.View
        style={[
          styles.matchAnimationContainer,
          {
            opacity: matchAnimOpacity,
            transform: [{ scale: matchAnimScale }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FF6B9D', '#C239B3', '#8B5CF6']}
          style={styles.matchAnimationGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons 
            name="heart" 
            size={scale(100)} 
            color="#fff" 
          />
          <Text style={styles.matchAnimationTitle}>Eşleşme! 💕</Text>
          <Text style={styles.matchAnimationText}>
            {matchedUser.name || `${matchedUser.firstName} ${matchedUser.lastName}`} ile eşleştiniz!
          </Text>
          <TouchableOpacity 
            style={styles.matchAnimationButton}
            onPress={hideMatchAnimation}
          >
            <Text style={styles.matchAnimationButtonText}>Harika!</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'suggestions' && styles.activeTab]}
        onPress={() => setActiveTab('suggestions')}
      >
        <MaterialCommunityIcons 
          name="cards" 
          size={scale(24)} 
          color={activeTab === 'suggestions' ? colors.primary : colors.text.tertiary} 
        />
        <Text style={[
          styles.tabText, 
          activeTab === 'suggestions' && styles.activeTabText
        ]}>
          Öneriler
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'matches' && styles.activeTab]}
        onPress={() => setActiveTab('matches')}
      >
        <MaterialCommunityIcons 
          name="heart-multiple" 
          size={scale(24)} 
          color={activeTab === 'matches' ? colors.primary : colors.text.tertiary} 
        />
        <Text style={[
          styles.tabText, 
          activeTab === 'matches' && styles.activeTabText
        ]}>
          Eşleşmeler
        </Text>
        {stats.totalMatches > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stats.totalMatches}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'likes' && styles.activeTab]}
        onPress={() => setActiveTab('likes')}
      >
        <MaterialCommunityIcons 
          name="heart" 
          size={scale(24)} 
          color={activeTab === 'likes' ? colors.primary : colors.text.tertiary} 
        />
        <Text style={[
          styles.tabText, 
          activeTab === 'likes' && styles.activeTabText
        ]}>
          Beğenenler
        </Text>
        {stats.pendingLikes > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stats.pendingLikes}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderActionButtons = () => {
    if (activeTab !== 'suggestions') return null;

    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.passButton]}
          onPress={handlePass}
        >
          <Ionicons name="close" size={scale(32)} color="#FF6B6B" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.superLikeButton]}
          onPress={() => Alert.alert('Super Like', 'Premium özellik - Yakında!')}
        >
          <Ionicons name="star" size={scale(28)} color="#00D4FF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.likeButton]}
          onPress={handleLikeButton}
        >
          <Ionicons name="heart" size={scale(32)} color="#4CAF50" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderUserDetailModal = () => {
    if (!selectedUser) return null;

    const getProfileImageUrl = () => {
      if (selectedUser.profilePicture) {
        if (selectedUser.profilePicture.startsWith('http')) {
          return selectedUser.profilePicture;
        }
        return `http://192.168.1.17:3000${selectedUser.profilePicture}`;
      }
      return 'https://ui-avatars.com/api/?name=' + 
             encodeURIComponent(selectedUser.name || `${selectedUser.firstName} ${selectedUser.lastName}`) + 
             '&size=600&background=667eea&color=fff&bold=true';
    };

    return (
      <Modal
        visible={showUserDetail}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowUserDetail(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Kullanıcı Fotoğrafı */}
            <Image
              source={{ uri: getProfileImageUrl() }}
              style={styles.modalImage}
              resizeMode="cover"
            />
            
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.modalImageGradient}
            >
              <Text style={styles.modalName}>
                {selectedUser.name || `${selectedUser.firstName} ${selectedUser.lastName}`}
                {selectedUser.age && `, ${selectedUser.age}`}
              </Text>
            </LinearGradient>

            {/* Kullanıcı Bilgileri */}
            <View style={styles.modalContent}>
              {/* Konum Bilgisi */}
              {selectedUser.distance && (
                <View style={styles.modalInfoCard}>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="location" size={scale(24)} color={colors.primary} />
                    <View style={styles.modalInfoText}>
                      <Text style={styles.modalInfoTitle}>Konum</Text>
                      <Text style={styles.modalInfoValue}>
                        {selectedUser.distance < 1 
                          ? `${Math.round(selectedUser.distance * 1000)} m` 
                          : `${selectedUser.distance.toFixed(1)} km`} uzakta
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Aktiflik Durumu */}
              {selectedUser.isActive && (
                <View style={styles.modalInfoCard}>
                  <View style={styles.modalInfoRow}>
                    <View style={styles.activeIndicatorLarge}>
                      <View style={styles.activeDotLarge} />
                    </View>
                    <View style={styles.modalInfoText}>
                      <Text style={styles.modalInfoTitle}>Durum</Text>
                      <Text style={styles.modalInfoValue}>Çevrimiçi</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Yaş Bilgisi */}
              {selectedUser.age && (
                <View style={styles.modalInfoCard}>
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="calendar" size={scale(24)} color={colors.primary} />
                    <View style={styles.modalInfoText}>
                      <Text style={styles.modalInfoTitle}>Yaş</Text>
                      <Text style={styles.modalInfoValue}>{selectedUser.age} yaşında</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Hakkında (Placeholder) */}
              <View style={styles.modalInfoCard}>
                <View style={styles.modalInfoColumn}>
                  <View style={styles.modalInfoHeader}>
                    <Ionicons name="person" size={scale(24)} color={colors.primary} />
                    <Text style={styles.modalInfoTitle}>Hakkında</Text>
                  </View>
                  <Text style={styles.modalBioText}>
                    Bu kullanıcı henüz bir biyografi eklememiş.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Kapat Butonu */}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowUserDetail(false)}
          >
            <Ionicons name="close-circle" size={scale(40)} color="#fff" />
          </TouchableOpacity>

          {/* Alt Aksiyonlar */}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalActionButton, styles.modalPassButton]}
              onPress={() => {
                setShowUserDetail(false);
                handlePass();
              }}
            >
              <Ionicons name="close" size={scale(28)} color="#FF6B6B" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalActionButton, styles.modalLikeButton]}
              onPress={() => {
                setShowUserDetail(false);
                handleLikeButton();
              }}
            >
              <Ionicons name="heart" size={scale(28)} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFiltersModal = () => {
    return (
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContainer}>
            {/* Header */}
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filtreler</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={scale(28)} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
              {/* Yaş Aralığı */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Yaş Aralığı</Text>
                <View style={styles.filterRow}>
                  <View style={styles.filterInputContainer}>
                    <Text style={styles.filterInputLabel}>Min</Text>
                    <View style={styles.filterInput}>
                      <TextInput
                        style={styles.filterInputText}
                        value={filters.minAge.toString()}
                        keyboardType="numeric"
                        onChangeText={(text) => {
                          const age = parseInt(text) || 18;
                          if (age >= 18 && age <= filters.maxAge) {
                            setFilters({ ...filters, minAge: age });
                          }
                        }}
                      />
                    </View>
                  </View>
                  
                  <Text style={styles.filterRangeSeparator}>-</Text>
                  
                  <View style={styles.filterInputContainer}>
                    <Text style={styles.filterInputLabel}>Max</Text>
                    <View style={styles.filterInput}>
                      <TextInput
                        style={styles.filterInputText}
                        value={filters.maxAge.toString()}
                        keyboardType="numeric"
                        onChangeText={(text) => {
                          const age = parseInt(text) || 99;
                          if (age >= filters.minAge && age <= 99) {
                            setFilters({ ...filters, maxAge: age });
                          }
                        }}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Maksimum Mesafe */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  Maksimum Mesafe: {filters.maxDistance} km
                </Text>
                <View style={styles.filterDistanceButtons}>
                  {[10, 25, 50, 100, 200].map((distance) => (
                    <TouchableOpacity
                      key={distance}
                      style={[
                        styles.filterDistanceButton,
                        filters.maxDistance === distance && styles.filterDistanceButtonActive
                      ]}
                      onPress={() => setFilters({ ...filters, maxDistance: distance })}
                    >
                      <Text
                        style={[
                          styles.filterDistanceButtonText,
                          filters.maxDistance === distance && styles.filterDistanceButtonTextActive
                        ]}
                      >
                        {distance}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Cinsiyet */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Cinsiyet</Text>
                <View style={styles.filterGenderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.filterGenderButton,
                      filters.gender === 'all' && styles.filterGenderButtonActive
                    ]}
                    onPress={() => setFilters({ ...filters, gender: 'all' })}
                  >
                    <Ionicons 
                      name="people" 
                      size={scale(24)} 
                      color={filters.gender === 'all' ? '#fff' : colors.text.secondary} 
                    />
                    <Text
                      style={[
                        styles.filterGenderButtonText,
                        filters.gender === 'all' && styles.filterGenderButtonTextActive
                      ]}
                    >
                      Hepsi
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterGenderButton,
                      filters.gender === 'male' && styles.filterGenderButtonActive
                    ]}
                    onPress={() => setFilters({ ...filters, gender: 'male' })}
                  >
                    <Ionicons 
                      name="male" 
                      size={scale(24)} 
                      color={filters.gender === 'male' ? '#fff' : colors.text.secondary} 
                    />
                    <Text
                      style={[
                        styles.filterGenderButtonText,
                        filters.gender === 'male' && styles.filterGenderButtonTextActive
                      ]}
                    >
                      Erkek
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterGenderButton,
                      filters.gender === 'female' && styles.filterGenderButtonActive
                    ]}
                    onPress={() => setFilters({ ...filters, gender: 'female' })}
                  >
                    <Ionicons 
                      name="female" 
                      size={scale(24)} 
                      color={filters.gender === 'female' ? '#fff' : colors.text.secondary} 
                    />
                    <Text
                      style={[
                        styles.filterGenderButtonText,
                        filters.gender === 'female' && styles.filterGenderButtonTextActive
                      ]}
                    >
                      Kadın
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Apply Button */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterResetButton}
                onPress={() => {
                  setFilters({
                    minAge: 18,
                    maxAge: 99,
                    maxDistance: 100,
                    gender: 'all',
                  });
                }}
              >
                <Text style={styles.filterResetButtonText}>Sıfırla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterApplyButton}
                onPress={() => {
                  setShowFilters(false);
                  setCurrentIndex(0);
                  loadData();
                }}
              >
                <Text style={styles.filterApplyButtonText}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMatchesList = () => {
    const currentList = activeTab === 'matches' ? matches : likesReceived;
    
    if (currentList.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons 
            name={activeTab === 'matches' ? 'heart-broken' : 'heart-off'} 
            size={scale(80)} 
            color={colors.text.tertiary} 
          />
          <Text style={styles.emptyStateText}>
            {activeTab === 'matches' 
              ? 'Henüz eşleşmen yok' 
              : 'Henüz kimse seni beğenmemiş'}
          </Text>
          <Text style={styles.emptyStateSubText}>
            İnsanları beğenmeye başla!
          </Text>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {currentList.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.listItem}
            onPress={() => {
              // Navigate to user profile or chat
              Alert.alert('Profil', `${user.name} profili - Yakında!`);
            }}
          >
            <Image
              source={{ 
                uri: user.profilePicture || 'https://via.placeholder.com/100?text=No+Photo' 
              }}
              style={styles.listItemImage}
            />
            <View style={styles.listItemInfo}>
              <Text style={styles.listItemName}>
                {user.name || `${user.firstName} ${user.lastName}`}
                {user.age && `, ${user.age}`}
              </Text>
              <Text style={styles.listItemDate}>
                {new Date(user.matchedAt || user.likedAt).toLocaleDateString('tr-TR')}
              </Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={scale(24)} 
              color={colors.text.tertiary} 
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(24)} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Eşleşmeler</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options" size={scale(24)} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'suggestions' ? renderSwipeCards() : renderMatchesList()}
      </View>

      {/* Action Buttons */}
      {renderActionButtons()}

      {/* Match Animation */}
      {renderMatchAnimation()}

      {/* User Detail Modal */}
      {renderUserDetailModal()}

      {/* Filters Modal */}
      {renderFiltersModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: scaleFont(16),
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(16),
    backgroundColor: colors.surface,
    ...getPlatformShadow(2),
  },
  backButton: {
    padding: scale(8),
  },
  headerTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  filterButton: {
    padding: scale(8),
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: getResponsivePadding(10),
    paddingVertical: verticalScale(8),
    ...getPlatformShadow(1),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    marginHorizontal: scale(4),
    position: 'relative',
  },
  activeTab: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: colors.text.tertiary,
    marginLeft: scale(6),
  },
  activeTabText: {
    color: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
    backgroundColor: colors.primary,
    borderRadius: scale(10),
    minWidth: scale(20),
    height: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(6),
  },
  badgeText: {
    fontSize: scaleFont(11),
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingTop: verticalScale(20),
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: scale(20),
    backgroundColor: colors.surface,
    ...getPlatformShadow(8),
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    justifyContent: 'flex-end',
    padding: getResponsivePadding(20),
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scaleFont(28),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: verticalScale(8),
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: scaleFont(14),
    color: '#fff',
    marginLeft: scale(4),
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
  },
  activeDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#fff',
    marginRight: scale(6),
  },
  activeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#fff',
  },
  likeStamp: {
    position: 'absolute',
    top: scale(50),
    left: scale(30),
    transform: [{ rotate: '-20deg' }],
    borderWidth: 4,
    borderColor: '#4CAF50',
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(10),
  },
  nopeStamp: {
    position: 'absolute',
    top: scale(50),
    right: scale(30),
    transform: [{ rotate: '20deg' }],
    borderWidth: 4,
    borderColor: '#FF6B6B',
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(10),
  },
  stampText: {
    fontSize: scaleFont(32),
    fontWeight: 'bold',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(20),
    paddingHorizontal: getResponsivePadding(40),
  },
  actionButton: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: scale(12),
    ...getPlatformShadow(4),
  },
  passButton: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  likeButton: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  superLikeButton: {
    borderWidth: 2,
    borderColor: '#00D4FF',
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
  },
  noMoreCards: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(40),
  },
  noMoreCardsText: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: verticalScale(20),
    textAlign: 'center',
  },
  noMoreCardsSubText: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
    marginTop: verticalScale(10),
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    borderRadius: scale(25),
    marginTop: verticalScale(20),
  },
  refreshButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#fff',
    marginLeft: scale(8),
  },
  matchAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  matchAnimationGradient: {
    width: screenWidth * 0.85,
    paddingVertical: verticalScale(60),
    paddingHorizontal: getResponsivePadding(40),
    borderRadius: scale(25),
    alignItems: 'center',
  },
  matchAnimationTitle: {
    fontSize: scaleFont(36),
    fontWeight: 'bold',
    color: '#fff',
    marginTop: verticalScale(20),
    textAlign: 'center',
  },
  matchAnimationText: {
    fontSize: scaleFont(18),
    color: '#fff',
    marginTop: verticalScale(12),
    textAlign: 'center',
  },
  matchAnimationButton: {
    backgroundColor: '#fff',
    paddingHorizontal: scale(40),
    paddingVertical: scale(14),
    borderRadius: scale(25),
    marginTop: verticalScale(30),
  },
  matchAnimationButtonText: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: colors.primary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: getResponsivePadding(20),
    paddingBottom: verticalScale(20),
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: getResponsivePadding(16),
    borderRadius: scale(16),
    marginBottom: verticalScale(12),
    ...getPlatformShadow(2),
  },
  listItemImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: colors.border.light,
  },
  listItemInfo: {
    flex: 1,
    marginLeft: scale(16),
  },
  listItemName: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(4),
  },
  listItemDate: {
    fontSize: scaleFont(13),
    color: colors.text.tertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(40),
  },
  emptyStateText: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: verticalScale(20),
    textAlign: 'center',
  },
  emptyStateSubText: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    marginTop: verticalScale(10),
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalScroll: {
    flex: 1,
  },
  modalImage: {
    width: screenWidth,
    height: screenHeight * 0.6,
    backgroundColor: colors.border.light,
  },
  modalImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    justifyContent: 'flex-end',
    padding: getResponsivePadding(20),
  },
  modalName: {
    fontSize: scaleFont(32),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: verticalScale(10),
  },
  modalContent: {
    padding: getResponsivePadding(20),
    paddingBottom: verticalScale(100),
  },
  modalInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: scale(16),
    padding: getResponsivePadding(20),
    marginBottom: verticalScale(16),
    ...getPlatformShadow(2),
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalInfoColumn: {
    flexDirection: 'column',
  },
  modalInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  modalInfoText: {
    flex: 1,
    marginLeft: scale(16),
  },
  modalInfoTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: verticalScale(4),
  },
  modalInfoValue: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalBioText: {
    fontSize: scaleFont(15),
    color: colors.text.secondary,
    lineHeight: scaleFont(22),
  },
  activeIndicatorLarge: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDotLarge: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#4CAF50',
  },
  modalCloseButton: {
    position: 'absolute',
    top: verticalScale(50),
    right: getResponsivePadding(20),
    zIndex: 10,
  },
  modalActions: {
    position: 'absolute',
    bottom: verticalScale(40),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(40),
  },
  modalActionButton: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: scale(15),
    ...getPlatformShadow(6),
  },
  modalPassButton: {
    borderWidth: 3,
    borderColor: '#FF6B6B',
  },
  modalLikeButton: {
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  // Filter Modal Styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: scale(25),
    borderTopRightRadius: scale(25),
    maxHeight: screenHeight * 0.8,
    paddingTop: verticalScale(20),
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(20),
    paddingBottom: verticalScale(20),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterModalTitle: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  filterModalContent: {
    flex: 1,
    paddingHorizontal: getResponsivePadding(20),
    paddingTop: verticalScale(20),
  },
  filterSection: {
    marginBottom: verticalScale(30),
  },
  filterSectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(16),
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterInputContainer: {
    flex: 1,
  },
  filterInputLabel: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    marginBottom: verticalScale(8),
  },
  filterInput: {
    backgroundColor: colors.surface,
    borderRadius: scale(12),
    paddingVertical: verticalScale(16),
    paddingHorizontal: getResponsivePadding(20),
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterInputText: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    width: '100%',
  },
  filterRangeSeparator: {
    fontSize: scaleFont(24),
    color: colors.text.tertiary,
    marginHorizontal: scale(16),
  },
  filterDistanceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -scale(5),
  },
  filterDistanceButton: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.light,
    marginHorizontal: scale(5),
    marginBottom: verticalScale(10),
  },
  filterDistanceButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterDistanceButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterDistanceButtonTextActive: {
    color: '#fff',
  },
  filterGenderButtons: {
    flexDirection: 'row',
    marginHorizontal: -scale(5),
  },
  filterGenderButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.light,
    marginHorizontal: scale(5),
  },
  filterGenderButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterGenderButtonText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: verticalScale(8),
  },
  filterGenderButtonTextActive: {
    color: '#fff',
  },
  filterModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(20),
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  filterResetButton: {
    flex: 1,
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
    marginRight: scale(12),
  },
  filterResetButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterApplyButton: {
    flex: 2,
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  filterApplyButtonText: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#fff',
  },
});

