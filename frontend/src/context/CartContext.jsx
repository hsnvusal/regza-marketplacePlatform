import React, { createContext, useContext, useState, useEffect } from 'react';
import cartService from '../services/cartService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

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

  // Initialize user cart (authenticated users)
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

  // Sync guest cart with backend when user logs in
  const syncGuestCartWithBackend = async (guestItems) => {
    try {
      if (!guestItems.length) return;

      setIsLoading(true);
      
      // Sync each item with backend
      for (const item of guestItems) {
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

      // Clear guest cart and reload from backend
      clearGuestCartFromStorage();
      await loadCartFromBackend();
      
      if (guestItems.length > 0) {
        toast.success('Səbət sinxronlaşdırıldı');
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

  // Add item to cart
  const addToCart = async (product, quantity = 1, selectedVariants = []) => {
    try {
      setIsLoading(true);

      if (isLoggedIn) {
        // Use backend for authenticated users
        const result = await cartService.addToCart(
          product.id || product._id,
          quantity,
          selectedVariants
        );

        if (result.success) {
          await loadCartFromBackend();
          toast.success(`${product.name} səbətə əlavə edildi!`);
          return { success: true };
        } else {
          toast.error(result.error || 'Məhsul səbətə əlavə edilərkən xəta baş verdi');
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
      
      toast.error('Məhsul səbətə əlavə edilərkən xəta baş verdi');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Add to guest cart
  const addToGuestCart = (product, quantity, selectedVariants) => {
    try {
      const productId = product.id || product._id;
      const existingItemIndex = cartItems.findIndex(
        item => item.product.id === productId && 
        JSON.stringify(item.selectedVariants || []) === JSON.stringify(selectedVariants)
      );

      let updatedItems;
      if (existingItemIndex > -1) {
        // Update existing item
        updatedItems = cartItems.map((item, index) => 
          index === existingItemIndex 
            ? { 
                ...item, 
                quantity: item.quantity + quantity,
                totalPrice: (item.quantity + quantity) * item.unitPrice,
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
            vendor: product.vendor
          },
          quantity,
          unitPrice: product.currentPrice || product.pricing?.sellingPrice || 0,
          totalPrice: (product.currentPrice || product.pricing?.sellingPrice || 0) * quantity,
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
      
      toast.success(`${product.name} səbətə əlavə edildi!`);
      return { success: true };
    } catch (error) {
      console.error('Guest cart add error:', error);
      toast.error('Məhsul səbətə əlavə edilərkən xəta baş verdi');
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
          toast.error(result.error || 'Məhsul miqdarı yenilənərkən xəta baş verdi');
          return { success: false, error: result.error };
        }
      } else {
        // Handle guest cart locally
        const updatedItems = cartItems.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                quantity: newQuantity,
                totalPrice: newQuantity * item.unitPrice,
                updatedAt: new Date().toISOString()
              }
            : item
        );

        setCartItems(updatedItems);
        updateCartTotals(updatedItems);
        saveGuestCartToStorage(updatedItems);
        setLastUpdated(new Date());
        
        return { success: true };
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      toast.error('Məhsul miqdarı yenilənərkən xəta baş verdi');
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
          toast.success('Məhsul səbətdən çıxarıldı');
          return { success: true };
        } else {
          toast.error(result.error || 'Məhsul səbətdən çıxarılarkən xəta baş verdi');
          return { success: false, error: result.error };
        }
      } else {
        // Handle guest cart locally
        const updatedItems = cartItems.filter(item => item.id !== itemId);
        setCartItems(updatedItems);
        updateCartTotals(updatedItems);
        saveGuestCartToStorage(updatedItems);
        setLastUpdated(new Date());
        
        toast.success('Məhsul səbətdən çıxarıldı');
        return { success: true };
      }
    } catch (error) {
      console.error('Remove from cart error:', error);
      toast.error('Məhsul səbətdən çıxarılarkən xəta baş verdi');
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
          toast.success('Səbət təmizləndi');
          return { success: true };
        } else {
          toast.error(result.error || 'Səbət təmizlənərkən xəta baş verdi');
          return { success: false, error: result.error };
        }
      } else {
        // Handle guest cart locally
        resetCart();
        clearGuestCartFromStorage();
        toast.success('Səbət təmizləndi');
        return { success: true };
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      toast.error('Səbət təmizlənərkən xəta baş verdi');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Apply discount code (authenticated users only)
  const applyDiscount = async (discountCode) => {
    try {
      if (!isLoggedIn) {
        toast.error('Endirim kodu üçün hesabınıza daxil olun');
        return { success: false, error: 'Authentication required' };
      }

      setIsLoading(true);

      const result = await cartService.applyDiscount(discountCode);

      if (result.success) {
        await loadCartFromBackend();
        toast.success('Endirim kodu tətbiq edildi!');
        return { success: true, data: result.data };
      } else {
        toast.error(result.error || 'Endirim kodu tətbiq edilərkən xəta baş verdi');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Apply discount error:', error);
      toast.error('Endirim kodu tətbiq edilərkən xəta baş verdi');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate cart totals
  const updateCartTotals = (items) => {
    const itemCount = items.reduce((total, item) => total + (item.quantity || 0), 0);
    const subtotal = items.reduce((total, item) => total + (item.totalPrice || 0), 0);
    
    // Shipping calculation (free over 50₼)
    const shipping = subtotal > 50 ? 0 : (subtotal > 0 ? 5 : 0);
    
    // Tax calculation (18%)
    const tax = subtotal * 0.18;
    
    // Discount (would come from backend in real implementation)
    const discount = 0;
    
    const total = subtotal + shipping + tax - discount;

    const totals = {
      itemCount,
      subtotal: Number(subtotal.toFixed(2)),
      shipping: Number(shipping.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      total: Number(Math.max(0, total).toFixed(2))
    };

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