import React, { useState, useOptimistic, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ordersService from '../services/ordersService';
import toastManager from '../utils/toastManager';
import PaymentModal from '../components/PaymentModal'; // Import edilən Stripe modal
import './CartPage.css';

const CartPage = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  
  const { 
    cartItems = [], 
    total: cartTotal = 0,
    subtotal: cartSubtotal = 0,
    tax: cartTax = 0,
    itemCount: cartItemsCount = 0,
    updateQuantity, 
    removeFromCart, 
    clearCart,
    isLoading: cartLoading = false 
  } = useCart() || {};

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState({ discount: 0, description: '', type: 'fixed' });
  const [shippingOption, setShippingOption] = useState('standard');
  
  // 🆕 PAYMENT STATE
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Payment methods
  const paymentMethods = [
    {
      id: 'cash_on_delivery',
      name: 'Nağd ödəniş (çatdırılma zamanı)',
      icon: '💵',
      description: 'Məhsul çatdırılan zaman nağd ödəyin',
      fee: 0,
      enabled: true
    },
    {
      id: 'card',
      name: 'Kart ilə ödəniş (Stripe)',
      icon: '💳',
      description: 'Visa, Mastercard, Amex',
      fee: 0,
      enabled: true
    }
  ];

  // Optimistic updates (same as before)
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
    { id: 'free', name: 'Pulsuz çatdırılma', price: 0, days: '5-7 iş günü', minOrder: 50 }
  ];

  // Calculate display totals
  const calculateDisplayTotals = () => {
    const currentSubtotal = cartSubtotal || 0;
    
    const selectedShipping = shippingOptions.find(opt => opt.id === shippingOption);
    const canUseFreeShipping = currentSubtotal >= 50;
    const shippingCost = shippingOption === 'free' && canUseFreeShipping ? 0 : safeNumber(selectedShipping?.price);
    
    const discountAmount = discount.type === 'percentage' 
      ? (currentSubtotal * safeNumber(discount.discount)) / 100 
      : safeNumber(discount.discount);
    
    const taxAmount = cartTax || (currentSubtotal * 0.18);
    
    const selectedPayment = paymentMethods.find(pm => pm.id === paymentMethod);
    const paymentFee = safeNumber(selectedPayment?.fee || 0);
    
    const finalTotal = Math.max(0, currentSubtotal - discountAmount + shippingCost + taxAmount + paymentFee);
    
    return { 
      subtotal: currentSubtotal, 
      shippingCost, 
      discountAmount, 
      taxAmount,
      paymentFee,
      finalTotal, 
      canUseFreeShipping 
    };
  };

  const { subtotal: displaySubtotal, shippingCost, discountAmount, taxAmount, paymentFee, finalTotal, canUseFreeShipping } = calculateDisplayTotals();

  // Handle quantity change (same as before)
  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }
    
    setOptimisticItems({ type: 'UPDATE_QUANTITY', itemId, quantity: newQuantity });
    
    try {
      const result = await updateQuantity(itemId, newQuantity);
      if (!result.success) {
        toastManager.error(result.error || 'Miqdar yenilənmədi');
      }
    } catch (error) {
      toastManager.error('Əlaqə xətası. Yenidən cəhd edin.');
      console.error('Cart update error:', error);
    }
  };

  // Remove item (same as before)
  const handleRemoveItem = async (itemId) => {
    setOptimisticItems({ type: 'REMOVE_ITEM', itemId });
    
    try {
      const result = await removeFromCart(itemId);
      if (!result.success) {
        toastManager.error(result.error || 'Məhsul silinmədi');
        window.location.reload();
      }
    } catch (error) {
      toastManager.error('Məhsul silinmədi');
      window.location.reload();
    }
  };

  // Clear cart (same as before)
  const handleClearCart = async () => {
    if (window.confirm('Bütün məhsulları səbətdən silmək istəyirsiniz?')) {
      try {
        await clearCart();
      } catch (error) {
        toastManager.error('Səbət təmizlənmədi');
      }
    }
  };

  // Promo functions (same as before)
  const handleApplyPromo = () => {
    const code = promoCodes[promoCode.toUpperCase()];
    if (code) {
      setDiscount(code);
      toastManager.success(`${code.description} tətbiq edildi!`);
    } else {
      toastManager.error('Yanlış promo kodu');
      setDiscount({ discount: 0, type: 'fixed' });
    }
  };

  const handleRemovePromo = () => {
    setDiscount({ discount: 0, type: 'fixed' });
    setPromoCode('');
    toastManager.info('Promo kod silindi');
  };

  // 🔧 PREPARE BASE ORDER DATA
  const prepareOrderData = () => {
    const verifiedItems = cartItems?.map((item) => {
      let finalUnitPrice = 0;
      
      if (item.unitPrice && item.unitPrice > 0) {
        finalUnitPrice = item.unitPrice;
      } else if (item.product?.currentPrice && item.product.currentPrice > 0) {
        finalUnitPrice = item.product.currentPrice;
      } else if (item.product?.pricing?.sellingPrice && item.product.pricing.sellingPrice > 0) {
        finalUnitPrice = item.product.pricing.sellingPrice;
      } else if (item.price && item.price > 0) {
        finalUnitPrice = item.price;
      }
      
      return {
        ...item,
        verifiedUnitPrice: finalUnitPrice,
        verifiedTotal: finalUnitPrice * (item.quantity || 0)
      };
    }) || [];
    
    const checkoutSubtotal = verifiedItems.reduce((sum, item) => sum + item.verifiedTotal, 0);
    const checkoutTax = checkoutSubtotal * 0.18;
    
    return {
      items: verifiedItems.map(item => ({
        product: item.product?._id || item.product?.id || item.productId,
        productSnapshot: {
          name: item.product?.name || item.name,
          price: item.verifiedUnitPrice,
          image: item.product?.image || item.image,
          sku: item.product?.sku || item.sku
        },
        quantity: item.quantity,
        unitPrice: item.verifiedUnitPrice
      })),
      
      pricing: {
        subtotal: checkoutSubtotal,
        shippingCost: shippingCost,
        tax: checkoutTax,
        discountAmount: discountAmount,
        paymentFee: paymentFee,
        total: Math.max(0, checkoutSubtotal - discountAmount + shippingCost + checkoutTax + paymentFee)
      },
      
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
      
      paymentMethod: paymentMethod,
      customerNotes: `Promo kod: ${promoCode || 'Yoxdur'}, Endirim: ${discountAmount.toFixed(2)} AZN`,
      
      specialInstructions: {
        giftWrap: false,
        priority: 'normal'
      }
    };
  };

  // 🔧 MAIN CHECKOUT HANDLER
  const handleCheckout = async () => {
    console.log('🚀 ===== CHECKOUT START =====');
    console.log('💳 Payment Method:', paymentMethod);
    
    if (!isLoggedIn) {
      toastManager.warning('Checkout üçün daxil olmalısınız');
      navigate('/login');
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      toastManager.error('Səbət boşdur');
      return;
    }

    const baseOrderData = prepareOrderData();
    console.log('📦 Base Order Data:', baseOrderData);

    if (paymentMethod === 'cash_on_delivery') {
      // 💵 CASH PAYMENT - Direct order creation
      await handleCashPayment(baseOrderData);
    } else if (paymentMethod === 'card') {
      // 💳 CARD PAYMENT - Open Stripe modal
      handleCardPayment();
    }
  };

  // 💵 CASH PAYMENT HANDLER
  const handleCashPayment = async (orderData) => {
  setIsCheckingOut(true);
  
  try {
    console.log('💵 Processing cash payment...');
    
    const result = await ordersService.createOrder(orderData);
    
    if (result.success) {
      console.log('✅ Cash order created successfully');
      console.log('📦 Full cash order result:', JSON.stringify(result, null, 2));
      
      await clearCart();
      
      // 🔧 IMPROVED ORDER NUMBER EXTRACTION FOR CASH PAYMENT
      let orderNumber = 'N/A';
      
      // Debug - print full response structure
      console.log('🔍 Cash order response structure:');
      console.log('  - result.success:', result.success);
      console.log('  - result.data:', result.data);
      console.log('  - typeof result.data:', typeof result.data);
      
      // Check multiple possible paths
      if (result.data?.order?.orderNumber) {
        orderNumber = result.data.order.orderNumber;
        console.log('🔍 Found order number in result.data.order.orderNumber:', orderNumber);
      } else if (result.data?.orderNumber) {
        orderNumber = result.data.orderNumber;
        console.log('🔍 Found order number in result.data.orderNumber:', orderNumber);
      } else if (result.order?.orderNumber) {
        orderNumber = result.order.orderNumber;
        console.log('🔍 Found order number in result.order.orderNumber:', orderNumber);
      } else if (result.orderNumber) {
        orderNumber = result.orderNumber;
        console.log('🔍 Found order number in result.orderNumber:', orderNumber);
      } else {
        // If direct paths don't work, try to find it in nested objects
        console.log('🔍 Searching for order number in nested objects...');
        
        // Check if result.data is a nested object and search recursively
        const searchForOrderNumber = (obj, path = '') => {
          if (!obj || typeof obj !== 'object') return null;
          
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (key === 'orderNumber' && typeof value === 'string') {
              console.log(`🔍 Found order number at ${currentPath}:`, value);
              return value;
            }
            
            if (typeof value === 'object' && value !== null) {
              const found = searchForOrderNumber(value, currentPath);
              if (found) return found;
            }
          }
          return null;
        };
        
        const foundOrderNumber = searchForOrderNumber(result);
        if (foundOrderNumber) {
          orderNumber = foundOrderNumber;
        } else {
          console.warn('⚠️ Order number not found in response. Response keys:', Object.keys(result));
          if (result.data) {
            console.warn('⚠️ result.data keys:', Object.keys(result.data));
          }
        }
      }
      
      console.log('🔍 Final extracted order number:', orderNumber);
      
      toastManager.success(`Sifariş uğurla yaradıldı! Nömrə: ${orderNumber}`, '📦');
      navigate('/orders');
      
    } else {
      console.error('❌ Cash order creation failed:', result.error);
      toastManager.error(result.error || 'Sifariş yaradılarkən xəta baş verdi');
    }
    
  } catch (error) {
    console.error('❌ Cash payment error:', error);
    toastManager.error('Sifariş zamanı xəta baş verdi');
  } finally {
    setIsCheckingOut(false);
  }
};

  // 💳 CARD PAYMENT HANDLER
  const handleCardPayment = () => {
    console.log('💳 Opening Stripe payment modal...');
    setShowPaymentModal(true);
  };

  // ✅ PAYMENT SUCCESS HANDLER (Stripe success callback)
  const handlePaymentSuccess = async (paymentResult) => {
  try {
    console.log('✅ Payment successful, creating order...', paymentResult);
    
    const baseOrderData = prepareOrderData();
    
    // Add payment info to order
    const orderData = {
      ...baseOrderData,
      paymentInfo: {
        paymentIntentId: paymentResult.paymentIntentId,
        chargeId: paymentResult.chargeId,
        status: 'paid',
        paidAt: new Date().toISOString(),
        paymentMethod: 'card',
        amount: paymentResult.amount,
        currency: paymentResult.currency || 'usd'
      },
      status: 'paid', // Order is pre-paid
      paymentMethod: 'card' // Backend validation üçün
    };

    console.log('📦 Creating paid order with data:', JSON.stringify(orderData, null, 2));
    
    const result = await ordersService.createOrder(orderData);
    
    if (result.success) {
      console.log('✅ Paid order created successfully');
      console.log('📦 Full card order result:', JSON.stringify(result, null, 2));
      
      await clearCart();
      
      // 🔧 SAME ORDER NUMBER EXTRACTION LOGIC AS CASH PAYMENT
      let orderNumber = 'N/A';
      
      // Debug - print full response structure
      console.log('🔍 Card order response structure:');
      console.log('  - result.success:', result.success);
      console.log('  - result.data:', result.data);
      console.log('  - typeof result.data:', typeof result.data);
      
      // Check multiple possible paths
      if (result.data?.order?.orderNumber) {
        orderNumber = result.data.order.orderNumber;
        console.log('🔍 Found order number in result.data.order.orderNumber:', orderNumber);
      } else if (result.data?.orderNumber) {
        orderNumber = result.data.orderNumber;
        console.log('🔍 Found order number in result.data.orderNumber:', orderNumber);
      } else if (result.order?.orderNumber) {
        orderNumber = result.order.orderNumber;
        console.log('🔍 Found order number in result.order.orderNumber:', orderNumber);
      } else if (result.orderNumber) {
        orderNumber = result.orderNumber;
        console.log('🔍 Found order number in result.orderNumber:', orderNumber);
      } else {
        // If direct paths don't work, try to find it in nested objects
        console.log('🔍 Searching for order number in nested objects...');
        
        // Recursive search function
        const searchForOrderNumber = (obj, path = '') => {
          if (!obj || typeof obj !== 'object') return null;
          
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (key === 'orderNumber' && typeof value === 'string') {
              console.log(`🔍 Found order number at ${currentPath}:`, value);
              return value;
            }
            
            if (typeof value === 'object' && value !== null) {
              const found = searchForOrderNumber(value, currentPath);
              if (found) return found;
            }
          }
          return null;
        };
        
        const foundOrderNumber = searchForOrderNumber(result);
        if (foundOrderNumber) {
          orderNumber = foundOrderNumber;
        } else {
          console.warn('⚠️ Order number not found in response. Response keys:', Object.keys(result));
          if (result.data) {
            console.warn('⚠️ result.data keys:', Object.keys(result.data));
          }
        }
      }
      
      console.log('🔍 Final extracted order number:', orderNumber);
      
      toastManager.success(`Ödəniş uğurla tamamlandı! Sifariş nömrəsi: ${orderNumber}`, '💳');
      navigate('/orders');
      
    } else {
      console.error('❌ Paid order creation failed:', result.error);
      console.error('❌ Error details:', result.details);
      toastManager.error(`Ödəniş uğurlu amma sifariş yaradılmadı: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Post-payment order creation error:', error);
    toastManager.error('Ödəniş uğurlu amma sifariş yaradılmadı. Dəstək ilə əlaqə saxlayın.');
  } finally {
    setShowPaymentModal(false);
  }
};

  // ❌ PAYMENT ERROR HANDLER
  const handlePaymentError = (error) => {
    console.error('❌ Payment error:', error);
    toastManager.error(`Ödəniş xətası: ${error}`);
    setShowPaymentModal(false);
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
            <p>{optimisticItems.length} məhsul - {displaySubtotal.toFixed(2)} AZN (ƏDV daxil deyil)</p>
          </div>
          
          <div className="header-buttons">
            {optimisticItems.length > 0 && (
              <button onClick={handleClearCart} className="clear-btn">
                🗑️ Səbəti təmizlə
              </button>
            )}
          </div>
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
                    <div className="item-image">
                      {productImage ? (
                        <img src={productImage} alt={productName} />
                      ) : (
                        <span className="no-image">📦</span>
                      )}
                    </div>

                    <div className="item-info">
                      <h3>{productName}</h3>
                      <p className="item-meta">
                        {productVendor}{productSku && ` • ${productSku}`}
                      </p>
                      <p className="item-price">{unitPrice.toFixed(2)} AZN</p>
                    </div>

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

                    <div className="item-total">
                      <p>{totalPrice.toFixed(2)} AZN</p>
                    </div>

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

            {/* 🆕 PAYMENT METHODS */}
            <div className="payment-section">
              <label>Ödəniş üsulu</label>
              {paymentMethods.map((method) => (
                <label key={method.id} className="payment-option" data-payment={method.id}>
  <input
    type="radio"
    name="payment"
    value={method.id}
    checked={paymentMethod === method.id}
    onChange={(e) => setPaymentMethod(e.target.value)}
    disabled={!method.enabled}
  />
  <div className="option-info">
    <div className="option-name">
      <span className="payment-icon">{method.icon}</span>
      {method.name}
    </div>
    <div className="option-description">{method.description}</div>
  </div>
  {method.fee > 0 && (
  <div className="option-price">
    +{method.fee.toFixed(2)} AZN
  </div>
)}
</label>
              ))}
            </div>

            {/* Order Summary */}
            <div className="order-summary">
              <div className="summary-line">
                <span>Məhsullar:</span>
                <span>{displaySubtotal.toFixed(2)} AZN</span>
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
              
              <div className="summary-line">
                <span>ƏDV (18%):</span>
                <span>{taxAmount.toFixed(2)} AZN</span>
              </div>
              
              {paymentFee > 0 && (
                <div className="summary-line">
                  <span>Ödəniş haqqı:</span>
                  <span>{paymentFee.toFixed(2)} AZN</span>
                </div>
              )}
              
              <div className="summary-total">
                <span>Ümumi:</span>
                <span>{finalTotal.toFixed(2)} AZN</span>
              </div>
              
              {/* Payment info */}
              <div className="payment-info" style={{ fontSize: '12px', color: '#666', marginTop: '8px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <div>
                  <strong>
                    {paymentMethod === 'cash_on_delivery' ? '💵 Nağd ödəniş' : '💳 Kart ödənişi (Stripe)'}
                  </strong>
                </div>
                <div>
                  {paymentMethod === 'cash_on_delivery' 
                    ? 'Çatdırılma zamanı ödəyəcəksiniz'
                    : 'Təhlükəsiz Stripe ilə kartla ödəyəcəksiniz'
                  }
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || optimisticItems.length === 0}
              className="checkout-btn"
              style={{
                backgroundColor: paymentMethod === 'card' ? '#635BFF' : '#4CAF50', // Stripe purple for card
                opacity: isCheckingOut ? 0.7 : 1
              }}
            >
              {isCheckingOut ? (
                paymentMethod === 'card' 
                  ? '💳 Stripe-a yönləndirilir...' 
                  : '⏳ Sifarişlənir...'
              ) : (
                paymentMethod === 'card'
                  ? `💳 Stripe ilə ödə (${finalTotal.toFixed(2)} AZN)`
                  : `📦 Sifariş et (${finalTotal.toFixed(2)} AZN)`
              )}
            </button>

            {/* Continue Shopping */}
            <Link to="/products" className="continue-shopping">
              ← Alış-verişə davam et
            </Link>

            {/* Security Notice */}
            <div className="security-notice">
              🔒 Təhlükəsiz ödəniş təmin edilir
              <br />
              <small style={{ color: '#666' }}>
                {paymentMethod === 'card' 
                  ? '256-bit SSL şifrələmə + PCI DSS compliance'
                  : 'Bütün qiymətlərə 18% ƏDV daxildir'
                }
              </small>
            </div>
          </div>
        </div>

        {/* 🆕 STRIPE PAYMENT MODAL */}
        {showPaymentModal && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            amount={Math.round(finalTotal * 100)} // Convert to cents for Stripe
            currency="usd"
            customerInfo={{
              name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
              email: user?.email,
              phone: user?.phone
            }}
            orderInfo={{
              orderNumber: `ORD-${Date.now()}`,
              items: cartItems.map(item => ({
                name: item.product?.name || item.name,
                quantity: item.quantity,
                price: item.unitPrice || item.price
              }))
            }}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        )}
      </div>
    </div>
  );
};

export default CartPage;