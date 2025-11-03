import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import apiService from '../services/api';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SubscriptionScreen({ navigation }) {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [userSubscription, setUserSubscription] = useState(null);

  const getFeaturesFromPlan = (features) => {
    const featureNames = {
      'unlimited_messages': 'Sınırsız Mesaj',
      'see_who_liked': 'Beğenileri Görme',
      'rewind': 'Geri Alma',
      'passport': 'Passport (Konum Değiştirme)',
      'profile_boost': 'Profil Boost',
      'hide_ads': 'Reklamları Gizle',
      'unlimited_swipes': 'Sınırsız Kaydırma',
      'priority_support': 'Öncelikli Destek',
      'message_before_match': 'Eşleşmeden Önce Mesaj',
      'priority_likes': 'Öncelikli Beğeniler',
      'exclusive_badge': 'Özel Rozet'
    };

    return Object.entries(features)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => featureNames[key] || key)
      .slice(0, 8); // Maksimum 8 özellik göster
  };

  const getCurrentPlanInfo = () => {
    const planId = userSubscription?.plan_id || currentPlan;
    const plan = plans.find(p => {
      // Plan ID'leri farklı tiplerde olabilir (string/integer)
      return p.id === planId || p.id === parseInt(planId) || parseInt(p.id) === planId;
    });
    return {
      name: userSubscription?.name_tr || plan?.name || 'Ücretsiz',
      color: plan?.color || colors.primary
    };
  };

  useEffect(() => {
    loadPlans();
    loadUserSubscription();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      console.log('Loading plans...');
      const response = await apiService.getSubscriptionPlans();
      console.log('Plans response:', response);
      
      if (response && response.success && response.plans && response.plans.length > 0) {
        // Sadece fiyatı 0'dan büyük olan planları göster (ücretsiz planları hariç tut)
        const paidPlans = response.plans.filter(plan => parseFloat(plan.price) > 0);
        
        if (paidPlans.length === 0) {
          console.warn('⚠️  Tüm planlar ücretsiz, tüm planlar gösteriliyor');
          // Eğer tüm planlar ücretsizse, sadece premium olanları göster
          const premiumPlans = response.plans.filter(plan => 
            plan.name && (plan.name.toLowerCase().includes('premium') || plan.name_tr?.toLowerCase().includes('premium'))
          );
          
          if (premiumPlans.length > 0) {
            const formattedPlans = premiumPlans.map((plan, index) => ({
              id: plan.id,
              name: plan.name_tr || plan.name,
              price: `${parseFloat(plan.price).toFixed(2)}₺`,
              period: plan.duration_days === 30 ? 'Aylık' : plan.duration_days === 90 ? '3 Aylık' : plan.duration_days === 180 ? '6 Aylık' : plan.duration_days === 365 ? 'Yıllık' : 'Süresiz',
              features: getFeaturesFromPlan(plan.features || {}),
              color: index === 0 ? colors.secondary : index === 1 ? colors.primary : colors.accent,
              popular: plan.is_popular || false,
              durationDays: plan.duration_days,
              originalPlan: plan
            }));
            console.log('Formatted premium plans:', formattedPlans);
            setPlans(formattedPlans);
            return;
          }
        }
        
        const formattedPlans = paidPlans.map((plan, index) => ({
          id: plan.id,
          name: plan.name_tr || plan.name,
          price: `${parseFloat(plan.price).toFixed(2)}₺`,
          period: plan.duration_days === 30 ? 'Aylık' : plan.duration_days === 90 ? '3 Aylık' : plan.duration_days === 180 ? '6 Aylık' : plan.duration_days === 365 ? 'Yıllık' : 'Süresiz',
          features: getFeaturesFromPlan(plan.features || {}),
          color: index === 0 ? colors.secondary : index === 1 ? colors.primary : colors.accent,
          popular: plan.is_popular || false,
          durationDays: plan.duration_days,
          originalPlan: plan
        }));
        console.log('Formatted paid plans:', formattedPlans);
        setPlans(formattedPlans);
      } else {
        console.warn('No plans found or empty response:', response);
        // Fallback plans - eğer hiç plan yoksa
        setPlans([
          {
            id: 'free',
            name: 'Ücretsiz',
            price: '0₺',
            period: 'Süresiz',
            features: [
              'Temel profil özellikleri',
              'Sınırlı fotoğraf paylaşımı',
              'Temel mesajlaşma',
              'Harita görüntüleme'
            ],
            color: colors.primary,
            popular: false
          }
        ]);
        
        // Hata mesajı göster
        if (response && response.message) {
          Alert.alert('Bilgi', response.message || 'Planlar yüklenemedi. Lütfen daha sonra tekrar deneyin.');
        }
      }
    } catch (error) {
      console.error('Load plans error:', error);
      // Fallback plans
      setPlans([
        {
          id: 'free',
          name: 'Ücretsiz',
          price: '0₺',
          period: 'Süresiz',
          features: [
            'Temel profil özellikleri',
            'Sınırlı fotoğraf paylaşımı',
            'Temel mesajlaşma',
            'Harita görüntüleme'
          ],
          color: colors.primary,
          popular: false
        }
      ]);
      Alert.alert('Hata', 'Planlar yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserSubscription = async () => {
    try {
      const token = await apiService.getStoredToken();
      if (!token) return;
      
      apiService.setToken(token);
      const response = await apiService.getMySubscription();
      if (response.success) {
        setUserSubscription(response.subscription);
        if (response.subscription) {
          setCurrentPlan(response.subscription.plan_id);
        }
      }
    } catch (error) {
      console.error('Load user subscription error:', error);
    }
  };

  const handleUpgrade = async (planId) => {
    // Plan ID'yi integer'a çevir (backend'den integer gelebilir)
    const planIdInt = parseInt(planId);
    
    // Mevcut plan kontrolü
    const currentPlanId = userSubscription?.plan_id || currentPlan;
    if (planIdInt === currentPlanId || planId === currentPlanId) {
      Alert.alert('Bilgi', 'Bu plan zaten aktif.');
      return;
    }

    const selectedPlan = plans.find(p => p.id === planId || p.id === planIdInt);
    if (!selectedPlan) {
      Alert.alert('Hata', 'Plan bulunamadı.');
      return;
    }

    // Satın alma onayı
    Alert.alert(
      'Abonelik Satın Al',
      `${selectedPlan.name} planını ${selectedPlan.price}/${selectedPlan.period} fiyatına satın almak istiyor musunuz?`,
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Satın Al',
          style: 'default',
          onPress: async () => {
            await processPurchase(planIdInt || planId);
          }
        }
      ]
    );
  };

  const processPurchase = async (planId) => {
    try {
      setIsLoading(true);
      
      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      apiService.setToken(token);

      // Plan bilgilerini al
      const selectedPlan = plans.find(p => p.id === planId);
      if (!selectedPlan) {
        throw new Error('Plan bulunamadı');
      }

      // Abonelik oluştur
      const response = await apiService.createSubscription(
        planId,
        'test', // Test ödeme metodu (gerçek ödeme gateway'i entegre edildiğinde değiştirilecek)
        null, // transactionId otomatik oluşturulacak
        null  // amountPaid plan fiyatından alınacak
      );

      if (response.success) {
        // Abonelik bilgilerini yenile
        await loadUserSubscription();
        setCurrentPlan(planId);

        Alert.alert(
          'Başarılı! 🎉', 
          `${selectedPlan.name} planına başarıyla yükseltildiniz!\n\nPremium özellikler aktif.`,
          [
            {
              text: 'Tamam',
              onPress: () => {
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        throw new Error(response.message || 'Abonelik oluşturulamadı');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Hata', 
        error.message || 'Satın alma işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlanCard = (plan) => (
    <View key={plan.id} style={[styles.planCard, plan.popular && styles.popularCard]}>
      {plan.popular && (
        <LinearGradient
          colors={[colors.secondary, colors.primary]}
          style={styles.popularBadge}
        >
          <Ionicons name="star" size={scale(14)} color="#FFFFFF" />
          <Text style={styles.popularText}>En Popüler</Text>
        </LinearGradient>
      )}
      
      <View style={styles.planHeader}>
        <View style={styles.planIconContainer}>
          <LinearGradient
            colors={plan.popular 
              ? [colors.secondary, colors.primary] 
              : [plan.color + '40', plan.color + '20']
            }
            style={styles.planIconBackground}
          >
            <Ionicons 
              name={plan.id === 'vip' ? 'diamond' : plan.id === 'premium' ? 'star' : 'checkmark-circle'} 
              size={scale(28)} 
              color={plan.color} 
            />
          </LinearGradient>
        </View>
        <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={[styles.price, { color: plan.color }]}>{plan.price}</Text>
          <Text style={styles.period}>/{plan.period}</Text>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="checkmark" size={scale(14)} color={colors.success} />
            </View>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.upgradeButton,
          currentPlan === plan.id && styles.currentPlanButton
        ]}
        onPress={() => handleUpgrade(plan.id)}
        disabled={isLoading || 
          currentPlan === plan.id || 
          parseInt(currentPlan) === plan.id ||
          (userSubscription && (userSubscription.plan_id === plan.id || parseInt(userSubscription.plan_id) === plan.id))}
        activeOpacity={0.8}
      >
        {(() => {
          const isCurrentPlan = currentPlan === plan.id || 
                                parseInt(currentPlan) === plan.id ||
                                (userSubscription && (userSubscription.plan_id === plan.id || parseInt(userSubscription.plan_id) === plan.id));
          
          if (!isCurrentPlan) {
            return (
              <LinearGradient
                colors={plan.popular 
                  ? [colors.secondary, colors.primary] 
                  : [plan.color, plan.color + 'DD']
                }
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            );
          }
          return null;
        })()}
        <Text style={styles.upgradeButtonText}>
          {currentPlan === plan.id || 
           parseInt(currentPlan) === plan.id ||
           (userSubscription && (userSubscription.plan_id === plan.id || parseInt(userSubscription.plan_id) === plan.id)) 
            ? 'Mevcut Plan' 
            : isLoading 
              ? 'İşleniyor...' 
              : 'Satın Al'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={scale(24)} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonelik Planları</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      {isLoading && plans.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Planlar yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.currentPlanContainer}>
            <Text style={styles.currentPlanTitle}>Mevcut Planınız</Text>
            <LinearGradient
              colors={[colors.surface, colors.darkGray]}
              style={styles.currentPlanCard}
            >
              <View style={styles.currentPlanIconContainer}>
                <LinearGradient
                  colors={[getCurrentPlanInfo().color + '40', getCurrentPlanInfo().color + '20']}
                  style={styles.currentPlanIconBackground}
                >
                  <Ionicons 
                    name="diamond" 
                    size={scale(28)} 
                    color={getCurrentPlanInfo().color} 
                  />
                </LinearGradient>
              </View>
              <View style={styles.currentPlanInfo}>
                <Text style={styles.currentPlanName}>{getCurrentPlanInfo().name}</Text>
                <Text style={styles.currentPlanStatus}>
                  {userSubscription ? 'Aktif' : 'Ücretsiz'}
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mevcut Planlar</Text>
            <Text style={styles.sectionSubtitle}>İhtiyacınıza en uygun planı seçin</Text>
          </View>
          
          {plans.length > 0 ? plans.map(renderPlanCard) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={scale(48)} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>Planlar yükleniyor...</Text>
            </View>
          )}

        <View style={styles.infoContainer}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="information-circle" size={scale(24)} color={colors.info} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Önemli Bilgiler</Text>
            <Text style={styles.infoText}>
              • Tüm planlar otomatik yenilenir{'\n'}
              • İstediğiniz zaman iptal edebilirsiniz{'\n'}
              • Ödeme güvenli şekilde işlenir
            </Text>
          </View>
        </View>
        </ScrollView>
      )}
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
    paddingHorizontal: getResponsivePadding(),
    paddingVertical: verticalScale(15),
    paddingTop: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(15),
  },
  backButton: {
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: scale(40),
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: getResponsivePadding(),
    paddingBottom: verticalScale(30),
  },
  currentPlanContainer: {
    marginTop: verticalScale(25),
    marginBottom: verticalScale(30),
  },
  currentPlanTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: verticalScale(12),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentPlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsivePadding(),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  currentPlanIconContainer: {
    marginRight: scale(16),
  },
  currentPlanIconBackground: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanName: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: verticalScale(4),
  },
  currentPlanStatus: {
    fontSize: scaleFont(12),
    color: colors.success,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: verticalScale(24),
  },
  sectionTitle: {
    fontSize: scaleFont(26),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: verticalScale(6),
  },
  sectionSubtitle: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    padding: getResponsivePadding(),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'visible',
  },
  popularCard: {
    borderWidth: 2,
    borderColor: colors.secondary,
    shadowColor: colors.secondary + '80',
    shadowOpacity: 0.5,
  },
  popularBadge: {
    position: 'absolute',
    top: -scale(12),
    right: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    zIndex: 10,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  popularText: {
    color: 'white',
    fontSize: scaleFont(12),
    fontWeight: 'bold',
    marginLeft: scale(4),
    letterSpacing: 0.5,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
    marginTop: verticalScale(8),
  },
  planIconContainer: {
    marginBottom: verticalScale(12),
  },
  planIconBackground: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  planName: {
    fontSize: scaleFont(28),
    fontWeight: 'bold',
    marginBottom: verticalScale(8),
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: scaleFont(36),
    fontWeight: 'bold',
  },
  period: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
    marginLeft: scale(4),
    fontWeight: '500',
  },
  featuresContainer: {
    marginBottom: verticalScale(24),
    paddingTop: verticalScale(8),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  featureIconContainer: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  featureText: {
    fontSize: scaleFont(15),
    color: colors.text.primary,
    flex: 1,
    lineHeight: scaleFont(22),
  },
  upgradeButton: {
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  currentPlanButton: {
    backgroundColor: colors.darkGray,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: getResponsivePadding(),
    borderRadius: scale(16),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: colors.info + '40',
  },
  infoIconContainer: {
    marginRight: scale(12),
    marginTop: scale(2),
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: colors.info,
    marginBottom: verticalScale(8),
  },
  infoText: {
    fontSize: scaleFont(13),
    color: colors.text.secondary,
    lineHeight: scaleFont(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(100),
  },
  loadingText: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
    marginTop: verticalScale(16),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(60),
  },
  emptyText: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
    marginTop: verticalScale(16),
  },
});
