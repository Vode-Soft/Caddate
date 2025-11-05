import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  StatusBar,
  Platform,
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
} from '../utils/responsive';

export default function PaymentScreen({ route, navigation }) {
  const { plan } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const formatCardNumber = (text) => {
    // Sadece rakamları al
    const cleaned = text.replace(/\D/g, '');
    // 16 haneye sınırla
    const limited = cleaned.slice(0, 16);
    // 4'er haneli gruplara ayır
    const formatted = limited.replace(/(.{4})/g, '$1 ').trim();
    return formatted;
  };

  const formatExpiryDate = (text) => {
    // Sadece rakamları al
    const cleaned = text.replace(/\D/g, '');
    // 4 haneye sınırla
    const limited = cleaned.slice(0, 4);
    // MM/YY formatına çevir
    if (limited.length >= 2) {
      return limited.slice(0, 2) + '/' + limited.slice(2, 4);
    }
    return limited;
  };

  const handleCardNumberChange = (text) => {
    setCardNumber(formatCardNumber(text));
  };

  const handleExpiryChange = (text) => {
    setExpiryDate(formatExpiryDate(text));
  };

  const handlePayment = async () => {
    // Validasyon
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('Hata', 'Lütfen geçerli bir kart numarası girin.');
      return;
    }

    if (!cardName || cardName.length < 3) {
      Alert.alert('Hata', 'Lütfen kart üzerindeki ismi girin.');
      return;
    }

    if (!expiryDate || expiryDate.length < 5) {
      Alert.alert('Hata', 'Lütfen geçerli bir son kullanma tarihi girin (MM/YY).');
      return;
    }

    if (!cvv || cvv.length < 3) {
      Alert.alert('Hata', 'Lütfen CVV kodunu girin.');
      return;
    }

    try {
      setIsLoading(true);

      const token = await apiService.getStoredToken();
      if (!token) {
        Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        navigation.goBack();
        return;
      }

      apiService.setToken(token);

      // Transaction ID oluştur
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Plan fiyatını al
      let price;
      if (plan.originalPlan && plan.originalPlan.price) {
        price = parseFloat(plan.originalPlan.price);
      } else {
        // Fiyat string'den parse et (örn: "99.90₺")
        const priceStr = plan.price.replace('₺', '').replace(/\s/g, '').replace(',', '.');
        price = parseFloat(priceStr);
      }
      
      if (isNaN(price) || price <= 0) {
        throw new Error('Geçersiz plan fiyatı');
      }

      // Ödeme işlemini simüle et (gerçek ödeme gateway entegrasyonu burada yapılacak)
      // Şimdilik test modunda direkt abonelik oluştur
      console.log('Processing payment...', {
        planId: plan.id,
        amount: price,
        transactionId
      });

      // Abonelik oluştur
      const response = await apiService.createSubscription(
        plan.id,
        'credit_card', // Ödeme metodu
        transactionId,
        price
      );

      if (response.success) {
        Alert.alert(
          'Ödeme Başarılı! 🎉',
          `${plan.name} planına başarıyla abone oldunuz!\n\nPremium özellikler aktif.`,
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Abonelik durumunu güncellemek için callback
                if (route.params?.onPaymentSuccess) {
                  route.params.onPaymentSuccess();
                }
                // Subscription ekranına geri dön
                navigation.navigate('Subscription');
              }
            }
          ]
        );
      } else {
        throw new Error(response.message || 'Ödeme işlemi başarısız oldu');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Ödeme Hatası',
        error.message || 'Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.'
      );
    } finally {
      setIsLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Ödeme</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Plan Özeti */}
        <View style={styles.planSummary}>
          <Text style={styles.sectionTitle}>Abonelik Özeti</Text>
          <View style={styles.planCard}>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPeriod}>{plan.period}</Text>
            </View>
            <Text style={styles.planPrice}>{plan.price}</Text>
          </View>
        </View>

        {/* Kart Bilgileri */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Kart Bilgileri</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Kart Numarası</Text>
            <TextInput
              style={styles.input}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor={colors.text.tertiary}
              value={cardNumber}
              onChangeText={handleCardNumberChange}
              keyboardType="numeric"
              maxLength={19}
            />
            <Ionicons name="card" size={scale(20)} color={colors.text.secondary} style={styles.inputIcon} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Kart Üzerindeki İsim</Text>
            <TextInput
              style={styles.input}
              placeholder="AD SOYAD"
              placeholderTextColor={colors.text.tertiary}
              value={cardName}
              onChangeText={setCardName}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Son Kullanma Tarihi</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/YY"
                placeholderTextColor={colors.text.tertiary}
                value={expiryDate}
                onChangeText={handleExpiryChange}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.inputLabel}>CVV</Text>
              <TextInput
                style={styles.input}
                placeholder="000"
                placeholderTextColor={colors.text.tertiary}
                value={cvv}
                onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, 3))}
                keyboardType="numeric"
                maxLength={3}
                secureTextEntry
              />
            </View>
          </View>
        </View>

        {/* Güvenlik Bilgisi */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={scale(20)} color={colors.success} />
          <Text style={styles.securityText}>
            Ödeme bilgileriniz güvenli şekilde işlenir. Kart bilgileriniz saklanmaz.
          </Text>
        </View>

        {/* Ödeme Butonu */}
        <TouchableOpacity
          style={[styles.payButton, isLoading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.secondary, colors.primary]}
            style={styles.payButtonGradient}
          >
            <Text style={styles.payButtonText}>
              {isLoading ? 'İşleniyor...' : `${plan.price} Öde`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Test Modu Uyarısı */}
        <View style={styles.testModeWarning}>
          <Ionicons name="information-circle" size={scale(16)} color={colors.warning} />
          <Text style={styles.testModeText}>
            Test modu: Ödeme işlemi simüle edilir, gerçek para çekilmez.
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
  planSummary: {
    marginTop: verticalScale(25),
    marginBottom: verticalScale(20),
  },
  sectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: verticalScale(12),
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: scale(16),
    padding: getResponsivePadding(),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: verticalScale(4),
  },
  planPeriod: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
  },
  planPrice: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: colors.primary,
  },
  paymentSection: {
    marginTop: verticalScale(10),
  },
  inputContainer: {
    marginBottom: verticalScale(16),
    position: 'relative',
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: verticalScale(8),
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    fontSize: scaleFont(16),
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingRight: scale(50),
  },
  inputIcon: {
    position: 'absolute',
    right: scale(16),
    top: scale(42),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: getResponsivePadding(),
    borderRadius: scale(12),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(20),
  },
  securityText: {
    fontSize: scaleFont(13),
    color: colors.text.secondary,
    marginLeft: scale(8),
    flex: 1,
  },
  payButton: {
    borderRadius: scale(12),
    overflow: 'hidden',
    marginTop: verticalScale(10),
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonGradient: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: 'white',
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  testModeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(20),
    padding: scale(12),
    backgroundColor: colors.warning + '20',
    borderRadius: scale(8),
  },
  testModeText: {
    fontSize: scaleFont(12),
    color: colors.warning,
    marginLeft: scale(8),
    flex: 1,
  },
});

