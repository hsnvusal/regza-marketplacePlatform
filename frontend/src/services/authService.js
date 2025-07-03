// src/services/authService.js
import apiClient, { handleApiResponse, handleApiError } from './api';

class AuthService {
  // Login user
  async login(email, password) {
    try {
      console.log('🔍 AuthService: Login attempt for:', email);
      
      const response = await apiClient.post('/auth/login', {
        email: email.toLowerCase().trim(),
        password
      });
      
      const result = handleApiResponse(response);
      
      // Store auth data
      if (result.success && result.data.token) {
        console.log('✅ AuthService: Login successful, storing data');
        this.setAuthData(result.data.token, result.data.user);
      }
      
      return result;
    } catch (error) {
      console.error('❌ AuthService: Login error:', error);
      return handleApiError(error);
    }
  }
  
  // Register user
  async register(userData) {
    try {
      console.log('🔍 AuthService: Register attempt for:', userData.email);
      
      // Clean and prepare user data
      const cleanData = {
        firstName: userData.firstName?.trim(),
        lastName: userData.lastName?.trim(),
        email: userData.email?.toLowerCase().trim(),
        password: userData.password,
        phone: userData.phone?.trim() || undefined,
        role: userData.role || 'customer'
      };
      
      const response = await apiClient.post('/auth/register', cleanData);
      const result = handleApiResponse(response);
      
      // Store auth data for auto-login
      if (result.success && result.data.token) {
        console.log('✅ AuthService: Register successful, storing data');
        this.setAuthData(result.data.token, result.data.user);
      }
      
      return result;
    } catch (error) {
      console.error('❌ AuthService: Register error:', error);
      return handleApiError(error);
    }
  }
  
  // Get current user profile - FIX: Correct endpoint
  async getProfile() {
    try {
      console.log('🔍 AuthService: Getting profile');
      const response = await apiClient.get('/auth/me'); // FIXED: was /auth/profile
      const result = handleApiResponse(response);
      
      // Update stored user data
      if (result.success && result.data.user) {
        const currentToken = this.getToken();
        this.setAuthData(currentToken, result.data.user);
      }
      
      return result;
    } catch (error) {
      console.error('❌ AuthService: Get profile error:', error);
      return handleApiError(error);
    }
  }
  
  // Update user profile - FIX: Correct endpoint
  async updateProfile(profileData) {
    try {
      console.log('🔍 AuthService: Updating profile');
      const response = await apiClient.put('/auth/me', profileData); // FIXED: was /auth/profile
      const result = handleApiResponse(response);
      
      // Update stored user data
      if (result.success && result.data.user) {
        const currentToken = this.getToken();
        this.setAuthData(currentToken, result.data.user);
      }
      
      return result;
    } catch (error) {
      console.error('❌ AuthService: Update profile error:', error);
      return handleApiError(error);
    }
  }
  
  // Change password
  async changePassword(currentPassword, newPassword, confirmPassword) {
    try {
      const response = await apiClient.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });
      
      const result = handleApiResponse(response);
      
      // Update token if new one is provided
      if (result.success && result.data.token) {
        const currentUser = this.getCurrentUser();
        this.setAuthData(result.data.token, currentUser);
      }
      
      return result;
    } catch (error) {
      return handleApiError(error);
    }
  }
  
  // Forgot password
  async forgotPassword(email) {
    try {
      const response = await apiClient.post('/auth/forgot-password', {
        email: email.toLowerCase().trim()
      });
      
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
  
  // Reset password
  async resetPassword(token, newPassword) {
    try {
      const response = await apiClient.post('/auth/reset-password', {
        token,
        newPassword
      });
      
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
  
  // Verify token
  async verifyToken() {
    try {
      const response = await apiClient.get('/auth/me'); // FIXED: was /auth/verify
      return handleApiResponse(response);
    } catch (error) {
      // If verification fails, clear auth data
      this.clearAuthData();
      return handleApiError(error);
    }
  }
  
  // Set auth data in localStorage with multiple keys for reliability
  setAuthData(token, user) {
    try {
      console.log('💾 AuthService: Storing auth data');
      console.log('💾 Token exists:', !!token);
      console.log('💾 User exists:', !!user);
      
      if (token) {
        // Store in multiple locations for reliability
        localStorage.setItem('marketplace_token', token);
        localStorage.setItem('mp_token', token);
        sessionStorage.setItem('marketplace_token_backup', token);
        console.log('✅ Token stored in multiple locations');
      }
      
      if (user) {
        localStorage.setItem('marketplace_user', JSON.stringify(user));
        localStorage.setItem('mp_user', JSON.stringify(user));
        sessionStorage.setItem('marketplace_user_backup', JSON.stringify(user));
        console.log('✅ User data stored in multiple locations');
      }
      
      console.log('✅ Auth data stored successfully');
    } catch (error) {
      console.error('❌ Error storing auth data:', error);
    }
  }
  
  // Clear auth data from all locations
  clearAuthData() {
    try {
      console.log('🗑️ AuthService: Clearing auth data');
      
      // Clear from all storage locations
      localStorage.removeItem('marketplace_token');
      localStorage.removeItem('marketplace_user');
      localStorage.removeItem('mp_token');
      localStorage.removeItem('mp_user');
      sessionStorage.removeItem('marketplace_token_backup');
      sessionStorage.removeItem('marketplace_user_backup');
      localStorage.removeItem('marketplace_cart');
      localStorage.removeItem('marketplace_cart_id');
      
      console.log('✅ Auth data cleared from all locations');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
    }
  }
  
  // Logout
  async logout() {
    try {
      console.log('🚪 AuthService: Logout initiated');
      
      // Optional: Call backend logout endpoint
      await apiClient.post('/auth/logout').catch(() => {
        console.log('⚠️ Logout API call failed, continuing with local cleanup');
      });
    } finally {
      this.clearAuthData();
    }
  }
  
  // Check if authenticated
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getCurrentUser();
    const isAuth = !!(token && user);
    
    console.log('🔍 AuthService: Authentication check');
    console.log('🔍 Token exists:', !!token);
    console.log('🔍 User exists:', !!user);
    console.log('🔍 Is authenticated:', isAuth);
    
    return isAuth;
  }
  
  // Get current user from storage with fallback
  getCurrentUser() {
    try {
      let userData = localStorage.getItem('marketplace_user');
      
      // Fallback to backup storage
      if (!userData) {
        userData = localStorage.getItem('mp_user') || 
                   sessionStorage.getItem('marketplace_user_backup');
      }
      
      const user = userData ? JSON.parse(userData) : null;
      
      if (user) {
        console.log('👤 AuthService: Found user in storage:', user.email);
      } else {
        console.log('👤 AuthService: No user found in storage');
      }
      
      return user;
    } catch (error) {
      console.error('❌ Error parsing stored user data:', error);
      // Clear corrupted data
      this.clearAuthData();
      return null;
    }
  }
  
  // Get auth token with fallback
  getToken() {
    let token = localStorage.getItem('marketplace_token');
    
    // Fallback to backup storage
    if (!token) {
      token = localStorage.getItem('mp_token') || 
              sessionStorage.getItem('marketplace_token_backup');
    }
    
    if (token) {
      console.log('🎫 AuthService: Found token in storage');
    } else {
      console.log('🎫 AuthService: No token found in storage');
    }
    
    return token;
  }
  
  // Get auth header object
  getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  
  // Check user role
  hasRole(role) {
    const user = this.getCurrentUser();
    return user?.role === role;
  }
  
  // Check if user has any of specified roles
  hasAnyRole(roles) {
    const user = this.getCurrentUser();
    return roles.includes(user?.role);
  }
  
  // Get user's full name
  getUserFullName() {
    const user = this.getCurrentUser();
    return user ? `${user.firstName} ${user.lastName}`.trim() : null;
  }
  
  // Get user initials
  getUserInitials() {
    const user = this.getCurrentUser();
    if (!user) return null;
    
    const firstInitial = user.firstName?.[0] || '';
    const lastInitial = user.lastName?.[0] || '';
    return (firstInitial + lastInitial).toUpperCase();
  }
}

// Export singleton instance
export default new AuthService();