import React, { useState } from 'react';
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
  TextInput,
  Linking,
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

export default function HelpSupportScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const helpCategories = [
    {
      id: 'account',
      title: 'Hesap Sorunları',
      icon: 'person-circle-outline',
      color: colors.primary,
      faqs: [
        {
          question: 'Hesabımı nasıl silerim?',
          answer: 'Profil ayarlarından "Hesabı Sil" seçeneğini kullanabilirsiniz. Bu işlem geri alınamaz.'
        },
        {
          question: 'Şifremi unuttum, ne yapmalıyım?',
          answer: 'Giriş ekranında "Şifremi Unuttum" linkine tıklayarak email adresinize şifre sıfırlama linki gönderebiliriz.'
        },
        {
          question: 'Email adresimi nasıl değiştiririm?',
          answer: 'Güvenlik ayarlarından email adresinizi güncelleyebilirsiniz. Yeni email adresinizi doğrulamanız gerekecek.'
        }
      ]
    },
    {
      id: 'technical',
      title: 'Teknik Sorunlar',
      icon: 'settings-outline',
      color: colors.secondary,
      faqs: [
        {
          question: 'Uygulama çöküyor, ne yapmalıyım?',
          answer: 'Uygulamayı kapatıp yeniden açmayı deneyin. Sorun devam ederse cihazınızı yeniden başlatın.'
        },
        {
          question: 'Fotoğraflarım yüklenmiyor',
          answer: 'İnternet bağlantınızı kontrol edin. Fotoğraf boyutunun 10MB\'dan küçük olduğundan emin olun.'
        },
        {
          question: 'Konumum görünmüyor',
          answer: 'Cihazınızın konum izinlerini kontrol edin ve konum servislerinin açık olduğundan emin olun.'
        }
      ]
    },
    {
      id: 'privacy',
      title: 'Gizlilik ve Güvenlik',
      icon: 'shield-checkmark-outline',
      color: colors.accent,
      faqs: [
        {
          question: 'Verilerim güvende mi?',
          answer: 'Evet, tüm verileriniz şifrelenerek saklanır ve üçüncü taraflarla paylaşılmaz.'
        },
        {
          question: 'Profilimi kimler görebilir?',
          answer: 'Profil görünürlük ayarlarınızdan kimlerin profilinizi görebileceğini belirleyebilirsiniz.'
        },
        {
          question: 'Rahatsız edici kullanıcıları nasıl engellerim?',
          answer: 'Kullanıcının profilinden "Engelle" seçeneğini kullanabilirsiniz.'
        }
      ]
    },
    {
      id: 'features',
      title: 'Özellikler',
      icon: 'star-outline',
      color: colors.info,
      faqs: [
        {
          question: 'Premium özellikler nelerdir?',
          answer: 'Premium üyelik ile sınırsız fotoğraf paylaşımı, gelişmiş mesajlaşma ve özel temalar kullanabilirsiniz.'
        },
        {
          question: 'Nasıl arkadaş ekleyebilirim?',
          answer: 'Harita ekranından yakındaki kullanıcıları görebilir ve arkadaş isteği gönderebilirsiniz.'
        },
        {
          question: 'Mesajlarım silinir mi?',
          answer: 'Mesajlarınız cihazınızda saklanır. Uygulamayı silerseniz mesajlar da silinir.'
        }
      ]
    }
  ];

  const contactMethods = [
    {
      id: 'email',
      title: 'Email Desteği',
      subtitle: 'destek@caddate.com',
      icon: 'mail-outline',
      color: colors.primary,
      action: () => Linking.openURL('mailto:destek@caddate.com?subject=Caddate Destek Talebi')
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Desteği',
      subtitle: '+90 555 123 45 67',
      icon: 'logo-whatsapp',
      color: colors.success,
      action: () => Linking.openURL('https://wa.me/905551234567?text=Merhaba, Caddate uygulaması hakkında yardıma ihtiyacım var.')
    },
    {
      id: 'website',
      title: 'Web Sitesi',
      subtitle: 'www.caddate.com',
      icon: 'globe-outline',
      color: colors.info,
      action: () => Linking.openURL('https://www.caddate.com')
    }
  ];

  const handleSubmitSupport = async () => {
    if (!selectedCategory || !message.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir kategori seçin ve mesajınızı yazın.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simüle edilmiş destek talebi gönderme
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Başarılı!', 
        'Destek talebiniz başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              setMessage('');
              setSelectedCategory(null);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Hata', 'Destek talebi gönderilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFAQItem = (faq, index) => (
    <View key={index} style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{faq.question}</Text>
      <Text style={styles.faqAnswer}>{faq.answer}</Text>
    </View>
  );

  const renderCategory = (category) => (
    <View key={category.id} style={styles.categoryCard}>
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
      >
        <View style={styles.categoryTitleContainer}>
          <Ionicons name={category.icon} size={scale(24)} color={category.color} />
          <Text style={styles.categoryTitle}>{category.title}</Text>
        </View>
        <Ionicons 
          name={selectedCategory === category.id ? "chevron-up" : "chevron-down"} 
          size={scale(20)} 
          color={colors.text.secondary} 
        />
      </TouchableOpacity>
      
      {selectedCategory === category.id && (
        <View style={styles.faqContainer}>
          {category.faqs.map(renderFAQItem)}
        </View>
      )}
    </View>
  );

  const renderContactMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={styles.contactCard}
      onPress={method.action}
    >
      <View style={[styles.contactIcon, { backgroundColor: method.color + '20' }]}>
        <Ionicons name={method.icon} size={scale(24)} color={method.color} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{method.title}</Text>
        <Text style={styles.contactSubtitle}>{method.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={scale(20)} color={colors.text.secondary} />
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Yardım & Destek</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Sık Sorulan Sorular</Text>
        {helpCategories.map(renderCategory)}

        <Text style={styles.sectionTitle}>İletişim Yöntemleri</Text>
        {contactMethods.map(renderContactMethod)}

        <View style={styles.supportForm}>
          <Text style={styles.sectionTitle}>Destek Talebi Gönder</Text>
          
          <View style={styles.categorySelector}>
            <Text style={styles.inputLabel}>Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {helpCategories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.selectedCategoryChip
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === category.id && styles.selectedCategoryChipText
                  ]}>
                    {category.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.inputLabel}>Mesajınız</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Sorununuzu detaylı bir şekilde açıklayın..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmitSupport}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Gönderiliyor...' : 'Destek Talebi Gönder'}
            </Text>
          </TouchableOpacity>
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
  sectionTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: verticalScale(20),
    marginBottom: verticalScale(15),
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: scale(12),
    marginBottom: verticalScale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: getResponsivePadding(),
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: scale(12),
  },
  faqContainer: {
    paddingHorizontal: getResponsivePadding(),
    paddingBottom: getResponsivePadding(),
  },
  faqItem: {
    marginBottom: verticalScale(15),
  },
  faqQuestion: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(5),
  },
  faqAnswer: {
    fontSize: scaleFont(13),
    color: colors.text.secondary,
    lineHeight: scaleFont(18),
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: getResponsivePadding(),
    borderRadius: scale(12),
    marginBottom: verticalScale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  contactTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
  },
  contactSubtitle: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
    marginTop: verticalScale(2),
  },
  supportForm: {
    backgroundColor: 'white',
    borderRadius: scale(12),
    padding: getResponsivePadding(),
    marginBottom: verticalScale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(8),
  },
  categorySelector: {
    marginBottom: verticalScale(20),
  },
  categoryChip: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: colors.background,
    marginRight: scale(8),
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
  },
  selectedCategoryChipText: {
    color: 'white',
  },
  messageContainer: {
    marginBottom: verticalScale(20),
  },
  messageInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: scale(8),
    padding: getResponsivePadding(),
    fontSize: scaleFont(14),
    color: colors.text.primary,
    minHeight: verticalScale(100),
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.text.secondary,
  },
  submitButtonText: {
    color: 'white',
    fontSize: scaleFont(16),
    fontWeight: 'bold',
  },
});
