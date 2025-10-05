import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
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

export default function AboutScreen({ navigation }) {
  const appInfo = {
    name: 'Caddate',
    version: '1.0.0',
    build: '2025.01.15',
    description: 'Bağdat Caddesi\'nin sosyal uygulaması',
    developer: 'Caddate Team',
    website: 'https://www.caddate.com',
    email: 'info@caddate.com',
    privacyPolicy: 'https://www.caddate.com/privacy',
    termsOfService: 'https://www.caddate.com/terms'
  };

  const features = [
    {
      icon: 'location-outline',
      title: 'Konum Paylaşımı',
      description: 'Yakındaki kullanıcıları keşfedin'
    },
    {
      icon: 'chatbubbles-outline',
      title: 'Gerçek Zamanlı Mesajlaşma',
      description: 'Anlık mesajlaşma özelliği'
    },
    {
      icon: 'camera-outline',
      title: 'Fotoğraf Paylaşımı',
      description: 'Anılarınızı paylaşın'
    },
    {
      icon: 'people-outline',
      title: 'Sosyal Ağ',
      description: 'Yeni arkadaşlar edinin'
    },
    {
      icon: 'notifications-outline',
      title: 'Bildirimler',
      description: 'Önemli güncellemeleri kaçırmayın'
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Güvenlik',
      description: 'Verileriniz güvende'
    }
  ];

  const teamMembers = [
    {
      name: 'Kerim Yılmaz',
      role: 'Lead Developer',
      avatar: '👨‍💻'
    },
    {
      name: 'Caddate Team',
      role: 'UI/UX Designer',
      avatar: '🎨'
    },
    {
      name: 'Backend Team',
      role: 'Backend Developer',
      avatar: '⚙️'
    }
  ];

  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error('Link açılamadı:', err));
  };

  const renderFeature = (feature, index) => (
    <View key={index} style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={feature.icon} size={scale(24)} color={colors.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
      </View>
    </View>
  );

  const renderTeamMember = (member, index) => (
    <View key={index} style={styles.teamMember}>
      <Text style={styles.memberAvatar}>{member.avatar}</Text>
      <Text style={styles.memberName}>{member.name}</Text>
      <Text style={styles.memberRole}>{member.role}</Text>
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
        <Text style={styles.headerTitle}>Hakkında</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={styles.appInfoCard}>
          <View style={styles.appIcon}>
            <Ionicons name="location" size={scale(40)} color={colors.primary} />
          </View>
          <Text style={styles.appName}>{appInfo.name}</Text>
          <Text style={styles.appDescription}>{appInfo.description}</Text>
          <Text style={styles.appVersion}>Versiyon {appInfo.version}</Text>
          <Text style={styles.appBuild}>Build {appInfo.build}</Text>
        </View>

        {/* Features */}
        <Text style={styles.sectionTitle}>Özellikler</Text>
        <View style={styles.featuresContainer}>
          {features.map(renderFeature)}
        </View>

        {/* Team */}
        <Text style={styles.sectionTitle}>Geliştirici Ekibi</Text>
        <View style={styles.teamContainer}>
          {teamMembers.map(renderTeamMember)}
        </View>

        {/* Links */}
        <Text style={styles.sectionTitle}>Bağlantılar</Text>
        <View style={styles.linksContainer}>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => openLink(appInfo.website)}
          >
            <Ionicons name="globe-outline" size={scale(20)} color={colors.primary} />
            <Text style={styles.linkText}>Web Sitesi</Text>
            <Ionicons name="chevron-forward" size={scale(16)} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => openLink(`mailto:${appInfo.email}`)}
          >
            <Ionicons name="mail-outline" size={scale(20)} color={colors.primary} />
            <Text style={styles.linkText}>İletişim</Text>
            <Ionicons name="chevron-forward" size={scale(16)} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => openLink(appInfo.privacyPolicy)}
          >
            <Ionicons name="shield-outline" size={scale(20)} color={colors.primary} />
            <Text style={styles.linkText}>Gizlilik Politikası</Text>
            <Ionicons name="chevron-forward" size={scale(16)} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => openLink(appInfo.termsOfService)}
          >
            <Ionicons name="document-text-outline" size={scale(20)} color={colors.primary} />
            <Text style={styles.linkText}>Kullanım Şartları</Text>
            <Ionicons name="chevron-forward" size={scale(16)} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <View style={styles.copyrightContainer}>
          <Text style={styles.copyrightText}>
            © 2025 Caddate Team. Tüm hakları saklıdır.
          </Text>
          <Text style={styles.copyrightSubtext}>
            Bu uygulama Bağdat Caddesi sakinleri için özel olarak geliştirilmiştir.
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
  appInfoCard: {
    backgroundColor: 'white',
    borderRadius: scale(16),
    padding: getResponsivePadding(),
    alignItems: 'center',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(30),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  appIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(15),
  },
  appName: {
    fontSize: scaleFont(28),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: verticalScale(8),
  },
  appDescription: {
    fontSize: scaleFont(16),
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: verticalScale(15),
  },
  appVersion: {
    fontSize: scaleFont(14),
    color: colors.primary,
    fontWeight: '600',
  },
  appBuild: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
    marginTop: verticalScale(4),
  },
  sectionTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: verticalScale(15),
  },
  featuresContainer: {
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
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  featureIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: verticalScale(4),
  },
  featureDescription: {
    fontSize: scaleFont(14),
    color: colors.text.secondary,
  },
  teamContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  teamMember: {
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    fontSize: scale(32),
    marginBottom: verticalScale(8),
  },
  memberName: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: verticalScale(4),
  },
  memberRole: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
    textAlign: 'center',
  },
  linksContainer: {
    backgroundColor: 'white',
    borderRadius: scale(12),
    marginBottom: verticalScale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsivePadding(),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkText: {
    flex: 1,
    fontSize: scaleFont(16),
    color: colors.text.primary,
    marginLeft: scale(12),
  },
  copyrightContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(20),
    marginBottom: verticalScale(20),
  },
  copyrightText: {
    fontSize: scaleFont(12),
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  copyrightSubtext: {
    fontSize: scaleFont(11),
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: scaleFont(16),
  },
});
