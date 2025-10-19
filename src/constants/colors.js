// Dark theme colors
const darkColors = {
  // Primary colors - Kırmızı tonları
  primary: '#DC2626', // Koyu kırmızı
  primaryAlpha: 'rgba(220, 38, 38, 0.1)',
  secondary: '#EF4444', // Orta kırmızı
  accent: '#F87171', // Açık kırmızı
  
  // Status colors
  success: '#22C55E', // Yeşil (başarı için)
  warning: '#F59E0B', // Turuncu (uyarı için)
  error: '#DC2626', // Kırmızı (hata için)
  info: '#3B82F6', // Mavi (bilgi için)
  
  // Background colors - Siyah tonları
  background: '#0F0F0F', // Çok koyu siyah
  surface: '#1A1A1A', // Koyu gri-siyah
  darkGray: '#262626', // Orta koyu gri
  lightGray: '#404040', // Açık koyu gri
  
  // Text colors
  text: {
    primary: '#FFFFFF', // Beyaz
    secondary: 'rgba(255, 255, 255, 0.8)', // Yarı şeffaf beyaz
    tertiary: 'rgba(255, 255, 255, 0.6)', // Daha şeffaf beyaz
    dark: '#1A1A1A', // Koyu arka plan için
    light: '#FFFFFF', // Açık arka plan için
    red: '#DC2626', // Kırmızı metin
  },
  
  // Border colors
  border: {
    light: '#404040', // Açık koyu gri
    medium: '#525252', // Orta gri
    dark: '#737373', // Koyu gri
    red: '#DC2626', // Kırmızı border
  },
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.7)', // Koyu overlay
  overlayLight: 'rgba(0, 0, 0, 0.4)', // Açık overlay
  redOverlay: 'rgba(220, 38, 38, 0.2)', // Kırmızı overlay
  
  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.3)',
    dark: 'rgba(0, 0, 0, 0.6)',
    red: 'rgba(220, 38, 38, 0.3)',
  },
  
  // Gradient colors - Kırmızı ve siyah tonları
  gradients: {
    primary: ['#DC2626', '#EF4444', '#F87171'], // Kırmızı gradient
    redBlack: ['#DC2626', '#1A1A1A', '#0F0F0F'], // Kırmızı-siyah gradient
    darkRed: ['#991B1B', '#DC2626', '#EF4444'], // Koyu kırmızı gradient
    blackRed: ['#0F0F0F', '#1A1A1A', '#DC2626'], // Siyah-kırmızı gradient
    red: ['#7F1D1D', '#DC2626', '#F87171'], // Kırmızı tonları
  },
  
  // Social media colors
  social: {
    facebook: '#1877F2',
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    linkedin: '#0A66C2',
  },
  
  // Chart colors - Kırmızı tonları
  chart: {
    primary: '#DC2626',
    secondary: '#EF4444',
    tertiary: '#F87171',
    quaternary: '#FCA5A5',
    quinary: '#FEE2E2',
  },
  
  // Button colors
  button: {
    primary: '#DC2626',
    primaryHover: '#B91C1C',
    secondary: '#1A1A1A',
    secondaryHover: '#262626',
    outline: 'transparent',
    outlineBorder: '#DC2626',
  },
  
  // Card colors
  card: {
    background: '#1A1A1A',
    border: '#404040',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

// Light theme colors
const lightColors = {
  // Primary colors - Kırmızı tonları
  primary: '#DC2626', // Koyu kırmızı
  primaryAlpha: 'rgba(220, 38, 38, 0.1)',
  secondary: '#EF4444', // Orta kırmızı
  accent: '#F87171', // Açık kırmızı
  
  // Status colors
  success: '#22C55E', // Yeşil (başarı için)
  warning: '#F59E0B', // Turuncu (uyarı için)
  error: '#DC2626', // Kırmızı (hata için)
  info: '#3B82F6', // Mavi (bilgi için)
  
  // Background colors - Beyaz tonları
  background: '#FFFFFF', // Beyaz
  surface: '#F8F9FA', // Açık gri
  darkGray: '#E9ECEF', // Orta açık gri
  lightGray: '#DEE2E6', // Açık gri
  
  // Text colors
  text: {
    primary: '#212529', // Koyu gri
    secondary: 'rgba(33, 37, 41, 0.8)', // Yarı şeffaf koyu gri
    tertiary: 'rgba(33, 37, 41, 0.6)', // Daha şeffaf koyu gri
    dark: '#1A1A1A', // Koyu arka plan için
    light: '#FFFFFF', // Açık arka plan için
    red: '#DC2626', // Kırmızı metin
  },
  
  // Border colors
  border: {
    light: '#DEE2E6', // Açık gri
    medium: '#CED4DA', // Orta gri
    dark: '#ADB5BD', // Koyu gri
    red: '#DC2626', // Kırmızı border
  },
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)', // Koyu overlay
  overlayLight: 'rgba(0, 0, 0, 0.2)', // Açık overlay
  redOverlay: 'rgba(220, 38, 38, 0.1)', // Kırmızı overlay
  
  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
    red: 'rgba(220, 38, 38, 0.2)',
  },
  
  // Gradient colors - Kırmızı ve beyaz tonları
  gradients: {
    primary: ['#DC2626', '#EF4444', '#F87171'], // Kırmızı gradient
    redBlack: ['#DC2626', '#F8F9FA', '#FFFFFF'], // Kırmızı-beyaz gradient
    darkRed: ['#991B1B', '#DC2626', '#EF4444'], // Koyu kırmızı gradient
    blackRed: ['#FFFFFF', '#F8F9FA', '#DC2626'], // Beyaz-kırmızı gradient
    red: ['#7F1D1D', '#DC2626', '#F87171'], // Kırmızı tonları
  },
  
  // Social media colors
  social: {
    facebook: '#1877F2',
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    linkedin: '#0A66C2',
  },
  
  // Chart colors - Kırmızı tonları
  chart: {
    primary: '#DC2626',
    secondary: '#EF4444',
    tertiary: '#F87171',
    quaternary: '#FCA5A5',
    quinary: '#FEE2E2',
  },
  
  // Button colors
  button: {
    primary: '#DC2626',
    primaryHover: '#B91C1C',
    secondary: '#F8F9FA',
    secondaryHover: '#E9ECEF',
    outline: 'transparent',
    outlineBorder: '#DC2626',
  },
  
  // Card colors
  card: {
    background: '#F8F9FA',
    border: '#DEE2E6',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
};

// Theme selector function
export const getColors = (isDarkMode = true) => {
  return isDarkMode ? darkColors : lightColors;
};

// Default export for backward compatibility
export const colors = darkColors;

