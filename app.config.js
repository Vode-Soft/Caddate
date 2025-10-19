import 'dotenv/config';

export default {
  expo: {
    name: "CaddateApp",
    slug: "caddate-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.caddate.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Bu uygulama konumunuzu kullanarak yakındaki kullanıcıları göstermek için konum izni gerektirir.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Bu uygulama konumunuzu kullanarak yakındaki kullanıcıları göstermek için konum izni gerektirir.",
        NSCameraUsageDescription: "Bu uygulama profil fotoğrafı çekmek için kamera erişimi gerektirir.",
        NSPhotoLibraryUsageDescription: "Bu uygulama profil fotoğrafı seçmek için fotoğraf galerisi erişimi gerektirir."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.caddate.app",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Bu uygulama konumunuzu kullanarak yakındaki kullanıcıları göstermek için konum izni gerektirir."
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Bu uygulama profil fotoğrafı çekmek için kamera erişimi gerektirir."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Bu uygulama profil fotoğrafı seçmek için fotoğraf galerisi erişimi gerektirir."
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff",
          defaultChannel: "default"
        }
      ]
    ],
    extra: {
      // Environment variables
      apiUrl: process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_RENDER_BACKEND_URL || (__DEV__ ? "http://192.168.1.9:3000" : "https://your-production-api.com"),
      renderBackendUrl: process.env.EXPO_PUBLIC_RENDER_BACKEND_URL,
      socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_RENDER_BACKEND_URL || (__DEV__ ? "http://192.168.1.9:3000" : "wss://your-production-api.com"),
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "your_google_maps_api_key",
      environment: process.env.NODE_ENV || "development",
      eas: {
        projectId: "12345678-1234-1234-1234-123456789abc"
      }
    }
  }
};
