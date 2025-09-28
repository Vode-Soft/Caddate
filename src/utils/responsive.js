import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Base dimensions (iPhone 12 Pro)
const baseWidth = 390;
const baseHeight = 844;

// Device type detection
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isTablet = screenWidth >= 768;
export const isSmallScreen = screenWidth < 375;
export const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
export const isLargeScreen = screenWidth >= 414;
export const isXLargeScreen = screenWidth >= 480;

// Screen size categories
export const getScreenSize = () => {
  if (isTablet) return 'tablet';
  if (isXLargeScreen) return 'xlarge';
  if (isLargeScreen) return 'large';
  if (isMediumScreen) return 'medium';
  if (isSmallScreen) return 'small';
  return 'default';
};

// Responsive scaling functions
export const scale = (size) => {
  const ratio = screenWidth / baseWidth;
  return Math.round(size * ratio);
};

export const verticalScale = (size) => {
  const ratio = screenHeight / baseHeight;
  return Math.round(size * ratio);
};

export const moderateScale = (size, factor = 0.5) => {
  const ratio = screenWidth / baseWidth;
  return Math.round(size + (size * ratio - size) * factor);
};

// Font scaling with better precision
export const scaleFont = (size) => {
  const newSize = scale(size);
  if (Platform.OS === 'ios') {
    return Math.max(12, Math.round(newSize)); // Minimum 12px font size
  } else {
    return Math.max(12, Math.round(newSize) - 1);
  }
};

// Responsive padding with screen size consideration
export const getResponsivePadding = (size) => {
  const basePadding = scale(size);
  if (isTablet) return basePadding * 1.2;
  if (isSmallScreen) return basePadding * 0.8;
  return basePadding;
};

// Responsive font size with screen size consideration
export const getResponsiveFontSize = (size) => {
  const baseFontSize = scaleFont(size);
  if (isTablet) return Math.round(baseFontSize * 1.1);
  if (isSmallScreen) return Math.round(baseFontSize * 0.9);
  return baseFontSize;
};

// Safe area helpers
export const getStatusBarHeight = () => {
  if (isIOS) {
    return StatusBar.currentHeight || 0;
  }
  return StatusBar.currentHeight || 0;
};

export const getBottomSafeArea = () => {
  if (isIOS) {
    // iPhone X ve sonrası için home indicator yüksekliği
    return screenHeight > 800 ? 34 : 0;
  }
  return 0;
};

// Touch target helpers
export const getMinTouchTarget = () => {
  if (isTablet) return scale(48);
  if (isSmallScreen) return scale(40);
  return scale(44);
};

// Platform-specific shadows
export const getPlatformShadow = (elevation = 2) => {
  if (isIOS) {
    return {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: elevation,
      },
      shadowOpacity: 0.1 + (elevation * 0.05),
      shadowRadius: elevation * 2,
    };
  } else {
    return {
      elevation: elevation,
    };
  }
};

// Grid helpers
export const getGridColumns = () => {
  if (isTablet) return 3;
  if (isSmallScreen) return 1;
  return 2;
};

// Responsive spacing
export const getResponsiveSpacing = (baseSpacing) => {
  if (isTablet) return baseSpacing * 1.5;
  if (isSmallScreen) return baseSpacing * 0.8;
  return baseSpacing;
};

// Responsive margins
export const getResponsiveMargin = (size) => scale(size);

// Responsive border radius
export const getResponsiveBorderRadius = (size) => {
  const baseRadius = scale(size);
  if (isTablet) return baseRadius * 1.1;
  if (isSmallScreen) return baseRadius * 0.9;
  return baseRadius;
};

// Responsive icon size
export const getResponsiveIconSize = (size) => {
  const baseSize = scale(size);
  if (isTablet) return baseSize * 1.2;
  if (isSmallScreen) return baseSize * 0.9;
  return baseSize;
};

// Responsive button height
export const getResponsiveButtonHeight = () => {
  if (isTablet) return scale(60);
  if (isSmallScreen) return scale(44);
  return scale(50);
};

// Responsive input height
export const getResponsiveInputHeight = () => {
  if (isTablet) return scale(56);
  if (isSmallScreen) return scale(44);
  return scale(50);
};

// Responsive width percentage
export const getResponsiveWidth = (percentage) => {
  return (screenWidth * percentage) / 100;
};

// Responsive height percentage
export const getResponsiveHeight = (percentage) => {
  return (screenHeight * percentage) / 100;
};

// Responsive container padding
export const getContainerPadding = () => {
  if (isTablet) return scale(24);
  if (isSmallScreen) return scale(12);
  return scale(16);
};

// Responsive header height
export const getHeaderHeight = () => {
  if (isTablet) return scale(80);
  if (isSmallScreen) return scale(60);
  return scale(70);
};

// Responsive tab bar height
export const getTabBarHeight = () => {
  if (isTablet) return scale(80);
  if (isSmallScreen) return scale(60);
  return scale(70);
};

// Responsive card dimensions
export const getCardDimensions = () => {
  if (isTablet) {
    return {
      width: getResponsiveWidth(45),
      height: getResponsiveHeight(25),
      borderRadius: scale(16),
    };
  }
  if (isSmallScreen) {
    return {
      width: getResponsiveWidth(90),
      height: getResponsiveHeight(20),
      borderRadius: scale(12),
    };
  }
  return {
    width: getResponsiveWidth(85),
    height: getResponsiveHeight(22),
    borderRadius: scale(14),
  };
};

// Responsive modal dimensions
export const getModalDimensions = () => {
  if (isTablet) {
    return {
      width: getResponsiveWidth(60),
      height: getResponsiveHeight(70),
    };
  }
  if (isSmallScreen) {
    return {
      width: getResponsiveWidth(95),
      height: getResponsiveHeight(80),
    };
  }
  return {
    width: getResponsiveWidth(90),
    height: getResponsiveHeight(75),
  };
};

// Responsive list item height
export const getListItemHeight = () => {
  if (isTablet) return scale(80);
  if (isSmallScreen) return scale(60);
  return scale(70);
};

// Responsive avatar size
export const getAvatarSize = (size = 'medium') => {
  const sizes = {
    small: isTablet ? scale(40) : isSmallScreen ? scale(32) : scale(36),
    medium: isTablet ? scale(60) : isSmallScreen ? scale(48) : scale(54),
    large: isTablet ? scale(80) : isSmallScreen ? scale(64) : scale(72),
    xlarge: isTablet ? scale(100) : isSmallScreen ? scale(80) : scale(90),
  };
  return sizes[size] || sizes.medium;
};

// Responsive spacing system
export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
};

// Responsive font sizes
export const fontSizes = {
  xs: scaleFont(10),
  sm: scaleFont(12),
  md: scaleFont(14),
  lg: scaleFont(16),
  xl: scaleFont(18),
  xxl: scaleFont(20),
  xxxl: scaleFont(24),
  title: scaleFont(28),
  heading: scaleFont(32),
};

// Responsive breakpoints
export const breakpoints = {
  small: 375,
  medium: 414,
  large: 768,
  xlarge: 1024,
};

// Check if current screen matches breakpoint
export const isBreakpoint = (breakpoint) => {
  return screenWidth >= breakpoints[breakpoint];
};

// Responsive layout helpers
export const getLayoutConfig = () => {
  const screenSize = getScreenSize();
  
  const configs = {
    small: {
      columns: 1,
      padding: scale(12),
      margin: scale(8),
      fontSize: scaleFont(14),
      iconSize: scale(20),
    },
    medium: {
      columns: 2,
      padding: scale(16),
      margin: scale(12),
      fontSize: scaleFont(16),
      iconSize: scale(24),
    },
    large: {
      columns: 2,
      padding: scale(20),
      margin: scale(16),
      fontSize: scaleFont(18),
      iconSize: scale(28),
    },
    xlarge: {
      columns: 3,
      padding: scale(24),
      margin: scale(20),
      fontSize: scaleFont(20),
      iconSize: scale(32),
    },
    tablet: {
      columns: 3,
      padding: scale(32),
      margin: scale(24),
      fontSize: scaleFont(22),
      iconSize: scale(36),
    },
  };
  
  return configs[screenSize] || configs.medium;
};

