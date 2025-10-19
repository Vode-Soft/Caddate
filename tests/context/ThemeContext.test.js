import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Test component to access theme context
const TestComponent = () => {
  const { isDarkMode, toggleTheme, setTheme, theme } = useTheme();
  
  return (
    <>
      <Text testID="theme-status">{isDarkMode ? 'dark' : 'light'}</Text>
      <Text testID="theme-name">{theme}</Text>
      <button testID="toggle-theme" onPress={toggleTheme} />
      <button testID="set-dark" onPress={() => setTheme('dark')} />
      <button testID="set-light" onPress={() => setTheme('light')} />
    </>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides default dark theme', () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(getByTestId('theme-status')).toHaveTextContent('dark');
    expect(getByTestId('theme-name')).toHaveTextContent('dark');
  });

  it('loads saved theme preference', async () => {
    AsyncStorage.getItem.mockResolvedValue('light');
    
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    await waitFor(() => {
      expect(getByTestId('theme-status')).toHaveTextContent('light');
    });
  });

  it('toggles theme correctly', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
    
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const toggleButton = getByTestId('toggle-theme');
    fireEvent.press(toggleButton);
    
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('theme_preference', 'light');
    });
  });

  it('sets specific theme', async () => {
    AsyncStorage.setItem.mockResolvedValue();
    
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const setLightButton = getByTestId('set-light');
    fireEvent.press(setLightButton);
    
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('theme_preference', 'light');
    });
  });

  it('handles storage errors gracefully', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
    
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Should still render with default theme
    expect(getByTestId('theme-status')).toHaveTextContent('dark');
  });
});
