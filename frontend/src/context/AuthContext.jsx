import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import toast from 'react-hot-toast';

// Create Auth Context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth();
  }, []);

  // Initialize authentication state
  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }
      
      // Get stored user data
      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
        setIsLoggedIn(true);
        
        // Verify token validity with backend (optional, can cause delay)
        try {
          const verificationResult = await authService.verifyToken();
          if (!verificationResult.success) {
            // Token is invalid, clear auth state
            await handleLogout(false); // Don't show toast for auto-logout
          }
        } catch (error) {
          // If verification fails (e.g., no internet), keep user logged in locally
          console.warn('Token verification failed, keeping user logged in locally');
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      await handleLogout(false);
    } finally {
      setIsInitialized(true);
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setIsLoading(true);
      
      // Try real API first
      const result = await authService.login(email, password);
      
      if (result.success) {
        setUser(result.data.user);
        setIsLoggedIn(true);
        
        toast.success(`Xoş gəlmisiniz, ${result.data.user.firstName}!`);
        return { success: true, user: result.data.user };
      } else {
        toast.error(result.error || 'Giriş uğursuz oldu');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Fallback to mock for development
      if (import.meta.env.DEV) {
        console.log('API failed, trying mock login...');
        return loginMock(email, password);
      }
      
      const errorMessage = 'Giriş zamanı xəta baş verdi';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setIsLoading(true);
      
      const result = await authService.register(userData);
      
      if (result.success) {
        setUser(result.data.user);
        setIsLoggedIn(true);
        
        toast.success('Qeydiyyat uğurla tamamlandı!');
        return { success: true, user: result.data.user };
      } else {
        // Handle validation errors
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(error => {
            toast.error(error.msg || error.message);
          });
        } else {
          toast.error(result.error || 'Qeydiyyat uğursuz oldu');
        }
        
        return { 
          success: false, 
          error: result.error, 
          errors: result.errors 
        };
      }
    } catch (error) {
      console.error('Register error:', error);
      const errorMessage = 'Qeydiyyat zamanı xəta baş verdi';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async (showToast = true) => {
    await handleLogout(showToast);
  };

  // Internal logout handler
  const handleLogout = async (showToast = true) => {
    try {
      setIsLoading(true);
      
      // Call auth service logout (clears storage and calls API)
      await authService.logout();
      
      // Clear auth state
      setUser(null);
      setIsLoggedIn(false);
      
      if (showToast) {
        toast.success('Uğurla çıxış etdiniz');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout API fails, clear local state
      authService.clearAuthData();
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      setIsLoading(true);
      
      const result = await authService.updateProfile(profileData);
      
      if (result.success) {
        setUser(result.data.user);
        toast.success('Profil uğurla yeniləndi');
        return { success: true, user: result.data.user };
      } else {
        toast.error(result.error || 'Profil yeniləmə uğursuz oldu');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = 'Profil yeniləmə zamanı xəta baş verdi';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setIsLoading(true);
      
      const result = await authService.changePassword(currentPassword, newPassword);
      
      if (result.success) {
        toast.success('Şifrə uğurla dəyişdirildi');
        return { success: true };
      } else {
        toast.error(result.error || 'Şifrə dəyişdirilməsi uğursuz oldu');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Password change error:', error);
      const errorMessage = 'Şifrə dəyişdirilməsi zamanı xəta baş verdi';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      setIsLoading(true);
      
      const result = await authService.forgotPassword(email);
      
      if (result.success) {
        toast.success('Şifrə bərpa linki email ünvanınıza göndərildi');
        return { success: true };
      } else {
        toast.error(result.error || 'Şifrə bərpa uğursuz oldu');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = 'Şifrə bərpa zamanı xəta baş verdi';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (token, newPassword) => {
    try {
      setIsLoading(true);
      
      const result = await authService.resetPassword(token, newPassword);
      
      if (result.success) {
        toast.success('Şifrə uğurla bərpa edildi');
        return { success: true };
      } else {
        toast.error(result.error || 'Şifrə bərpa uğursuz oldu');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage = 'Şifrə bərpa zamanı xəta baş verdi';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh user data from server
  const refreshUser = async () => {
    try {
      const result = await authService.getProfile();
      
      if (result.success) {
        setUser(result.data.user);
        return { success: true, user: result.data.user };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      return { success: false, error: 'User məlumatları yenilənərkən xəta baş verdi' };
    }
  };

  // Mock login for development (fallback)
  const loginMock = (email, password) => {
    const mockUsers = {
      'admin@example.com': {
        _id: '64a7b8c9d1e2f3a4b5c6d7e8',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      'vendor@example.com': {
        _id: '64a7b8c9d1e2f3a4b5c6d7e9',
        firstName: 'Vendor',
        lastName: 'User',
        email: 'vendor@example.com',
        role: 'vendor',
        isActive: true,
        vendorInfo: {
          businessName: 'Test Business',
          isVerified: true
        },
        createdAt: new Date().toISOString()
      },
      'user@example.com': {
        _id: '64a7b8c9d1e2f3a4b5c6d7ea',
        firstName: 'Regular',
        lastName: 'User',
        email: 'user@example.com',
        role: 'customer',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    };

    const mockUser = mockUsers[email];
    if (mockUser && password === 'password') {
      const mockToken = `mock_token_${Date.now()}`;
      
      // Store mock data
      authService.setAuthData(mockToken, mockUser);
      
      setUser(mockUser);
      setIsLoggedIn(true);
      
      toast.success(`Mock giriş: ${mockUser.firstName}`);
      return { success: true, user: mockUser };
    }
    
    toast.error('Yanlış email və ya şifrə (mock: password)');
    return { success: false, error: 'Invalid credentials' };
  };

  // Helper functions
  const hasRole = (role) => user?.role === role;
  const hasAnyRole = (roles) => roles.includes(user?.role);
  const getAuthHeader = () => authService.getAuthHeader();

  const value = {
    // State
    user,
    isLoading,
    isLoggedIn,
    isInitialized,
    
    // Functions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    refreshUser,
    hasRole,
    hasAnyRole,
    getAuthHeader,
    
    // Mock function for development
    loginMock,
    
    // Computed properties
    isAdmin: user?.role === 'admin',
    isVendor: user?.role === 'vendor',
    isCustomer: user?.role === 'customer',
    userFullName: authService.getUserFullName(),
    userInitials: authService.getUserInitials(),
    userId: user?._id || user?.id
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};