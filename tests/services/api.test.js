import apiService from '../../src/services/api';

// Mock fetch
global.fetch = jest.fn();

describe('API Service', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Authentication', () => {
    it('should login user successfully', async () => {
      const mockResponse = {
        success: true,
        user: global.testUtils.mockUser,
        token: 'mock-token'
      };

      fetch.mockResolvedValueOnce(global.testUtils.mockApiResponse(mockResponse));

      const result = await apiService.login('test@example.com', 'password123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should register user successfully', async () => {
      const mockResponse = {
        success: true,
        user: global.testUtils.mockUser,
        token: 'mock-token'
      };

      fetch.mockResolvedValueOnce(global.testUtils.mockApiResponse(mockResponse));

      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User'
      };

      const result = await apiService.register(userData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(userData)
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('User Profile', () => {
    it('should get user profile', async () => {
      const mockResponse = {
        success: true,
        user: global.testUtils.mockUser
      };

      fetch.mockResolvedValueOnce(global.testUtils.mockApiResponse(mockResponse));

      const result = await apiService.getProfile();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/profile'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should update user profile', async () => {
      const mockResponse = {
        success: true,
        user: { ...global.testUtils.mockUser, first_name: 'Updated' }
      };

      fetch.mockResolvedValueOnce(global.testUtils.mockApiResponse(mockResponse));

      const updateData = { first_name: 'Updated' };
      const result = await apiService.updateProfile(updateData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/profile'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Chat', () => {
    it('should send message', async () => {
      const mockResponse = {
        success: true,
        message: {
          id: 1,
          content: 'Test message',
          sender_id: 1,
          receiver_id: 2
        }
      };

      fetch.mockResolvedValueOnce(global.testUtils.mockApiResponse(mockResponse));

      const result = await apiService.sendMessage(2, 'Test message');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat/send'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            receiver_id: 2,
            message: 'Test message',
            message_type: 'text'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should get message history', async () => {
      const mockResponse = {
        success: true,
        messages: [
          {
            id: 1,
            content: 'Test message',
            sender_id: 1,
            receiver_id: 2,
            created_at: '2023-01-01T00:00:00Z'
          }
        ]
      };

      fetch.mockResolvedValueOnce(global.testUtils.mockApiResponse(mockResponse));

      const result = await apiService.getMessageHistory();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat/history'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.login('test@example.com', 'password123'))
        .rejects.toThrow('Network error');
    });

    it('should handle API errors', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Invalid credentials'
      };

      fetch.mockResolvedValueOnce(global.testUtils.mockApiResponse(mockErrorResponse, 401));

      await expect(apiService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });
  });
});
