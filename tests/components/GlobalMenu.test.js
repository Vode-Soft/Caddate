import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GlobalMenu from '../../src/components/GlobalMenu';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn()
};

describe('GlobalMenu Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(
      <GlobalMenu navigation={mockNavigation} />
    );
    
    expect(getByText('Ana Sayfa')).toBeTruthy();
    expect(getByText('Harita')).toBeTruthy();
    expect(getByText('Sohbet')).toBeTruthy();
    expect(getByText('Fotoğraflar')).toBeTruthy();
    expect(getByText('Profil')).toBeTruthy();
  });

  it('navigates to correct screen when menu item is pressed', () => {
    const { getByText } = render(
      <GlobalMenu navigation={mockNavigation} />
    );
    
    fireEvent.press(getByText('Harita'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Map');
    
    fireEvent.press(getByText('Sohbet'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Chat');
  });

  it('shows active state for current screen', () => {
    const { getByText } = render(
      <GlobalMenu navigation={mockNavigation} currentScreen="Map" />
    );
    
    const mapButton = getByText('Harita');
    expect(mapButton).toBeTruthy();
    // Active state styling would be tested here
  });
});
