import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  isLargeScreen,
  getBottomSafeArea
} from '../utils/responsive';

const { width: screenWidth } = require('react-native').Dimensions.get('window');
const bottomSafeArea = getBottomSafeArea();

const VehicleFormModal = ({ visible, vehicle, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    plate_number: '',
    brand: '',
    model: '',
    additional_info: '',
    photo: null
  });

  const [errors, setErrors] = useState({});

  // Form verilerini temizle
  useEffect(() => {
    if (visible) {
      if (vehicle) {
        setFormData({
          plate_number: vehicle.plate_number || '',
          brand: vehicle.brand || '',
          model: vehicle.model || '',
          additional_info: vehicle.additional_info || '',
          photo: vehicle.photo_url || null
        });
      } else {
        setFormData({
          plate_number: '',
          brand: '',
          model: '',
          additional_info: '',
          photo: null
        });
      }
      setErrors({});
    }
  }, [visible, vehicle]);

  // Form doğrulama
  const validateForm = () => {
    const newErrors = {};

    // Plaka numarası doğrulama
    if (!formData.plate_number.trim()) {
      newErrors.plate_number = 'Plaka numarası gerekli';
    } else {
      // Basit plaka doğrulaması - en az 6 karakter ve harf-rakam karışımı
      const plate = formData.plate_number.trim().toUpperCase();
      if (plate.length < 6 || plate.length > 12) {
        newErrors.plate_number = 'Plaka numarası 6-12 karakter arasında olmalıdır';
      } else if (!/^[A-ZÇĞIİÖŞÜ0-9\s]+$/.test(plate)) {
        newErrors.plate_number = 'Plaka numarası sadece harf, rakam ve boşluk içerebilir';
      }
    }

    // Marka doğrulama
    if (!formData.brand.trim()) {
      newErrors.brand = 'Marka gerekli';
    } else if (formData.brand.trim().length < 2) {
      newErrors.brand = 'Marka en az 2 karakter olmalıdır';
    }

    // Model doğrulama
    if (!formData.model.trim()) {
      newErrors.model = 'Model gerekli';
    } else if (formData.model.trim().length < 2) {
      newErrors.model = 'Model en az 2 karakter olmalıdır';
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fotoğraf seç
  const pickImage = async () => {
    try {
      // İzin kontrolü
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişim izni gereklidir.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({
          ...formData,
          photo: result.assets[0]
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  // Kamera ile fotoğraf çek
  const takePhoto = async () => {
    try {
      // İzin kontrolü
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera erişim izni gereklidir.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({
          ...formData,
          photo: result.assets[0]
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    }
  };

  // Fotoğraf seçenekleri göster
  const showImageOptions = () => {
    Alert.alert(
      'Fotoğraf Seç',
      'Fotoğraf eklemek için bir seçenek belirleyin',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Galeri', onPress: pickImage },
        { text: 'Kamera', onPress: takePhoto }
      ]
    );
  };

  // Fotoğrafı kaldır
  const removePhoto = () => {
    setFormData({
      ...formData,
      photo: null
    });
  };

  // Form gönder
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Plaka numarasını büyük harfe çevir ve düzenle
    const cleanedData = {
      ...formData,
      plate_number: formData.plate_number.toUpperCase().replace(/\s+/g, ' ')
    };

    onSave(cleanedData);
  };


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {vehicle ? 'Araç Bilgisi Düzenle' : 'Yeni Araç Ekle'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Plaka Numarası */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="car" size={16} color={colors.text.secondary} />
                <Text style={styles.label}>Plaka Numarası *</Text>
              </View>
              <TextInput
                style={[styles.input, errors.plate_number && styles.inputError]}
                value={formData.plate_number}
                onChangeText={(text) => setFormData({...formData, plate_number: text})}
                placeholder="Örn: 34 ABC 123, 06 AB 1234"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="characters"
                maxLength={20}
              />
              {errors.plate_number && (
                <Text style={styles.errorText}>{errors.plate_number}</Text>
              )}
            </View>

            {/* Marka ve Model */}
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <View style={styles.labelContainer}>
                  <Ionicons name="business" size={16} color={colors.text.secondary} />
                  <Text style={styles.label}>Marka *</Text>
                </View>
                <TextInput
                  style={[styles.input, errors.brand && styles.inputError]}
                  value={formData.brand}
                  onChangeText={(text) => setFormData({...formData, brand: text})}
                  placeholder="Örn: Toyota"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="words"
                />
                {errors.brand && (
                  <Text style={styles.errorText}>{errors.brand}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <View style={styles.labelContainer}>
                  <Ionicons name="car-sport" size={16} color={colors.text.secondary} />
                  <Text style={styles.label}>Model *</Text>
                </View>
                <TextInput
                  style={[styles.input, errors.model && styles.inputError]}
                  value={formData.model}
                  onChangeText={(text) => setFormData({...formData, model: text})}
                  placeholder="Örn: Corolla"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="words"
                />
                {errors.model && (
                  <Text style={styles.errorText}>{errors.model}</Text>
                )}
              </View>
            </View>


            {/* Ek Bilgiler */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="document-text" size={16} color={colors.text.secondary} />
                <Text style={styles.label}>Ek Bilgiler</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.additional_info}
                onChangeText={(text) => setFormData({...formData, additional_info: text})}
                placeholder="Araç hakkında ek bilgiler..."
                placeholderTextColor={colors.text.tertiary}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Araç Fotoğrafı */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="camera" size={16} color={colors.text.secondary} />
                <Text style={styles.label}>Araç Fotoğrafı</Text>
              </View>
              
              {formData.photo ? (
                <View style={styles.photoContainer}>
                  <Image 
                    source={{ uri: formData.photo.uri || formData.photo }} 
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={removePhoto}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addPhotoButton}
                  onPress={showImageOptions}
                >
                  <Ionicons name="camera-outline" size={32} color={colors.text.secondary} />
                  <Text style={styles.addPhotoText}>Fotoğraf Ekle</Text>
                  <Text style={styles.addPhotoSubtext}>Galeri veya kamera</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Butonlar */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: scale(20),
    width: screenWidth * 0.95,
    maxHeight: screenWidth * 1.2,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light + '30',
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  closeButton: {
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: colors.background,
  },
  formContainer: {
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(15),
    maxHeight: screenWidth * 0.8,
  },
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  label: {
    fontSize: scaleFont(13),
    fontWeight: '700',
    color: colors.text.secondary,
    marginLeft: scale(6),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: scale(12),
    paddingHorizontal: getResponsivePadding(16),
    paddingVertical: verticalScale(14),
    fontSize: scaleFont(15),
    backgroundColor: colors.background,
    color: colors.text.primary,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  textArea: {
    height: verticalScale(80),
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: scaleFont(12),
    color: colors.error,
    marginTop: verticalScale(4),
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(15),
    borderTopWidth: 1,
    borderTopColor: colors.border.light + '30',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsivePadding(20),
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    flex: 1,
    marginHorizontal: scale(4),
  },
  saveButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border.light,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(15),
    fontWeight: '700',
    marginLeft: scale(8),
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: scaleFont(15),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  // Fotoğraf stilleri
  photoContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  photoPreview: {
    width: scale(200),
    height: verticalScale(150),
    borderRadius: scale(12),
    backgroundColor: colors.background,
  },
  removePhotoButton: {
    position: 'absolute',
    top: verticalScale(8),
    right: scale(8),
    backgroundColor: colors.surface,
    borderRadius: scale(12),
    padding: scale(4),
  },
  addPhotoButton: {
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    borderRadius: scale(12),
    paddingVertical: verticalScale(40),
    paddingHorizontal: getResponsivePadding(20),
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  addPhotoText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: verticalScale(8),
  },
  addPhotoSubtext: {
    fontSize: scaleFont(12),
    color: colors.text.tertiary,
    marginTop: verticalScale(4),
  },
});

export default VehicleFormModal;
