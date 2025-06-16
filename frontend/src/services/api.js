// src/services/api.js
import axios from 'axios';
// Remove direct toast import to prevent duplicates
// import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('marketplace_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API calls in development
    if (import.meta.env.DEV) {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - NO TOASTS HERE to prevent duplicates
apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${error.config?.url}`, error);
    }
    
    if (response) {
      const { status, data } = response;
      
      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect
          localStorage.removeItem('marketplace_token');
          localStorage.removeItem('marketplace_user');
          if (window.location.pathname !== '/login') {
            // Only redirect, don't show toast here
            console.log('🔄 Session expired, redirecting to login');
            window.location.href = '/login';
          }
          break;
          
        case 403:
          console.log('❌ Permission denied');
          break;
          
        case 404:
          console.log('❌ Resource not found');
          break;
          
        case 422:
          // Validation errors - log but don't toast
          console.log('❌ Validation errors:', data.errors);
          break;
          
        case 429:
          console.log('❌ Too many requests');
          break;
          
        case 500:
          console.log('❌ Server error');
          break;
          
        default:
          if (status >= 400) {
            console.log('❌ API Error:', data?.message || 'Unknown error');
          }
      }
    } else if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      console.log('❌ Network error');
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('❌ Request timeout');
    }
    
    return Promise.reject(error);
  }
);

// Helper functions
export const handleApiResponse = (response) => {
  if (response.data.success) {
    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } else {
    throw new Error(response.data.message || 'API xətası');
  }
};

export const handleApiError = (error) => {
  if (error.response?.data) {
    return {
      success: false,
      error: error.response.data.message || 'Server xətası',
      errors: error.response.data.errors || [],
      status: error.response.status
    };
  }
  
  return {
    success: false,
    error: error.message || 'Bilinməyən xəta',
    status: 0
  };
};

export default apiClient;