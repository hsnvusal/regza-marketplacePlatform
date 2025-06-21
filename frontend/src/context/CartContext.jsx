import React, { createContext, useContext, useState, useEffect } from 'react';
import cartService from '../services/cartService';
import { useAuth } from './AuthContext';
import toastManager from '../utils/toastManager';

// Create Cart Context
const CartContext = createContext();

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Cart Provider Component
export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartId, setCartId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [cartTotals, setCartTotals] = useState({
    itemCount: 0,
    subtotal: 0,
    shipping: 0,
    tax: 0,
    discount: 0,
    total: 0
  });

  const { isLoggedIn, user, isInitialized } = useAuth();

  // Initialize cart when auth state is ready
  useEffect(() => {
    if (isInitialized) {
      if (isLoggedIn) {
        initializeUserCart();
      } else {
        loadGuestCart();
      }
    }
  }, [isLoggedIn, isInitialized]);

  // ✅ FIXED: Initialize user cart (authenticated users)
  const initializeUserCart = async () => {
    try {
      setIsLoading(true);
      
      // Check if there's a guest cart to sync first
      const guestCart = getGuestCartFromStorage();
      if (guestCart.length > 0) {
        await syncGuestCartWithBackend(guestCart);
      } else {
        await loadCartFromBackend();
      }
    } catch (error) {
      console.error('Error initializing user cart:', error);
      // Fallback to guest cart if backend fails
      loadGuestCart();
    } finally {
      setIsLoading(false);
    }
  };

  // Load cart from backend
  const loadCartFromBackend = async () => {
    try {
      const result = await cartService.getCart();
      
      if (result.success && result.data.cart) {
        const cart = result.data.cart;
        setCartItems(cart.items || []);
        setCartId(cart._id);
        updateCartTotals(cart.items || []);
        setLastUpdated(new Date());
        
        // Save backup to localStorage
        saveGuestCartToStorage(cart.items || []);
      } else {
        // No cart found or error, start with empty cart
        resetCart();
      }
    } catch (error) {
      console.error('Error loading cart from backend:', error);
      // Fallback to guest cart
      loadGuestCart();
    }
  };

  // Load guest cart from localStorage
  const loadGuestCart = () => {
    try {
      const guestCart = getGuestCartFromStorage();
      setCartItems(guestCart);
      setCartId(null);
      updateCartTotals(guestCart);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading guest cart:', error);
      resetCart();
    }
  };

  // Get guest cart from localStorage
  const getGuestCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem('marketplace_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Error reading guest cart:', error);
      return [];
    }
  };

  // Save guest cart to localStorage
  const saveGuestCartToStorage = (items) => {
    try {
      localStorage.setItem('marketplace_cart', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving guest cart:', error);
    }
  };

  // Clear guest cart from localStorage
  const clearGuestCartFromStorage = () => {
    try {
      localStorage.removeItem('marketplace_cart');
    } catch (error) {
      console.error('Error clearing guest cart:', error);
    }
  };

  // ✅ FIXED: Sync guest cart with backend when user logs in
  const syncGuestCartWithBackend = async (guestItems) => {
    try {
      if (!guestItems.length) return;

      // 🛡️ FIX 1: Check if sync was already done recently
      const lastSyncTime = localStorage.getItem('last_cart_sync');
      const now = Date.now();
      
      // Don't sync if last sync was less than 5 minutes ago
      if (lastSyncTime && (now - parseInt(lastSyncTime)) < 5 * 60 * 1000) {
        console.log('🔄 Cart sync skipped - recent sync detected');
        await loadCartFromBackend();
        return;
      }

      // 🛡️ FIX 2: Check if user just logged in (not page refresh)
      const userJustLoggedIn = sessionStorage.getItem('user_just_logged_in');
      if (!userJustLoggedIn) {
        console.log('🔄 Cart sync skipped - no fresh login detected');
        // Just load existing cart instead of syncing
        await loadCartFromBackend();
        clearGuestCartFromStorage(); // Clean up guest cart
        return;
      }

      console.log('🔄 Starting cart sync for fresh login');
      setIsLoading(true);
      
      // 🛡️ FIX 3: Get current backend cart first
      let existingCart = [];
      try {
        const backendResult = await cartService.getCart();
        if (backendResult.success && backendResult.data.cart) {
          existingCart = backendResult.data.cart.items || [];
        }
      } catch (error) {
        console.error('Error getting existing cart:', error);
      }
      
      // 🛡️ FIX 4: Only sync items that don't exist in backend cart
      const itemsToSync = guestItems.filter(guestItem => {
        const guestProductId = guestItem.product.id || guestItem.product._id;
        const existsInBackend = existingCart.some(backendItem => {
          const backendProductId = backendItem.product._id || backendItem.product.id;
          return backendProductId === guestProductId;
        });
        return !existsInBackend;
      });

      if (itemsToSync.length === 0) {
        console.log('🔄 No new items to sync - all items already in backend cart');
        clearGuestCartFromStorage();
        await loadCartFromBackend();
        
        // 🛡️ FIX 5: Mark sync as completed and clear flags
        localStorage.setItem('last_cart_sync', now.toString());
        sessionStorage.removeItem('user_just_logged_in');
        return;
      }

      console.log(`🔄 Syncing ${itemsToSync.length} new items to backend`);
      
      // Sync only new items with backend
      for (const item of itemsToSync) {
        try {
          await cartService.addToCart(
            item.product.id || item.product._id,
            item.quantity,
            item.selectedVariants || []
          );
        } catch (error) {
          console.error('Error syncing cart item:', item, error);
        }
      }

      // 🛡️ FIX 5: Mark sync as completed and clear flags
      localStorage.setItem('last_cart_sync', now.toString());
      sessionStorage.removeItem('user_just_logged_in');
      clearGuestCartFromStorage();
      await loadCartFromBackend();
      
      if (itemsToSync.length > 0) {
        toastManager.actionSuccess(`${itemsToSync.length} məhsul sinxronlaşdırıldı`, '🔄');
      }
    } catch (error) {
      console.error('Cart sync error:', error);
      // If sync fails, keep guest cart
      loadGuestCart();
    }
  };

  // Reset cart to empty state
  const resetCart = () => {
    setCartItems([]);
    setCartId(null);
    updateCartTotals([]);
    setLastUpdated(new Date());
  };

  // ✅ FIXED: Add item to cart with debug logging
  const addToCart = async (product, quantity = 1, selectedVariants = []) => {
    try {
      setIsLoading(true);
      
      // 🔍 DEBUG: Track who called addToCart
      console.log("🔍 =================================");
      console.log("🔍 addToCart CALLED!");
      console.log("🔍 Product:", product?.name || product);
      console.log("🔍 Stack trace:", new Error().stack);
      console.log("🔍 Timestamp:", new Date().toISOString());
      console.log("🔍 =================================");
      
      if (isLoggedIn) {
        // Use backend for authenticated users
        const result = await cartService.addToCart(
          product.id || product._id,
          quantity,
          selectedVariants
        );

        if (result.success) {
          await loadCartFromBackend();
          // NO TOAST HERE - it's handled by the calling component
          return { success: true };
        } else {
          toastManager.actionError(result.error || 'Məhsul səbətə əlavə edilərkən xəta baş verdi');
          return { success: false, error: result.error };
        }
      } else {
        // Handle guest cart locally
        return addToGuestCart(product, quantity, selectedVariants);
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      
      // Fallback to guest cart for network errors
      if (error.code === 'NETWORK_ERROR') {
        return addToGuestCart(product, quantity, selectedVariants);
      }
      
      toastManager.actionError('Məhsul səbətə əlavə edilərkən xəta baş verdi');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Add to guest cart - NO TOAST HERE to prevent duplicates
  const addToGuestCart = (product, quantity, selectedVariants) => {
  try {
    const productId = product.id || product._id;
    const existingItemIndex = cartItems.findIndex(
      item => item.product.id === productId && 
      JSON.stringify(item.selectedVariants || []) === JSON.stringify(selectedVariants)
    );

    // 🔧 FIX: Consistent price determination
    const unitPrice = product.currentPrice || 
                     product.pricing?.sellingPrice || 
                     product.price || 
                     0;

    console.log(`💰 Adding to guest cart - Product: ${product.name}, UnitPrice: ${unitPrice}, Quantity: ${quantity}`);

    let updatedItems;
    if (existingItemIndex > -1) {
      // Update existing item
      updatedItems = cartItems.map((item, index) => 
        index === existingItemIndex 
          ? { 
              ...item, 
              quantity: item.quantity + quantity,
              unitPrice: unitPrice, // 🔧 Ensure consistent unitPrice
              totalPrice: (item.quantity + quantity) * unitPrice, // 🔧 Calculate from unitPrice
              updatedAt: new Date().toISOString()
            }
          : item
      );
    } else {
      // Add new item
      const newItem = {
        id: `guest_${Date.now()}_${Math.random()}`,
        product: {
          id: productId,
          name: product.name,
          image: product.image || product.images?.[0]?.url || product.images?.[0],
          sku: product.sku,
          vendor: product.vendor,
          currentPrice: unitPrice // 🔧 Store consistent price in product too
        },
        quantity,
        unitPrice: unitPrice, // 🔧 Consistent unitPrice
        totalPrice: unitPrice * quantity, // 🔧 Calculate totalPrice
        selectedVariants: selectedVariants || [],
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedItems = [...cartItems, newItem];
    }

    setCartItems(updatedItems);
    updateCartTotals(updatedItems);
    saveGuestCartToStorage(updatedItems);
    setLastUpdated(new Date());
    
    return { success: true };
  } catch (error) {
    console.error('Guest cart add error:', error);
    toastManager.actionError('Məhsul səbətə əlavə edilərkən xəta baş verdi');
    return { success: false, error: error.message };
  }
};

  // Update item quantity
  const updateQuantity = async (itemId, newQuantity) => {
  try {
    if (newQuantity <= 0) {
      return await removeFromCart(itemId);
    }

    setIsLoading(true);

    if (isLoggedIn) {
      // Use backend for authenticated users
      const result = await cartService.updateCartItem(itemId, newQuantity);

      if (result.success) {
        await loadCartFromBackend();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } else {
      // Handle guest cart locally
      const updatedItems = cartItems.map(item => {
        if (item.id === itemId) {
          const unitPrice = item.unitPrice || 
                           item.product?.currentPrice || 
                           item.product?.pricing?.sellingPrice || 
                           item.price || 
                           0;
          
          console.log(`💰 Updating quantity - Item: ${item.product?.name}, UnitPrice: ${unitPrice}, NewQty: ${newQuantity}`);
          
          return {
            ...item, 
            quantity: newQuantity,
            unitPrice: unitPrice, // 🔧 Ensure unitPrice consistency
            totalPrice: newQuantity * unitPrice, // 🔧 Recalculate totalPrice
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });

      setCartItems(updatedItems);
      updateCartTotals(updatedItems);
      saveGuestCartToStorage(updatedItems);
      setLastUpdated(new Date());
      
      return { success: true };
    }
  } catch (error) {
    console.error('Update quantity error:', error);
    return { success: false, error: error.message };
  } finally {
    setIsLoading(false);
  }
};

  // Remove item from cart
  const removeFromCart = async (itemId) => {
    try {
      setIsLoading(true);

      if (isLoggedIn) {
        // Use backend for authenticated users
        const result = await cartService.removeFromCart(itemId);

        if (result.success) {
          await loadCartFromBackend();
          toastManager.actionSuccess('Məhsul səbətdən çıxarıldı', '🗑️');
          return { success: true };
        } else {
          toastManager.actionError(result.error || 'Məhsul səbətdən çıxarılarkən xəta baş verdi');
          return { success: false, error: result.error };
        }
      } else {
        // Handle guest cart locally
        const updatedItems = cartItems.filter(item => item.id !== itemId);
        setCartItems(updatedItems);
        updateCartTotals(updatedItems);
        saveGuestCartToStorage(updatedItems);
        setLastUpdated(new Date());
        
        toastManager.actionSuccess('Məhsul səbətdən çıxarıldı', '🗑️');
        return { success: true };
      }
    } catch (error) {
      console.error('Remove from cart error:', error);
      toastManager.actionError('Məhsul səbətdən çıxarılarkən xəta baş verdi');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    try {
      setIsLoading(true);

      if (isLoggedIn) {
        // Use backend for authenticated users
        const result = await cartService.clearCart();

        if (result.success) {
          resetCart();
          clearGuestCartFromStorage();
          toastManager.actionSuccess('Səbət təmizləndi', '🧹');
          return { success: true };
        } else {
          toastManager.actionError(result.error || 'Səbət təmizlənərkən xəta baş verdi');
          return { success: false, error: result.error };
        }
      } else {
        // Handle guest cart locally
        resetCart();
        clearGuestCartFromStorage();
        toastManager.actionSuccess('Səbət təmizləndi', '🧹');
        return { success: true };
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      toastManager.actionError('Səbət təmizlənərkən xəta baş verdi');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Apply discount code (authenticated users only)
  const applyDiscount = async (discountCode) => {
    try {
      if (!isLoggedIn) {
        toastManager.actionError('Endirim kodu üçün hesabınıza daxil olun');
        return { success: false, error: 'Authentication required' };
      }

      setIsLoading(true);

      const result = await cartService.applyDiscount(discountCode);

      if (result.success) {
        await loadCartFromBackend();
        toastManager.actionSuccess('Endirim kodu tətbiq edildi!', '🎉');
        return { success: true, data: result.data };
      } else {
        toastManager.actionError(result.error || 'Endirim kodu tətbiq edilərkən xəta baş verdi');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Apply discount error:', error);
      toastManager.actionError('Endirim kodu tətbiq edilərkən xəta baş verdi');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate cart totals
  const updateCartTotals = (items) => {
  console.log('🧮 Calculating cart totals for items:', items);
  
  const itemCount = items.reduce((total, item) => total + (item.quantity || 0), 0);
  
  const subtotal = items.reduce((total, item) => {
    const unitPrice = item.unitPrice || 
                     item.product?.currentPrice || 
                     item.product?.pricing?.sellingPrice || 
                     item.price || 
                     0;
    
    const quantity = item.quantity || 0;
    const itemTotal = unitPrice * quantity;
    
    console.log(`📦 Item: ${item.product?.name || 'Unknown'}, UnitPrice: ${unitPrice}, Qty: ${quantity}, Total: ${itemTotal}`);
    
    return total + itemTotal;
  }, 0);
  
  console.log('💰 Calculated subtotal:', subtotal);
  
  // Shipping calculation (free over 50₼)
  const shipping = subtotal > 50 ? 0 : (subtotal > 0 ? 5 : 0);
  
  // 🔧 CRITICAL FIX: TAX calculation to match backend (18% VAT in Azerbaijan)
  const taxRate = 0.18; // 18% VAT
  const tax = subtotal * taxRate; // Tax hesablanır
  
  console.log(`💰 Tax calculation: ${subtotal} * ${taxRate} = ${tax}`);
  
  // Discount (would come from backend in real implementation)
  const discount = 0;
  
  // 🔧 IMPORTANT: total = subtotal + shipping + tax
  const total = subtotal + shipping + tax - discount;

  const totals = {
    itemCount,
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    tax: Number(tax.toFixed(2)), // Real tax amount
    discount: Number(discount.toFixed(2)),
    total: Number(Math.max(0, total).toFixed(2)) // With tax
  };

  console.log('🧮 Final cart totals (WITH TAX):', totals);
  setCartTotals(totals);
  return totals;
};

  // Check if product is in cart
  const isInCart = (productId, selectedVariants = []) => {
    return cartItems.some(
      item => item.product.id === productId && 
      JSON.stringify(item.selectedVariants || []) === JSON.stringify(selectedVariants)
    );
  };

  // Get item quantity in cart
  const getItemQuantity = (productId, selectedVariants = []) => {
    const item = cartItems.find(
      item => item.product.id === productId && 
      JSON.stringify(item.selectedVariants || []) === JSON.stringify(selectedVariants)
    );
    return item ? item.quantity : 0;
  };

  // Get cart item by product ID
  const getCartItem = (productId, selectedVariants = []) => {
    return cartItems.find(
      item => item.product.id === productId && 
      JSON.stringify(item.selectedVariants || []) === JSON.stringify(selectedVariants)
    );
  };

  // Get current cart totals (helper function)
  const getCartTotals = () => {
    return cartTotals;
  };

  // Refresh cart from backend
  const refreshCart = async () => {
    if (isLoggedIn) {
      await loadCartFromBackend();
    } else {
      loadGuestCart();
    }
  };

  // ✅ ADDED: Helper function to mark user as just logged in
  const markUserAsJustLoggedIn = () => {
    sessionStorage.setItem('user_just_logged_in', 'true');
    console.log('🔐 User marked as just logged in');
  };

  // ✅ ADDED: Cleanup function for component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 CartProvider cleanup');
    };
  }, []);

  const value = {
    // State
    cartItems,
    cartId,
    isLoading,
    lastUpdated,
    
    // Functions
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyDiscount,
    refreshCart,
    getCartTotals,
    isInCart,
    getItemQuantity,
    getCartItem,
    markUserAsJustLoggedIn, // ✅ ADDED: Export this function
    
    // Computed values from totals
    ...cartTotals,
    
    // Additional computed values
    isEmpty: cartItems.length === 0,
    hasItems: cartItems.length > 0,
    isGuest: !isLoggedIn,
    needsShipping: cartTotals.subtotal > 0 && cartTotals.subtotal <= 50
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};