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
  const [currentPlan, setCurrentPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'Ücretsiz',
      price: '0₺',
      period: 'Süresiz',
      features: [
        'Temel profil özellikleri',
        'Sınırlı fotoğraf paylaşımı (5/gün)',
        'Temel mesajlaşma',
        'Harita görüntüleme',
        'Temel bildirimler'
      ],
      color: colors.primary,
      popular: false
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '29₺',
      period: 'Aylık',
      features: [
        'Sınırsız fotoğraf paylaşımı',
        'Gelişmiş mesajlaşma özellikleri',
        'Gelişmiş harita özellikleri',
        'Öncelikli bildirimler',
        'Özel profil temaları',
        'Gelişmiş güvenlik',
        '7/24 destek'
      ],
      color: colors.secondary,
      popular: true
    },
    {
      id: 'vip',
      name: 'VIP',
      price: '99₺',
      period: 'Aylık',
      features: [
        'Tüm Premium özellikler',
        'Özel VIP rozeti',
        'Öncelikli müşteri desteği',
        'Özel etkinlik davetleri',
        'Gelişmiş analitikler',
        'Özel içerik erişimi',
        'Kişisel asistan'
      ],
      color: colors.accent,
      popular: false
    }
  ];

  const handleUpgrade = async (planId) => {
    if (planId === 'free') {
      Alert.alert('Bilgi', 'Zaten ücretsiz plandasınız.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simüle edilmiş ödeme işlemi
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Başarılı!', 
        `${plans.find(p => p.id === planId)?.name} planına başarıyla yükseltildiniz!`,
        [
          {
            text: 'Tamam',
            onPress: () => {
              setCurrentPlan(planId);
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Hata', 'Ödeme işlemi sırasında bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlanCard = (plan) => (
    <View key={plan.id} style={[styles.planCard, plan.popular && styles.popularCard]}>
      {plan.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>En Popüler</Text>
        </View>
      )}
      
      <View style={styles.planHeader}>
        <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{plan.price}</Text>
          <Text style={styles.period}>/{plan.period}</Text>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={scale(16)} color={colors.success} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.upgradeButton,
          { backgroundColor: plan.color },
          currentPlan === plan.id && styles.currentPlanButton
        ]}
        onPress={() => handleUpgrade(plan.id)}
        disabled={isLoading || currentPlan === plan.id}
      >
        <Text style={styles.upgradeButtonText}>
          {currentPlan === plan.id ? 'Mevcut Plan' : 'Yükselt'}
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.currentPlanContainer}>
          <Text style={styles.currentPlanTitle}>Mevcut Planınız</Text>
          <View style={styles.currentPlanCard}>
            <Ionicons 
              name="diamond" 
              size={scale(24)} 
              color={plans.find(p => p.id === currentPlan)?.color || colors.primary} 
            />
            <Text style={styles.currentPlanName}>
              {plans.find(p => p.id === currentPlan)?.name || 'Ücretsiz'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mevcut Planlar</Text>
        
        {plans.map(renderPlanCard)}

        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={scale(20)} color={colors.info} />
          <Text style={styles.infoText}>
            Tüm planlar otomatik yenilenir. İstediğiniz zaman iptal edebilirsiniz.
          </Text>
        </View>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: scale(40),
  },
  content: {
    flex: 1,
    paddingHorizontal: getResponsivePadding(),
  },
  currentPlanContainer: {
    marginTop: verticalScale(20),
    marginBottom: verticalScale(30),
  },
  currentPlanTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(10),
  },
  currentPlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: getResponsivePadding(),
    borderRadius: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPlanName: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: scale(12),
  },
  sectionTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: verticalScale(20),
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: scale(16),
    padding: getResponsivePadding(),
    marginBottom: verticalScale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  popularCard: {
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  popularBadge: {
    position: 'absolute',
    top: -scale(10),
    right: scale(20),
    backgroundColor: colors.secondary,
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  popularText: {
    color: 'white',
    fontSize: scaleFont(12),
    fontWeight: 'bold',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  planName: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    marginBottom: verticalScale(8),
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: scaleFont(32),
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  period: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
    marginLeft: scale(4),
  },
  featuresContainer: {
    marginBottom: verticalScale(20),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  featureText: {
    fontSize: scaleFont(14),
    color: colors.text.primary,
    marginLeft: scale(8),
    flex: 1,
  },
  upgradeButton: {
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  currentPlanButton: {
    backgroundColor: colors.text.secondary,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: scaleFont(16),
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '20',
    padding: getResponsivePadding(),
    borderRadius: scale(8),
    marginBottom: verticalScale(20),
  },
  infoText: {
    fontSize: scaleFont(12),
    color: colors.info,
    marginLeft: scale(8),
    flex: 1,
    lineHeight: scaleFont(16),
  },
});
