import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import notificationService from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Notification servisini başlat
    const initializeNotifications = async () => {
      try {
        await notificationService.initialize();
        console.log('Notification servisi başlatıldı');
      } catch (error) {
        console.error('Notification servisi başlatılamadı:', error);
      }
    };

    initializeNotifications();

    // Cleanup
    return () => {
      // Notification service cleanup gerekirse burada yapılabilir
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar 
            style="auto" 
            backgroundColor={Platform.OS === 'android' ? '#000000' : undefined}
            translucent={Platform.OS === 'android'}
          />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}