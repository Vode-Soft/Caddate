import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ConfessionScreen from '../../src/screens/ConfessionScreen';
import apiService from '../../src/services/api';

// Mock API service
jest.mock('../../src/services/api', () => ({
  getStoredToken: jest.fn(),
  setToken: jest.fn(),
  getConfessions: jest.fn(),
  createConfession: jest.fn(),
  likeConfession: jest.fn(),
}));

// Mock navigation
const mockNavigation = {
  goBack: jest.fn(),
};

describe('ConfessionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <ConfessionScreen navigation={mockNavigation} />
    );
    
    expect(getByText('İtiraflar')).toBeTruthy();
    expect(getByPlaceholderText('İtirafınızı yazın...')).toBeTruthy();
  });

  it('loads confessions on mount', async () => {
    const mockConfessions = [
      {
        id: 1,
        content: 'Test confession 1',
        timeAgo: '2 saat önce',
        likesCount: 5
      }
    ];

    apiService.getStoredToken.mockResolvedValue('mock-token');
    apiService.getConfessions.mockResolvedValue({
      success: true,
      data: { confessions: mockConfessions }
    });

    const { getByText } = render(
      <ConfessionScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Test confession 1')).toBeTruthy();
    });
  });

  it('submits confession successfully', async () => {
    apiService.getStoredToken.mockResolvedValue('mock-token');
    apiService.createConfession.mockResolvedValue({
      success: true,
      message: 'İtiraf paylaşıldı!'
    });

    const { getByPlaceholderText, getByText } = render(
      <ConfessionScreen navigation={mockNavigation} />
    );

    const input = getByPlaceholderText('İtirafınızı yazın...');
    const submitButton = getByText('Paylaş');

    fireEvent.changeText(input, 'Test confession');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(apiService.createConfession).toHaveBeenCalledWith('Test confession', true);
    });
  });

  it('shows error for empty confession', async () => {
    const { getByText } = render(
      <ConfessionScreen navigation={mockNavigation} />
    );

    const submitButton = getByText('Paylaş');
    fireEvent.press(submitButton);

    // Should show alert for empty content
    await waitFor(() => {
      expect(getByText('Uyarı')).toBeTruthy();
    });
  });

  it('handles like confession', async () => {
    const mockConfessions = [
      {
        id: 1,
        content: 'Test confession',
        timeAgo: '2 saat önce',
        likesCount: 0
      }
    ];

    apiService.getStoredToken.mockResolvedValue('mock-token');
    apiService.getConfessions.mockResolvedValue({
      success: true,
      data: { confessions: mockConfessions }
    });
    apiService.likeConfession.mockResolvedValue({
      success: true
    });

    const { getByTestId } = render(
      <ConfessionScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      const likeButton = getByTestId('like-button-1');
      fireEvent.press(likeButton);
    });

    expect(apiService.likeConfession).toHaveBeenCalledWith(1);
  });

  it('handles API errors gracefully', async () => {
    apiService.getStoredToken.mockResolvedValue('mock-token');
    apiService.getConfessions.mockRejectedValue(new Error('Network error'));

    const { getByText } = render(
      <ConfessionScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Hata')).toBeTruthy();
    });
  });
});
