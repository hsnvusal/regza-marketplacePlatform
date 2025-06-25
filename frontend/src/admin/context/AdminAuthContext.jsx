// src/admin/context/AdminAuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import adminAuthService from '../services/adminAuthService';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (token) {
        console.log('🔍 AdminAuth: Checking token validity...');
        const response = await adminAuthService.verifyToken();
        if (response.success && response.admin) {
          console.log('✅ AdminAuth: Token valid, admin authenticated');
          setAdmin(response.admin);
          setIsAuthenticated(true);
        } else {
          console.log('❌ AdminAuth: Token invalid, clearing auth');
          logout();
        }
      } else {
        console.log('⚠️ AdminAuth: No token found');
      }
    } catch (error) {
      console.error('❌ AdminAuth: Auth check failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      console.log('🔄 AdminAuth: Attempting login...');
      const response = await adminAuthService.login(credentials);
      if (response.success) {
        console.log('✅ AdminAuth: Login successful');
        localStorage.setItem('adminToken', response.token);
        setAdmin(response.admin);
        setIsAuthenticated(true);
        return { success: true };
      }
      console.log('❌ AdminAuth: Login failed:', response.error);
      return { success: false, error: response.error };
    } catch (error) {
      console.error('❌ AdminAuth: Login error:', error);
      return { success: false, error: 'Giriş zamanı xəta baş verdi' };
    }
  };

  const logout = () => {
    console.log('🚪 AdminAuth: Logging out...');
    adminAuthService.logout();
    localStorage.removeItem('adminToken');
    setAdmin(null);
    setIsAuthenticated(false);
  };

  const value = {
    admin,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};