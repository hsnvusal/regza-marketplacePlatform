// src/services/authService.js
import apiClient, { handleApiResponse, handleApiError } from './api';

class AuthService {
  // Login user
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        email: email.toLowerCase().trim(),
        password
      });
      
      const result = handleApiResponse(response);
      
      // Store auth data
      if (result.success && result.data.token) {
        this.setAuthData(result.data.token, result.data.user);
      }
      
      return result;
    } catch (error) {
      return handleApiError(error);
    }
  }
  
  // Register user
  async register(userData) {
    try {
      // Clean and prepare user data
      const cleanData = {
        firstName: userData.firstName?.trim(),
        lastName: userData.lastName?.trim(),
        email: userData.email?.toLowerCase().trim(),
        password: userData.password,
        phone: userData.phone?.trim(),
        role: userData.role || 'customer'
      };
      
      const response = await apiClient.post('/auth/register', cleanData);
      const result = handleApiResponse(response);
      
      // Store auth data for auto-login
      if (result.success && result.data.token) {
        this.setAuthData(result.data.token, result.data.user);
      }
      
      return result;
    } catch (error) {
      return handleApiError(error);
    }
  }
  
  // Get current user profile
  async getProfile() {
    try {
      const response = await apiClient.get('/auth/profile');
      const result = handleApiResponse(response);
      
      // Update stored user data
      if (result.success && result.data.user) {
        const currentToken = this.getToken();
        this.setAuthData(currentToken, result.data.user);
      }
      
      return result;
    } catch (error) {
      return handleApiError(error);
    }
  }
  
  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await apiClient.put('/auth/profile', profileData);
      const result = handleApiResponse(response);
      
      // Update stored user data
      if (result.success && result.data.user) {
        const currentToken = this.getToken();
        this.setAuthData(currentToken, result.data.user);
      }
      
      return result;
    } catch (error) {
      return handleApiError(error);
    }
  }
  
  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await apiClient.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      return handleApiResponse(response);
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
      const response = await apiClient.get('/auth/verify');
      return handleApiResponse(response);
    } catch (error) {
      // If verification fails, clear auth data
      this.clearAuthData();
      return handleApiError(error);
    }
  }
  
  // Set auth data in localStorage
  setAuthData(token, user) {
    try {
      if (token) localStorage.setItem('marketplace_token', token);
      if (user) localStorage.setItem('marketplace_user', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }
  
  // Clear auth data
  clearAuthData() {
    try {
      localStorage.removeItem('marketplace_token');
      localStorage.removeItem('marketplace_user');
      localStorage.removeItem('marketplace_cart');
      localStorage.removeItem('marketplace_cart_id');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }
  
  // Logout
  async logout() {
    try {
      // Optional: Call backend logout endpoint
      await apiClient.post('/auth/logout').catch(() => {
        // Ignore logout API errors, just clear local data
      });
    } finally {
      this.clearAuthData();
    }
  }
  
  // Check if authenticated
  isAuthenticated() {
    return !!(this.getToken() && this.getCurrentUser());
  }
  
  // Get current user from storage
  getCurrentUser() {
    try {
      const userData = localStorage.getItem('marketplace_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }
  
  // Get auth token
  getToken() {
    return localStorage.getItem('marketplace_token');
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