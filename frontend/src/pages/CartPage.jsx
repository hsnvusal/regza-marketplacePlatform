import React, { useState, useOptimistic } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ordersService from '../services/ordersService';
import toastManager from '../utils/toastManager';
import './CartPage.css';

const CartPage = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  
  const { 
    cartItems = [], 
    total: cartTotal = 0,
    itemCount: cartItemsCount = 0,
    subtotal = 0,
    updateQuantity, 
    removeFromCart, 
    clearCart,
    isLoading: cartLoading = false 
  } = useCart() || {};

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState({ discount: 0, description: '' });
  const [shippingOption, setShippingOption] = useState('standard');
  
  // Optimistic updates for instant UI response
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    cartItems,
    (state, action) => {
      switch (action.type) {
        case 'UPDATE_QUANTITY':
          return state.map(item => {
            const itemId = item.id || item._id;
            return itemId === action.itemId 
              ? { ...item, quantity: action.quantity }
              : item;
          });
        case 'REMOVE_ITEM':
          return state.filter(item => {
            const itemId = item.id || item._id;
            return itemId !== action.itemId;
          });
        default:
          return state;
      }
    }
  );

  // Safe number helper
  const safeNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Promo codes
  const promoCodes = {
    'WELCOME10': { discount: 10, type: 'percentage', description: '10% endirim' },
    'SAVE20': { discount: 20, type: 'fixed', description: '20 AZN endirim' },
    'NEWUSER': { discount: 15, type: 'percentage', description: '15% yeni istifadəçi endirimi' }
  };

  // Shipping options
  const shippingOptions = [
    { id: 'standard', name: 'Standart çatdırılma', price: 5, days: '3-5 iş günü' },
    { id: 'express', name: 'Sürətli çatdırılma', price: 15, days: '1-2 iş günü' },
    { id: 'free', name: 'Pulsuz çatdırılma', price: 0, days: '5-7 iş günü', minOrder: 100 }
  ];

  // Calculate totals with optimistic items
  const calculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => {
      const unitPrice = safeNumber(item.unitPrice || item.price || item.product?.currentPrice || 0);
      const quantity = safeNumber(item.quantity || 1);
      return sum + (unitPrice * quantity);
    }, 0);
    
    const selectedShipping = shippingOptions.find(opt => opt.id === shippingOption);
    const canUseFreeShipping = subtotal >= 100;
    const shippingCost = shippingOption === 'free' && canUseFreeShipping ? 0 : safeNumber(selectedShipping?.price);
    const discountAmount = discount.type === 'percentage' 
      ? (subtotal * safeNumber(discount.discount)) / 100 
      : safeNumber(discount.discount);
    const finalTotal = Math.max(0, subtotal - discountAmount + shippingCost);
    
    return { subtotal, shippingCost, discountAmount, finalTotal, canUseFreeShipping };
  };

  const { subtotal: currentSubtotal, shippingCost, discountAmount, finalTotal, canUseFreeShipping } = calculateTotals(optimisticItems);

  // Handle quantity change with optimistic update
  const handleQuantityChange = async (itemId, newQuantity) => {
  if (newQuantity < 1) {
    handleRemoveItem(itemId);
    return;
  }
  
  // Original state-i yadda saxla
  const originalItems = [...optimisticItems];
  
  // Instant UI update
  setOptimisticItems({ type: 'UPDATE_QUANTITY', itemId, quantity: newQuantity });
  
  try {
    const result = await updateQuantity(itemId, newQuantity);
    
    if (!result.success) {
      // Xəta varsa original state-ə qaytar
      setOptimisticItems(originalItems);
      
      // Xətanın tipinə görə müxtəlif mesajlar
      if (result.error.includes('duplicate key')) {
        toastManager.error('Bu məhsul artıq səbətdə mövcuddur');
      } else if (result.error.includes('validation')) {
        toastManager.error('Yanlış məlumat daxil edildi');
      } else {
        toastManager.error(result.error || 'Miqdar yenilənmədi');
      }
    }
  } catch (error) {
    // Network və ya digər xətalar
    setOptimisticItems(originalItems);
    
    if (error.code === 11000) {
      toastManager.error('Təkrarlanan məhsul xətası');
    } else {
      toastManager.error('Əlaqə xətası. Yenidən cəhd edin.');
    }
    
    console.error('Cart update error:', error);
  }
};

  // Remove item with optimistic update
  const handleRemoveItem = async (itemId) => {
    // Instant UI update
    setOptimisticItems({ type: 'REMOVE_ITEM', itemId });
    
    try {
      const result = await removeFromCart(itemId);
      if (!result.success) {
        toastManager.error(result.error || 'Məhsul silinmədi');
        // Revert on error
        window.location.reload();
      }
    } catch (error) {
      toastManager.error('Məhsul silinmədi');
      window.location.reload();
    }
  };

  // Clear cart
  const handleClearCart = async () => {
    if (window.confirm('Bütün məhsulları səbətdən silmək istəyirsiniz?')) {
      try {
        await clearCart();
      } catch (error) {
        toastManager.error('Səbət təmizlənmədi');
      }
    }
  };

  // Apply promo
  const handleApplyPromo = () => {
    const code = promoCodes[promoCode.toUpperCase()];
    if (code) {
      setDiscount(code);
      toastManager.success(`${code.description} tətbiq edildi!`);
    } else {
      toastManager.error('Yanlış promo kodu');
      setDiscount({ discount: 0 });
    }
  };

  // Remove promo
  const handleRemovePromo = () => {
    setDiscount({ discount: 0 });
    setPromoCode('');
    toastManager.info('Promo kod silindi');
  };

  // 🔧 FIXED CHECKOUT - Real order creation
  const handleCheckout = async () => {
  if (!isLoggedIn) {
    toastManager.warning('Checkout üçün daxil olmalısınız');
    navigate('/login');
    return;
  }

  if (optimisticItems.length === 0) {
    toastManager.error('Səbət boşdur');
    return;
  }

  setIsCheckingOut(true);
  
  try {
    console.log('🚀 Starting checkout process...');
    
    const orderData = {
      shippingAddress: {
        firstName: user?.firstName || 'Müştəri',
        lastName: user?.lastName || 'Adı',
        phone: user?.phone || '+994501234567',
        email: user?.email,
        street: 'Nizami küçəsi 123',
        city: 'Bakı',
        country: 'Azerbaijan',
        deliveryInstructions: `Çatdırılma: ${shippingOptions.find(opt => opt.id === shippingOption)?.name}`
      },
      paymentMethod: 'cash_on_delivery',
      customerNotes: `Promo kod: ${promoCode || 'Yoxdur'}, Endirim: ${discountAmount.toFixed(2)} AZN`,
      specialInstructions: {
        giftWrap: false,
        priority: 'normal'
      }
    };

    console.log('📞 Calling ordersService.createOrder...');
    const result = await ordersService.createOrder(orderData);
    console.log('📦 Create order result:', result);
    
    if (result.success) {
      console.log('✅ Order created successfully');
      
      try {
        console.log('🧹 Clearing cart...');
        await clearCart();
        console.log('✅ Cart cleared successfully');
      } catch (clearError) {
        console.warn('⚠️ Cart clear error (order still created):', clearError);
      }
      
      const orderNumber = result.data?.order?.orderNumber || 'N/A';
      toastManager.success(`Sifariş uğurla yaradıldı! Sifariş nömrəsi: ${orderNumber}`);
      navigate('/orders');
      
    } else {
      console.error('❌ Order creation failed:', result.error);
      
      // Xəta tipinə görə müxtəlif mesajlar
      if (result.error.includes('duplicate')) {
        toastManager.error('Sifariş artıq mövcuddur');
      } else if (result.error.includes('validation')) {
        toastManager.error('Sifariş məlumatları düzgün deyil');
      } else if (result.error.includes('payment')) {
        toastManager.error('Ödəniş xətası baş verdi');
      } else {
        toastManager.error(result.error || 'Sifariş yaradılarkən xəta baş verdi');
      }
    }
    
  } catch (error) {
    console.error('❌ Checkout error:', error);
    
    // Network xətaları
    if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
      toastManager.error('İnternet əlaqəsi yoxdur');
    } else if (error.code === 11000) {
      toastManager.error('Təkrarlanan sifariş xətası');
    } else {
      toastManager.error('Sifariş zamanı xəta baş verdi');
    }
  } finally {
    setIsCheckingOut(false);
    console.log('🏁 Checkout process finished');
  }
};

  // Loading state
  if (cartLoading && cartItems.length === 0) {
    return (
      <div className="cart-loading">
        <div className="spinner"></div>
        <p>Səbət yüklənir...</p>
      </div>
    );
  }

  // Empty cart
  if (!Array.isArray(optimisticItems) || optimisticItems.length === 0) {
    return (
      <div className="empty-cart">
        <div className="empty-cart-content">
          <div className="empty-icon">🛒</div>
          <h1>Səbətiniz boşdur</h1>
          <p>Hələ heç bir məhsul əlavə etməmisiniz.</p>
          <Link to="/products" className="shop-btn">
            🛍️ Alış-verişə başla
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        {/* Header */}
        <div className="cart-header">
          <div>
            <h1>🛒 Alış-veriş Səbəti</h1>
            <p>{optimisticItems.length} məhsul - {currentSubtotal.toFixed(2)} AZN</p>
          </div>
          
          {optimisticItems.length > 0 && (
            <button onClick={handleClearCart} className="clear-btn">
              🗑️ Səbəti təmizlə
            </button>
          )}
        </div>

        <div className="cart-grid">
          {/* Cart Items */}
          <div className="cart-items">
            <h2>Məhsullar ({optimisticItems.length})</h2>

            <div className="items-list">
              {optimisticItems.map((item, index) => {
                if (!item || typeof item !== 'object') return null;

                const itemId = item.id || item._id || `item_${index}`;
                const product = item.product || item;
                const productName = product.name || item.name || 'Məhsul adı';
                const productImage = product.image || item.image;
                
                let productVendor = 'Satıcı';
                if (typeof product.vendor === 'string') {
                  productVendor = product.vendor;
                } else if (product.vendor && product.vendor.name) {
                  productVendor = product.vendor.name;
                } else if (product.vendor && product.vendor.businessName) {
                  productVendor = product.vendor.businessName;
                } else if (product.brand) {
                  productVendor = product.brand;
                }
                
                const productSku = product.sku || item.sku || '';
                const unitPrice = safeNumber(item.unitPrice || item.price || product.currentPrice || 0);
                const quantity = safeNumber(item.quantity || 1);
                const totalPrice = unitPrice * quantity;

                return (
                  <div key={itemId} className="cart-item">
                    {/* Product Image */}
                    <div className="item-image">
                      {productImage ? (
                        <img src={productImage} alt={productName} />
                      ) : (
                        <span className="no-image">📦</span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="item-info">
                      <h3>{productName}</h3>
                      <p className="item-meta">
                        {productVendor}{productSku && ` • ${productSku}`}
                      </p>
                      <p className="item-price">{unitPrice.toFixed(2)} AZN</p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="quantity-controls">
                      <button 
                        onClick={() => handleQuantityChange(itemId, quantity - 1)}
                        className="qty-btn"
                      >
                        −
                      </button>
                      <span className="quantity">{quantity}</span>
                      <button 
                        onClick={() => handleQuantityChange(itemId, quantity + 1)}
                        className="qty-btn"
                      >
                        +
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="item-total">
                      <p>{totalPrice.toFixed(2)} AZN</p>
                    </div>

                    {/* Remove Button */}
                    <button 
                      onClick={() => handleRemoveItem(itemId)}
                      className="remove-btn"
                      title="Məhsulu sil"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkout Sidebar */}
          <div className="checkout-sidebar">
            <h2>Sifariş xülasəsi</h2>

            {/* Promo Code */}
            <div className="promo-section">
              <label>Promo kod</label>
              <div className="promo-input">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                />
                {safeNumber(discount.discount) > 0 ? (
                  <button onClick={handleRemovePromo} className="remove-promo-btn">
                    ✕
                  </button>
                ) : (
                  <button onClick={handleApplyPromo} className="apply-promo-btn">
                    Tətbiq et
                  </button>
                )}
              </div>
              {safeNumber(discount.discount) > 0 && (
                <p className="promo-success">
                  ✅ {discount.description || 'Endirim'} tətbiq edildi
                </p>
              )}
            </div>

            {/* Shipping Options */}
            <div className="shipping-section">
              <label>Çatdırılma</label>
              {shippingOptions.map((option) => (
                <label key={option.id} className="shipping-option">
                  <input
                    type="radio"
                    name="shipping"
                    value={option.id}
                    checked={shippingOption === option.id}
                    onChange={(e) => setShippingOption(e.target.value)}
                    disabled={option.id === 'free' && !canUseFreeShipping}
                  />
                  <div className="option-info">
                    <div className="option-name">{option.name}</div>
                    <div className="option-days">
                      {option.days}
                      {option.minOrder && !canUseFreeShipping && 
                        ` (min ${option.minOrder} AZN)`
                      }
                    </div>
                  </div>
                  <div className="option-price">
                    {option.id === 'free' && canUseFreeShipping ? 'Pulsuz' : `${option.price} AZN`}
                  </div>
                </label>
              ))}
            </div>

            {/* Order Summary */}
            <div className="order-summary">
              <div className="summary-line">
                <span>Məhsullar:</span>
                <span>{currentSubtotal.toFixed(2)} AZN</span>
              </div>
              
              {safeNumber(discount.discount) > 0 && (
                <div className="summary-line discount">
                  <span>Endirim:</span>
                  <span>-{discountAmount.toFixed(2)} AZN</span>
                </div>
              )}
              
              <div className="summary-line">
                <span>Çatdırılma:</span>
                <span>{shippingCost === 0 ? 'Pulsuz' : `${shippingCost.toFixed(2)} AZN`}</span>
              </div>
              
              <div className="summary-total">
                <span>Ümumi:</span>
                <span>{finalTotal.toFixed(2)} AZN</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || optimisticItems.length === 0}
              className="checkout-btn"
            >
              {isCheckingOut ? '⏳ Sifarişlənir...' : '💳 Sifariş et'}
            </button>

            {/* Continue Shopping */}
            <Link to="/products" className="continue-shopping">
              ← Alış-verişə davam et
            </Link>

            {/* Security Notice */}
            <div className="security-notice">
              🔒 Təhlükəsiz ödəniş təmin edilir
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;