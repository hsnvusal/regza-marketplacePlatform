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
        selectedVariants
      });
      
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
  
  // Update cart item quantity
  async updateCartItem(itemId, quantity) {
    try {
      const response = await apiClient.put('/cart/update', {
        itemId,
        quantity: Number(quantity)
      });
      
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
  
  // Remove item from cart
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
  
  // Apply discount code
  async applyDiscount(discountCode) {
    try {
      const response = await apiClient.post('/cart/discount', {
        discountCode: discountCode.trim().toUpperCase()
      });
      
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
  
  // Remove discount
  async removeDiscount() {
    try {
      const response = await apiClient.delete('/cart/discount');
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
  
  // Sync guest cart with user cart when logging in
  async syncGuestCart(guestCartItems) {
    try {
      const response = await apiClient.post('/cart/sync', {
        guestItems: guestCartItems
      });
      
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
}

export default new CartService();