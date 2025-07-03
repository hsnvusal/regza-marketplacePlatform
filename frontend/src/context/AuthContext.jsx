import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import toastManager from '../utils/toastManager';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Storage utility functions
  const setStorageData = (token, userData) => {
    try {
      console.log('💾 Setting storage data...');
      
      // Store in multiple locations for reliability
      localStorage.setItem('marketplace_token', token);
      localStorage.setItem('marketplace_user', JSON.stringify(userData));
      localStorage.setItem('mp_token', token);
      localStorage.setItem('mp_user', JSON.stringify(userData));
      sessionStorage.setItem('marketplace_token_backup', token);
      sessionStorage.setItem('marketplace_user_backup', JSON.stringify(userData));
      
      console.log('✅ Storage data set in multiple locations');
      return true;
    } catch (error) {
      console.error('❌ Storage error:', error);
      return false;
    }
  };

  const getStorageData = () => {
    try {
      console.log('🔍 Getting storage data from all locations...');
      
      let token = localStorage.getItem('marketplace_token');
      let userData = localStorage.getItem('marketplace_user');
      
      console.log('🔍 Primary storage check:');
      console.log('🔍 marketplace_token:', !!token);
      console.log('🔍 marketplace_user:', !!userData);
      
      if (!token || !userData) {
        console.log('🔄 Primary storage empty, checking backups...');
        
        token = localStorage.getItem('mp_token') || 
                sessionStorage.getItem('marketplace_token_backup');
        userData = localStorage.getItem('mp_user') || 
                   sessionStorage.getItem('marketplace_user_backup');
        
        console.log('🔍 Backup storage check:');
        console.log('🔍 backup token:', !!token);
        console.log('🔍 backup user:', !!userData);
        
        if (token && userData) {
          console.log('✅ Found in backup, restoring to primary...');
          localStorage.setItem('marketplace_token', token);
          localStorage.setItem('marketplace_user', userData);
        }
      }
      
      return { token, userData };
    } catch (error) {
      console.error('❌ Get storage error:', error);
      return { token: null, userData: null };
    }
  };

  const clearStorageData = () => {
    try {
      console.log('🗑️ Clearing all storage data...');
      
      localStorage.removeItem('marketplace_token');
      localStorage.removeItem('marketplace_user');
      localStorage.removeItem('mp_token');
      localStorage.removeItem('mp_user');
      sessionStorage.removeItem('marketplace_token_backup');
      sessionStorage.removeItem('marketplace_user_backup');
      
      console.log('✅ All storage cleared');
    } catch (error) {
      console.error('❌ Clear storage error:', error);
    }
  };

  // Internal logout handler
  const handleLogout = useCallback(async (showToastMessage = true) => {
    try {
      setIsLoading(true);
      
      await authService.logout();
      clearStorageData();
      
      setUser(null);
      setIsLoggedIn(false);
      
      console.log('✅ Logout completed');
      
      if (showToastMessage) {
        toastManager.authSuccess('Uğurla çıxış etdiniz');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      clearStorageData();
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize auth state on app load
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Initializing auth state...');
        
        if (document.readyState !== 'complete') {
          await new Promise(resolve => {
            if (document.readyState === 'complete') {
              resolve();
            } else {
              window.addEventListener('load', resolve, { once: true });
            }
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('🔍 All localStorage keys:', Object.keys(localStorage));
        console.log('🔍 All sessionStorage keys:', Object.keys(sessionStorage));
        
        const { token: storedToken, userData: storedUserData } = getStorageData();
        
        console.log('🔍 Final storage check:');
        console.log('🔍 Token exists:', !!storedToken);
        console.log('🔍 User data exists:', !!storedUserData);
        
        if (storedToken && storedUserData) {
          try {
            const parsedUser = JSON.parse(storedUserData);
            console.log('✅ Found valid auth data, restoring session');
            console.log('✅ User email:', parsedUser.email);
            console.log('✅ User role:', parsedUser.role);
            
            if (isMounted) {
              setUser(parsedUser);
              setIsLoggedIn(true);
              console.log('✅ Auth state updated - User logged in');
            }
          } catch (parseError) {
            console.error('❌ Error parsing stored user data:', parseError);
            clearStorageData();
            if (isMounted) {
              setUser(null);
              setIsLoggedIn(false);
            }
          }
        } else {
          console.log('❌ No valid stored auth data found');
          if (isMounted) {
            setUser(null);
            setIsLoggedIn(false);
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (isMounted) {
          setUser(null);
          setIsLoggedIn(false);
        }
      } finally {
        if (isMounted) {
          setIsInitialized(true);
          setIsLoading(false);
          console.log('✅ Auth initialization complete');
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Real login function
  const login = useCallback(async (email, password) => {
    try {
      console.log('🔍 Login attempt for:', email);
      setIsLoading(true);
      
      // Test localStorage functionality
      console.log('🧪 Testing localStorage functionality...');
      try {
        const testKey = 'test_' + Date.now();
        const testValue = 'test_value_' + Date.now();
        
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        if (retrieved !== testValue) {
          throw new Error('localStorage not working properly');
        }
        console.log('✅ localStorage test passed');
      } catch (storageError) {
        console.error('❌ localStorage test failed:', storageError);
        toastManager.error('Brauzeriniz məlumat saxlama funksiyasını dəstəkləmir');
        return { success: false, error: 'localStorage not supported' };
      }
      
      // Use toastManager.promise for better UX
      const result = await toastManager.promise(
        authService.login(email, password),
        {
          loading: 'Giriş edilir...',
          success: (data) => {
            if (data.success) {
              return `Xoş gəlmisiniz, ${data.data.user.firstName}!`;
            }
            throw new Error(data.error);
          },
          error: (err) => err.message || 'Giriş uğursuz oldu'
        }
      );
      
      console.log('📋 API Response:', {
        success: result.success,
        hasToken: !!(result.data?.token),
        hasUser: !!(result.data?.user),
        userEmail: result.data?.user?.email
      });
      
      if (result.success) {
        console.log('✅ Login successful via API');
        
        const storageSuccess = setStorageData(result.data.token, result.data.user);
        
        if (!storageSuccess) {
          console.error('❌ Storage failed!');
          toastManager.error('Məlumatlar saxlanmadı - brauzer problemi');
          return { success: false, error: 'Storage failed' };
        }
        
        // Mark user as just logged in for cart sync
        sessionStorage.setItem('user_just_logged_in', 'true');
        console.log('🔐 User marked as just logged in for cart sync');
        
        setUser(result.data.user);
        setIsLoggedIn(true);
        
        return { success: true, user: result.data.user };
      } else {
        console.log('❌ API Login failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message || 'Giriş zamanı xəta baş verdi' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // NEW: Register function
  const register = useCallback(async (registrationData) => {
    try {
      console.log('📝 Register attempt for:', registrationData.email);
      setIsLoading(true);
      
      // Test localStorage functionality
      console.log('🧪 Testing localStorage functionality...');
      try {
        const testKey = 'test_' + Date.now();
        const testValue = 'test_value_' + Date.now();
        
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        if (retrieved !== testValue) {
          throw new Error('localStorage not working properly');
        }
        console.log('✅ localStorage test passed');
      } catch (storageError) {
        console.error('❌ localStorage test failed:', storageError);
        toastManager.error('Brauzeriniz məlumat saxlama funksiyasını dəstəkləmir');
        return { success: false, error: 'localStorage not supported' };
      }
      
      // Call authService register
      const result = await authService.register(registrationData);
      
      console.log('📋 Register API Response:', {
        success: result.success,
        hasToken: !!(result.data?.token),
        hasUser: !!(result.data?.user),
        userEmail: result.data?.user?.email
      });
      
      if (result.success) {
        console.log('✅ Registration successful via API');
        
        const storageSuccess = setStorageData(result.data.token, result.data.user);
        
        if (!storageSuccess) {
          console.error('❌ Storage failed!');
          toastManager.error('Məlumatlar saxlanmadı - brauzer problemi');
          return { success: false, error: 'Storage failed' };
        }
        
        // Mark user as just logged in for cart sync
        sessionStorage.setItem('user_just_logged_in', 'true');
        console.log('🔐 User marked as just registered and logged in');
        
        setUser(result.data.user);
        setIsLoggedIn(true);
        
        return { success: true, user: result.data.user };
      } else {
        console.log('❌ API Registration failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { success: false, error: error.message || 'Qeydiyyat zamanı xəta baş verdi' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async (showToastMessage = true) => {
    console.log('🔍 Logout initiated');
    await handleLogout(showToastMessage);
  }, [handleLogout]);

  // Helper functions
  const hasRole = useCallback((role) => user?.role === role, [user]);
  const hasAnyRole = useCallback((roles) => roles.includes(user?.role), [user]);
  const getAuthHeader = useCallback(() => authService.getAuthHeader(), []);

  // Debug function
  window.debugAuth = () => {
    console.log('=== AUTH DEBUG INFO ===');
    console.log('User:', user);
    console.log('isLoggedIn:', isLoggedIn);
    console.log('isInitialized:', isInitialized);
    console.log('LocalStorage keys:', Object.keys(localStorage));
    console.log('marketplace_token:', localStorage.getItem('marketplace_token'));
    console.log('marketplace_user:', localStorage.getItem('marketplace_user'));
    console.log('user_just_logged_in:', sessionStorage.getItem('user_just_logged_in'));
  };

  const value = {
    // State
    user,
    isLoading,
    isLoggedIn,
    isInitialized,
    
    // Functions - ADDED register function
    login,
    register, // NEW
    logout,
    hasRole,
    hasAnyRole,
    getAuthHeader,
    
    // Computed properties
    isAdmin: user?.role === 'admin',
    isVendor: user?.role === 'vendor',
    isCustomer: user?.role === 'customer',
    userFullName: user ? `${user.firstName} ${user.lastName}`.trim() : null,
    userInitials: user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : null,
    userId: user?._id || user?.id
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};