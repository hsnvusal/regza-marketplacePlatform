// src/services/cartService.js
import apiClient, { handleApiResponse, handleApiError } from './api';

class CartService {
  // Get user's cart
  async getCart() {
    try {
      const response = await apiClient.get('/cart');
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
     
  // Add item to cart
  async addToCart(productId, quantity = 1, selectedVariants = []) {
    try {
      const response = await apiClient.post('/cart/add', {
        productId,
        quantity: Number(quantity),
        variants: selectedVariants // ✅ FIXED: backend expects 'variants' not 'selectedVariants'
      });
             
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
     
  // ✅ FIXED: Update cart item quantity - match backend route structure
  async updateCartItem(itemId, quantity) {
    try {
      const response = await apiClient.put(`/cart/update/${itemId}`, {
        quantity: Number(quantity)
      });
             
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
     
  // ✅ FIXED: Remove item from cart - match backend route structure
  async removeFromCart(itemId) {
    try {
      const response = await apiClient.delete(`/cart/remove/${itemId}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
     
  // Clear entire cart
  async clearCart() {
    try {
      const response = await apiClient.delete('/cart/clear');
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
     
  // ✅ FIXED: Apply discount code - match backend route
  async applyDiscount(discountCode) {
    try {
      const response = await apiClient.post('/cart/apply-coupon', {
        couponCode: discountCode.trim().toUpperCase()
      });
             
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
     
  // ✅ FIXED: Remove discount - match backend route  
  async removeDiscount(couponCode) {
    try {
      const response = await apiClient.delete(`/cart/remove-coupon/${couponCode.toUpperCase()}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
     
  // Get cart summary/totals
  async getCartSummary() {
    try {
      const response = await apiClient.get('/cart/summary');
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
     
  // ✅ REMOVED: syncGuestCart method not needed - backend handles this differently
  // The cart sync is handled automatically when user logs in via CartContext
  
  // ✅ ADDED: Get cart stats (admin only)
  async getCartStats() {
    try {
      const response = await apiClient.get('/cart/stats');
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ✅ ADDED: Get available routes info (development only)
  async getRoutesInfo() {
    try {
      if (process.env.NODE_ENV === 'development') {
        const response = await apiClient.get('/cart/info/routes');
        return handleApiResponse(response);
      }
      return { success: false, error: 'Only available in development' };
    } catch (error) {
      return handleApiError(error);
    }
  }
}

export default new CartService();