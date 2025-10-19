import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';
import { colors } from '../constants/colors';
import Constants from 'expo-constants';
import { 
  scale, 
  verticalScale, 
  scaleFont, 
  getResponsivePadding, 
  isIOS,
  isAndroid,
  isTablet,
  isSmallScreen
} from '../utils/responsive';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Email gönder, 2: Kod doğrula, 3: Yeni şifre
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Hata', 'Lütfen email adresinizi giriniz');
      return;
    }

    // Email formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Hata', 'Geçerli bir email adresi giriniz');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.sendPasswordResetCode(email);
      
      if (response.success) {
        Alert.alert('Başarılı', response.message);
        setStep(2);
      } else {
        Alert.alert('Hata', response.message);
      }
    } catch (error) {
      console.error('Send password reset code error:', error);
      Alert.alert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('Hata', 'Lütfen doğrulama kodunu giriniz');
      return;
    }

    if (verificationCode.length !== 6) {
      Alert.alert('Hata', 'Doğrulama kodu 6 haneli olmalıdır');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.verifyPasswordResetCode(email, verificationCode);
      
      if (response.success) {
        Alert.alert('Başarılı', response.message);
        setStep(3);
      } else {
        Alert.alert('Hata', response.message);
      }
    } catch (error) {
      console.error('Verify password reset code error:', error);
      Alert.alert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.resetPassword(email, verificationCode, newPassword);
      
      if (response.success) {
        Alert.alert(
          'Başarılı', 
          'Şifreniz başarıyla sıfırlandı. Giriş yapabilirsiniz.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert('Hata', response.message);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="lock-closed" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Şifremi Unuttum</Text>
        <Text style={styles.subtitle}>
          Email adresinizi girin, size şifre sıfırlama kodu gönderelim
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="E-posta adresiniz"
            placeholderTextColor={colors.text.tertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSendCode}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Gönderiliyor...' : 'Kod Gönder'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="keypad" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Doğrulama Kodu</Text>
        <Text style={styles.subtitle}>
          {email} adresine gönderilen 6 haneli kodu girin
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="keypad" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="6 haneli doğrulama kodu"
            placeholderTextColor={colors.text.tertiary}
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleVerifyCode}
          disabled={isLoading || verificationCode.length !== 6}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Doğrulanıyor...' : 'Doğrula'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep(1)}
        >
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Yeni Şifre</Text>
        <Text style={styles.subtitle}>
          Yeni şifrenizi belirleyin
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Yeni şifre"
            placeholderTextColor={colors.text.tertiary}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şifre tekrar"
            placeholderTextColor={colors.text.tertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={20}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Şifre güçlülük göstergesi */}
        {newPassword.length > 0 && (
          <View style={styles.passwordStrengthContainer}>
            <Text style={styles.passwordStrengthText}>
              Şifre gücü: {
                newPassword.length < 6 ? 'Zayıf' :
                newPassword.length < 8 ? 'Orta' : 'Güçlü'
              }
            </Text>
            <View style={styles.passwordStrengthBar}>
              <View style={[
                styles.passwordStrengthFill,
                {
                  width: `${Math.min((newPassword.length / 8) * 100, 100)}%`,
                  backgroundColor: newPassword.length < 6 ? '#ff4444' :
                                 newPassword.length < 8 ? '#ffaa00' : '#00aa44'
                }
              ]} />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep(2)}
        >
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 20,
    height: 50,
  },
  inputIcon: {
    marginRight: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  eyeIcon: {
    padding: 5,
  },
  submitButton: {
    backgroundColor: colors.text.primary,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.shadow.light,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
  },
  passwordStrengthContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  passwordStrengthText: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 5,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
});
