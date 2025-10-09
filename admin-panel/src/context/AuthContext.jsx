import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const savedUser = localStorage.getItem('adminUser');

      if (token && savedUser) {
        const parsedUser = JSON.parse(savedUser);
        
        // Admin kontrolü
        if (parsedUser.role === 'admin' || parsedUser.role === 'super_admin') {
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          // Admin değilse logout
          logout();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      // Backend response: { success, message, data: { token, user } }
      // Axios ile: response.data = backend'den dönen tüm obje
      const backendData = response.data;
      
      if (!backendData.success) {
        throw new Error(backendData.message || 'Giriş başarısız');
      }
      
      const { token, user: userData } = backendData.data;

      // Admin kontrolü
      if (userData.role !== 'admin' && userData.role !== 'super_admin') {
        throw new Error('Bu panele sadece adminler erişebilir');
      }

      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Giriş başarısız',
      };
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

