// src/utils/toastManager.js
import toast from 'react-hot-toast';

class ToastManager {
  constructor() {
    this.lastToasts = new Map(); // Map to store last toasts by message
    this.pendingToasts = new Map(); // Map to store pending timeouts
    this.duplicateWindow = 2000; // 2 seconds window to prevent duplicates
    this.globalToastHistory = new Set(); // Global history of all toasts
    
    // Listen for all toast events to track them globally
    this.setupToastInterceptor();
  }

  setupToastInterceptor() {
    // Intercept all direct toast calls
    const originalToast = toast;
    const originalSuccess = toast.success;
    const originalError = toast.error;
    const originalLoading = toast.loading;
    const originalPromise = toast.promise;

    // Override toast methods to prevent duplicates
    toast.success = (message, options) => {
      return this.success(message, options);
    };

    toast.error = (message, options) => {
      return this.error(message, options);
    };

    toast.loading = (message, options) => {
      return this.loading(message, options);
    };

    toast.promise = (promise, messages) => {
      return this.promise(promise, messages);
    };

    // Keep reference to original methods
    this._originalToast = originalToast;
    this._originalSuccess = originalSuccess;
    this._originalError = originalError;
    this._originalLoading = originalLoading;
    this._originalPromise = originalPromise;
  }

  // Main toast method with aggressive deduplication
  show(type, message, options = {}) {
    const now = Date.now();
    const messageKey = `${type}-${message}`;
    
    // Check global history first
    const globalKey = `${type}:${message}:${Math.floor(now / 1000)}`;
    if (this.globalToastHistory.has(globalKey)) {
      console.log(`🚫 Global duplicate ${type} toast prevented:`, message);
      return null;
    }

    // Check if same toast was shown recently
    const lastToast = this.lastToasts.get(messageKey);
    if (lastToast && now - lastToast < this.duplicateWindow) {
      console.log(`🚫 Duplicate ${type} toast prevented:`, message);
      return null;
    }

    // Clear any pending toast with same message
    const pendingTimeout = this.pendingToasts.get(messageKey);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      this.pendingToasts.delete(messageKey);
    }

    // Add to global history
    this.globalToastHistory.add(globalKey);
    
    // Clean old global history entries (older than 5 seconds)
    setTimeout(() => {
      this.globalToastHistory.delete(globalKey);
    }, 5000);

    // Debounce the toast call
    const timeoutId = setTimeout(() => {
      this.lastToasts.set(messageKey, Date.now());
      this.pendingToasts.delete(messageKey);
      
      // Show the toast using original methods to avoid recursion
      let toastId;
      switch (type) {
        case 'success':
          toastId = this._originalSuccess(message, options);
          break;
        case 'error':
          toastId = this._originalError(message, options);
          break;
        case 'loading':
          toastId = this._originalLoading(message, options);
          break;
        default:
          toastId = this._originalToast(message, options);
      }
      
      console.log(`✅ ${type} toast shown:`, message);
      return toastId;
    }, 100); // 100ms debounce

    this.pendingToasts.set(messageKey, timeoutId);
    return timeoutId;
  }

  // Convenience methods
  success(message, options = {}) {
    return this.show('success', message, options);
  }

  error(message, options = {}) {
    return this.show('error', message, options);
  }

  loading(message, options = {}) {
    return this.show('loading', message, options);
  }

  info(message, options = {}) {
    return this.show('info', message, options);
  }

  // Promise toast with aggressive deduplication
  promise(promise, messages) {
    const messageKey = `promise-${messages.loading || 'loading'}`;
    const now = Date.now();
    
    // Check if same promise toast was shown recently
    const lastToast = this.lastToasts.get(messageKey);
    if (lastToast && now - lastToast < this.duplicateWindow) {
      console.log('🚫 Duplicate promise toast prevented');
      return promise; // Return the original promise
    }

    this.lastToasts.set(messageKey, now);
    
    // Use original promise method
    return this._originalPromise(promise, {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Error occurred'
    });
  }

  // Dismiss specific toast
  dismiss(toastId) {
    return toast.dismiss(toastId);
  }

  // Dismiss all toasts
  dismissAll() {
    return toast.dismiss();
  }

  // Clear all stored toast history (useful for testing)
  clearHistory() {
    this.lastToasts.clear();
    this.globalToastHistory.clear();
    this.pendingToasts.forEach(timeout => clearTimeout(timeout));
    this.pendingToasts.clear();
    console.log('🧹 Toast history cleared');
  }

  // Custom toast for cart actions
  cartSuccess(message, productName) {
    const fullMessage = productName ? `${message}: ${productName}` : message;
    return this.success(fullMessage, {
      duration: 2000,
      icon: '🛒'
    });
  }

  // Custom toast for auth actions
  authSuccess(message, userName) {
    const fullMessage = userName ? `${message}, ${userName}!` : message;
    return this.success(fullMessage, {
      duration: 3000,
      icon: '👋'
    });
  }

  // Custom toast for general actions
  actionSuccess(message, icon = '✅') {
    return this.success(message, {
      duration: 2500,
      icon: icon
    });
  }

  actionError(message, icon = '❌') {
    return this.error(message, {
      duration: 4000,
      icon: icon
    });
  }

  // Force show toast (bypass deduplication) - for testing
  forceShow(type, message, options = {}) {
    switch (type) {
      case 'success':
        return this._originalSuccess(message, options);
      case 'error':
        return this._originalError(message, options);
      case 'loading':
        return this._originalLoading(message, options);
      default:
        return this._originalToast(message, options);
    }
  }
}

// Create singleton instance
const toastManager = new ToastManager();

// For debugging - add to window in development
if (import.meta.env.DEV) {
  window.toastManager = toastManager;
  window.clearToastHistory = () => toastManager.clearHistory();
  window.forceToast = (type, message) => toastManager.forceShow(type, message);
  
  // Debug function to see toast state
  window.debugToasts = () => {
    console.log('=== TOAST DEBUG INFO ===');
    console.log('Last toasts:', Array.from(toastManager.lastToasts.entries()));
    console.log('Pending toasts:', toastManager.pendingToasts.size);
    console.log('Global history size:', toastManager.globalToastHistory.size);
    console.log('Global history:', Array.from(toastManager.globalToastHistory));
  };
}

export default toastManager;