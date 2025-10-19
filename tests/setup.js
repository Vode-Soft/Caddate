import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:3000/api',
        socketUrl: 'http://localhost:3000'
      }
    }
  }
}));

jest.mock('expo-device', () => ({
  default: {
    isDevice: true,
    osName: 'iOS',
    osVersion: '15.0'
  }
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn()
}));

// Mock React Native modules
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    MapView: View,
    Marker: View,
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: 'default'
  };
});

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    WebView: View
  };
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn()
  }),
  useRoute: () => ({
    params: {}
  }),
  useFocusEffect: jest.fn()
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

// Mock Socket.io
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  }))
}));

// Global test utilities
global.testUtils = {
  // Mock API response
  mockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data)
  }),
  
  // Mock user data
  mockUser: {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    profile_picture: null,
    is_premium: false
  },
  
  // Mock navigation params
  mockNavigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn()
  }
};
