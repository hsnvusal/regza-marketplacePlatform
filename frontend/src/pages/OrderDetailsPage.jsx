import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ordersService from '../services/ordersService';
import toastManager from '../utils/toastManager';
import './OrderDetailsPage.css';

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Tracking form state
  const [trackingForm, setTrackingForm] = useState({
    trackingNumber: '',
    carrier: 'azerpost',
    status: 'shipped',
    location: '',
    notes: '',
    estimatedDelivery: ''
  });

  // Load order details
  useEffect(() => {
    if (orderId && user?.id) {
      loadOrderDetails();
    } else {
      console.warn('⚠️ Missing required data:', { orderId, userId: user?.id });
      if (!orderId) {
        toastManager.error('Sifariş ID tapılmadı');
        navigate('/orders');
      }
    }
  }, [orderId, user?.id]);

  const loadOrderDetails = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading order details for:', orderId);
      
      const result = await ordersService.getOrder(orderId);
      console.log('📋 Raw API response:', result);
      
      if (result?.success) {
        let orderData = null;
        
        if (result.data?.data?.order) {
          orderData = result.data.data.order;
          console.log('📦 Using nested data.data.order structure');
        } else if (result.data?.order) {
          orderData = result.data.order;
          console.log('📦 Using nested order structure');
        } else if (result.data && typeof result.data === 'object' && result.data.orderNumber) {
          orderData = result.data;
          console.log('📦 Using direct order structure');
        }
        
        if (orderData) {
          setOrder(orderData);
          console.log('✅ Order set successfully:', orderData.orderNumber);
        } else {
          console.error('❌ Could not extract order data from response');
          toastManager.error('Sifariş məlumatları düzgün formatda deyil');
          navigate('/orders');
        }
      } else {
        console.error('❌ API returned unsuccessful response:', result);
        toastManager.error(result?.error || 'Sifariş detayları yüklənmədi');
        navigate('/orders');
      }
    } catch (error) {
      console.error('❌ Error loading order:', error);
      toastManager.error('Sifariş detayları yüklənərkən xəta baş verdi');
      navigate('/orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!window.confirm('Bu sifarişi ləğv etmək istədiyinizə əminsiniz?')) return;

    try {
      const result = await ordersService.cancelOrder(orderId, 'Müştəri tərəfindən ləğv edildi');
      if (result?.success) {
        setOrder(prev => ({ ...prev, status: 'cancelled' }));
        toastManager.success('Sifariş ləğv edildi');
      } else {
        toastManager.error(result?.error || 'Sifariş ləğv edilmədi');
      }
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      toastManager.error('Ləğv edilərkən xəta baş verdi');
    }
  };

  // Handle payment confirmation (for admin/vendor)
  const handleConfirmPayment = async (paymentId) => {
    try {
      const result = await ordersService.confirmPayment(paymentId);
      if (result?.success) {
        setOrder(prev => ({
          ...prev,
          payment: { ...prev.payment, status: 'completed' }
        }));
        toastManager.success('Ödəniş təsdiqləndi');
      } else {
        toastManager.error(result?.error || 'Ödəniş təsdiqlənmədi');
      }
    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      toastManager.error('Ödəniş təsdiqləndikən xəta baş verdi');
    }
  };

  // Handle payment refund (for admin/vendor)
  const handleRefundPayment = async (paymentId) => {
    if (!window.confirm('Bu ödənişi geri qaytarmaq istədiyinizə əminsiniz?')) return;

    try {
      const result = await ordersService.refundPayment(paymentId);
      if (result?.success) {
        setOrder(prev => ({
          ...prev,
          payment: { ...prev.payment, status: 'refunded' }
        }));
        toastManager.success('Ödəniş geri qaytarıldı');
      } else {
        toastManager.error(result?.error || 'Ödəniş geri qaytarılmadı');
      }
    } catch (error) {
      console.error('❌ Error refunding payment:', error);
      toastManager.error('Geri qaytarılarkən xəta baş verdi');
    }
  };

  // Utility functions
  const formatPrice = (price) => {
    return ordersService.formatPrice(price);
  };

  // Təkmilləşdirilmiş tarix formatlaması
  const formatDate = (dateString) => {
    if (!dateString) return 'Tarix yoxdur';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Yanlış tarix formatı';
      }

      const day = date.getDate();
      const month = date.getMonth();
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      const monthNames = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
        'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
      ];

      return `${day} ${monthNames[month]} ${year}, ${hours}:${minutes}`;
      
    } catch (error) {
      console.error('Tarix formatlanarkən xəta:', error);
      return 'Tarix xətası';
    }
  };

  // Qısa tarix formatı
  const formatDateShort = (dateString) => {
    if (!dateString) return 'Tarix yoxdur';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Yanlış tarix';
      }

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}.${month}.${year}`;
      
    } catch (error) {
      return 'Tarix xətası';
    }
  };

  // Nisbi tarix
  const formatRelativeDate = (dateString) => {
    if (!dateString) return 'Tarix yoxdur';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) {
        return 'İndi';
      } else if (diffMins < 60) {
        return `${diffMins} dəqiqə əvvəl`;
      } else if (diffHours < 24) {
        return `${diffHours} saat əvvəl`;
      } else if (diffDays === 1) {
        return 'Dünən';
      } else if (diffDays < 7) {
        return `${diffDays} gün əvvəl`;
      } else {
        return formatDateShort(dateString);
      }
    } catch (error) {
      return 'Tarix xətası';
    }
  };

  const getStatusColor = (status) => {
    return ordersService.getStatusColor(status);
  };

  const getStatusText = (status) => {
    return ordersService.getStatusText(status);
  };

  const getOrderId = (order) => {
    return order?._id || order?.id;
  };

  const getOrderNumber = (order) => {
    return order?.orderNumber || order?._id || order?.id;
  };

  const getCustomerName = (order) => {
    if (order?.customer) {
      if (order.customer.firstName && order.customer.lastName) {
        return `${order.customer.firstName} ${order.customer.lastName}`;
      }
      return order.customer.name || order.customer.email || 'Naməlum müştəri';
    }
    return 'Naməlum müştəri';
  };

  const getVendorName = (vendorOrder) => {
    if (vendorOrder?.vendor) {
      const vendor = vendorOrder.vendor;
      if (vendor.businessName) return vendor.businessName;
      if (vendor.firstName && vendor.lastName) return `${vendor.firstName} ${vendor.lastName}`;
      if (vendor.name) return vendor.name;
      return vendor.email || 'Naməlum satıcı';
    }
    return 'Naməlum satıcı';
  };

  const getOrderItems = (order) => {
    if (order?.vendorOrders && order.vendorOrders.length > 0) {
      return order.vendorOrders.reduce((allItems, vendorOrder) => {
        return allItems.concat(vendorOrder.items || []);
      }, []);
    }
    return order?.items || [];
  };

  const getOrderTotal = (order) => {
    return order?.pricing?.total || order?.total || order?.totalAmount || 0;
  };

  const canCancelOrder = (order) => {
    return user?.role === 'customer' && 
           ['pending', 'confirmed'].includes(order?.status);
  };

  const canUpdateStatus = (order) => {
    return (user?.role === 'admin' || user?.role === 'vendor') &&
           !['completed', 'cancelled', 'refunded'].includes(order?.status);
  };

  const canUpdateTracking = () => {
    return user?.role === 'admin' || user?.role === 'vendor';
  };

  const canRefundPayment = (order) => {
    return (user?.role === 'admin' || user?.role === 'vendor') &&
           order?.payment?.status === 'completed' &&
           !['cancelled', 'refunded'].includes(order?.status);
  };

  if (isLoading) {
    return (
      <div className="order-details-loading">
        <div className="loading-spinner"></div>
        <p>Sifariş detayları yüklənir...</p>
        <p className="loading-debug">Order ID: {orderId}</p>
        <p className="loading-debug">User: {user?.email}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-not-found">
        <div className="not-found-icon">❌</div>
        <h2>Sifariş tapılmadı</h2>
        <p>Bu sifariş mövcud deyil və ya sizin ona giriş icazəniz yoxdur.</p>
        <div className="debug-info">
          <p><strong>Debug Info:</strong></p>
          <p>Order ID: {orderId}</p>
          <p>User: {user?.email}</p>
          <p>Role: {user?.role}</p>
        </div>
        <button onClick={() => navigate('/orders')} className="back-btn">
          ← Sifarişlərə qayıt
        </button>
        <button onClick={loadOrderDetails} className="retry-btn">
          🔄 Yenidən cəhd et
        </button>
      </div>
    );
  }

  console.log('🎨 Rendering order details:', {
    orderNumber: order.orderNumber,
    status: order.status,
    hasVendorOrders: !!order.vendorOrders?.length,
    hasPricing: !!order.pricing,
    hasCustomer: !!order.customer
  });

  const items = getOrderItems(order);
  console.log('📦 Order items:', items);

  return (
    <div className="order-details-page">
      <div className="order-details-container">
        {/* Header */}
        <div className="order-header">
          <div className="header-left">
            <button onClick={() => navigate('/orders')} className="back-btn">
              ← Geri
            </button>
            <div className="order-title">
              <h1>Sifariş #{getOrderNumber(order)}</h1>
              <div 
                className="order-status-badge"
                style={{ 
                  backgroundColor: getStatusColor(order.status) + '20',
                  color: getStatusColor(order.status)
                }}
              >
                {getStatusText(order.status)}
              </div>
            </div>
          </div>
          
          <div className="header-actions">
            {canCancelOrder(order) && (
              <button 
                className="cancel-order-btn" 
                onClick={handleCancelOrder}
              >
                ❌ Ləğv et
              </button>
            )}
            
            {user?.role === 'customer' && (
              <button 
                className="track-order-btn"
                onClick={() => navigate(`/orders/${orderId}/tracking`)}
              >
                📍 İzlə
              </button>
            )}
            
            {canUpdateTracking() && (
              <button 
                className="update-tracking-btn"
                onClick={() => setShowTrackingForm(true)}
              >
                📦 Tracking yenilə
              </button>
            )}
          </div>
        </div>

        <div className="order-content">

          {/* Order Info */}
          <div className="order-info-section">
            <h2>📋 Sifariş məlumatları</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Sifariş ID:</label>
                <span>#{getOrderNumber(order)}</span>
              </div>
              <div className="info-item">
                <label>📅 Sifariş tarixi:</label>
                <span className="order-date">
                  <div className="main-date">{formatDate(order.placedAt || order.createdAt)}</div>
                  <div className="relative-date">({formatRelativeDate(order.placedAt || order.createdAt)})</div>
                </span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span style={{ color: getStatusColor(order.status) }}>
                  {getStatusText(order.status)}
                </span>
              </div>
              <div className="info-item">
                <label>Ümumi məbləğ:</label>
                <span className="total-amount">{formatPrice(getOrderTotal(order))}</span>
              </div>
              {user?.role !== 'customer' && order.customer && (
                <div className="info-item">
                  <label>Müştəri:</label>
                  <span>{getCustomerName(order)}</span>
                </div>
              )}
              {order.customerNotes && (
                <div className="info-item full-width">
                  <label>Müştəri qeydi:</label>
                  <span>{order.customerNotes}</span>
                </div>
              )}
              {order.source && (
                <div className="info-item">
                  <label>Mənbə:</label>
                  <span>{order.source}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="order-items-section">
            <h2>🛍️ Sifariş edilən məhsullar</h2>
            
            {/* Vendor-lərə görə qruplaşdırılmış məhsullar */}
            {order.vendorOrders && order.vendorOrders.length > 0 ? (
              order.vendorOrders.map((vendorOrder, vendorIndex) => (
                <div key={vendorOrder._id || vendorIndex} className="vendor-order-group">
                  <div className="vendor-header">
                    <h3>🏪 {getVendorName(vendorOrder)}</h3>
                    <span className="vendor-order-number">
                      #{vendorOrder.vendorOrderNumber}
                    </span>
                    {vendorOrder.status && (
                      <span 
                        className="vendor-status-badge"
                        style={{ 
                          backgroundColor: getStatusColor(vendorOrder.status) + '20',
                          color: getStatusColor(vendorOrder.status)
                        }}
                      >
                        {getStatusText(vendorOrder.status)}
                      </span>
                    )}
                  </div>
                  
                  <div className="vendor-items">
                    {vendorOrder.items.map((item, itemIndex) => {
                      const product = item.productSnapshot || item.product || {};
                      return (
                        <div key={item._id || itemIndex} className="order-item">
                          <div className="item-image">
                            {product.image ? (
                              <img src={product.image} alt={product.name} />
                            ) : (
                              <div className="no-image">📦</div>
                            )}
                          </div>
                          <div className="item-details">
                            <h4>{product.name || 'Məhsul'}</h4>
                            {product.sku && (
                              <p className="item-sku">SKU: {product.sku}</p>
                            )}
                            {product.brand && (
                              <p className="item-brand">Brend: {product.brand}</p>
                            )}
                            <div className="item-quantity">
                              Miqdar: {item.quantity || 1}
                            </div>
                          </div>
                          <div className="item-pricing">
                            <div className="unit-price">
                              {formatPrice(item.unitPrice)} / ədəd
                            </div>
                            <div className="total-price">
                              {formatPrice(item.totalPrice || (item.unitPrice * item.quantity))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Vendor order tracking */}
                  {vendorOrder.tracking && (
                    <div className="vendor-tracking">
                      <strong>Bu vendor üçün tracking:</strong>
                      <span className="tracking-number">
                        {vendorOrder.tracking.trackingNumber}
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Fallback: əgər vendorOrders yoxdursa, birbaşa items göstər
              <div className="items-list">
                {getOrderItems(order).map((item, index) => {
                  const product = item.productSnapshot || item.product || {};
                  return (
                    <div key={item._id || index} className="order-item">
                      <div className="item-image">
                        {product.image ? (
                          <img src={product.image} alt={product.name} />
                        ) : (
                          <div className="no-image">📦</div>
                        )}
                      </div>
                      <div className="item-details">
                        <h3>{product.name || 'Məhsul'}</h3>
                        {product.sku && (
                          <p className="item-sku">SKU: {product.sku}</p>
                        )}
                        <div className="item-quantity">
                          Miqdar: {item.quantity || 1}
                        </div>
                      </div>
                      <div className="item-pricing">
                        <div className="unit-price">
                          {formatPrice(item.unitPrice)}
                        </div>
                        <div className="total-price">
                          {formatPrice((item.unitPrice || 0) * (item.quantity || 1))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div className="pricing-section">
            <h2>💰 Ödəniş detalları</h2>
            <div className="pricing-breakdown">
              <div className="pricing-row">
                <span>Məhsulların dəyəri:</span>
                <span>{formatPrice(order.pricing?.subtotal || 0)}</span>
              </div>
              {order.pricing?.shipping > 0 && (
                <div className="pricing-row">
                  <span>Çatdırılma:</span>
                  <span>{formatPrice(order.pricing.shipping)}</span>
                </div>
              )}
              {order.pricing?.tax > 0 && (
                <div className="pricing-row">
                  <span>Vergi:</span>
                  <span>{formatPrice(order.pricing.tax)}</span>
                </div>
              )}
              {order.pricing?.discount > 0 && (
                <div className="pricing-row discount">
                  <span>Endirim:</span>
                  <span>-{formatPrice(order.pricing.discount)}</span>
                </div>
              )}
              <div className="pricing-row total">
                <span><strong>Ümumi:</strong></span>
                <span><strong>{formatPrice(getOrderTotal(order))}</strong></span>
              </div>
            </div>
          </div>

          {/* Payment Info - Təkmilləşdirilmiş */}
          {order.payment && (
            <div className="payment-section">
              <h2>💳 Ödəniş məlumatları</h2>
              
              <div className="payment-card">
                <div className="payment-header">
                  <div className="payment-method-info">
                    <div className="payment-icon">
                      {order.payment.method === 'card' ? '💳' : 
                       order.payment.method === 'cash' ? '💵' : 
                       order.payment.method === 'bank_transfer' ? '🏦' : '💰'}
                    </div>
                    <div className="payment-details">
                      <span className="payment-method">
                        {order.payment.method === 'card' ? 'Kredit/Debit Kartı' :
                         order.payment.method === 'cash' ? 'Nağd ödəniş' :
                         order.payment.method === 'bank_transfer' ? 'Bank köçürməsi' :
                         ordersService.getPaymentMethodText(order.payment.method)}
                      </span>
                      
                      {order.payment.method === 'card' && (
                        <div className="card-info">
                          <span className="card-number">
                            •••• •••• •••• {order.payment.cardLast4 || '****'}
                          </span>
                          {order.payment.cardBrand && (
                            <span className="card-brand">
                              {order.payment.cardBrand.toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="payment-status-wrapper">
                    <span className={`payment-status ${order.payment.status}`}>
                      {order.payment.status === 'completed' ? '✅ Tamamlandı' :
                       order.payment.status === 'pending' ? '⏳ Gözləyir' :
                       order.payment.status === 'failed' ? '❌ Uğursuz' :
                       order.payment.status === 'refunded' ? '🔄 Geri qaytarıldı' :
                       ordersService.getPaymentStatusText(order.payment.status)}
                    </span>
                  </div>
                </div>

                <div className="payment-info">
                  <div className="payment-row">
                    <span>Ödəniş məbləği:</span>
                    <span className="payment-amount">
                      {formatPrice(order.payment.amount || getOrderTotal(order))}
                    </span>
                  </div>
                  
                  <div className="payment-row">
                    <span>Ödəniş üsulu:</span>
                    <span>
                      {order.payment.method === 'card' ? 'Kartla ödəniş' :
                       order.payment.method === 'cash' ? 'Çatdırılma zamanı nağd' :
                       order.payment.method === 'bank_transfer' ? 'Bank transferi' :
                       ordersService.getPaymentMethodText(order.payment.method)}
                    </span>
                  </div>
                  
                  <div className="payment-row">
                    <span>Ödəniş statusu:</span>
                    <span className={`payment-status ${order.payment.status}`}>
                      {order.payment.status === 'completed' ? 'Tamamlandı' :
                       order.payment.status === 'pending' ? 'Gözləyir' :
                       order.payment.status === 'failed' ? 'Uğursuz' :
                       order.payment.status === 'refunded' ? 'Geri qaytarıldı' :
                       ordersService.getPaymentStatusText(order.payment.status)}
                    </span>
                  </div>
                  
                  {order.payment.paidAt && (
                    <div className="payment-row">
                      <span>💳 Ödəniş tarixi:</span>
                      <span className="payment-date">
                        <div className="main-date">{formatDate(order.payment.paidAt)}</div>
                        <div className="relative-date">{formatRelativeDate(order.payment.paidAt)}</div>
                      </span>
                    </div>
                  )}
                  
                  {order.payment.transactionId && (
                    <div className="payment-row">
                      <span>Əməliyyat ID:</span>
                      <span className="transaction-id">{order.payment.transactionId}</span>
                    </div>
                  )}

                  {order.payment.method === 'card' && order.payment.cardHolderName && (
                    <div className="payment-row">
                      <span>Kart sahibi:</span>
                      <span>{order.payment.cardHolderName}</span>
                    </div>
                  )}

                  {order.payment.method === 'bank_transfer' && order.payment.bankName && (
                    <div className="payment-row">
                      <span>Bank:</span>
                      <span>{order.payment.bankName}</span>
                    </div>
                  )}

                  {order.payment.method === 'bank_transfer' && order.payment.referenceNumber && (
                    <div className="payment-row">
                      <span>İstinad nömrəsi:</span>
                      <span>{order.payment.referenceNumber}</span>
                    </div>
                  )}

                  {order.payment.processingFee && order.payment.processingFee > 0 && (
                    <div className="payment-row">
                      <span>Emal haqqı:</span>
                      <span>{formatPrice(order.payment.processingFee)}</span>
                    </div>
                  )}

                  {order.payment.gateway && (
                    <div className="payment-row">
                      <span>Ödəniş sistemi:</span>
                      <span>
                        {order.payment.gateway === 'stripe' ? 'Stripe' :
                         order.payment.gateway === 'paypal' ? 'PayPal' :
                         order.payment.gateway === 'kapital' ? 'Kapital Bank' :
                         order.payment.gateway === 'azerpost' ? 'Azərpoçt' :
                         order.payment.gateway}
                      </span>
                    </div>
                  )}
                </div>

                {/* Təhlükəsizlik məlumatları */}
                <div className="payment-security">
                  <div className="security-badge">
                    🔒 Bu ödəniş təhlükəsiz SSL şifrələməsi ilə həyata keçirilmişdir
                  </div>
                  {order.payment.verified && (
                    <div className="verification-badge">
                      ✅ Kart yoxlanması tamamlandı
                    </div>
                  )}
                </div>

                {/* Admin/Vendor üçün ödəniş əməliyyatları */}
                {(user?.role === 'admin' || user?.role === 'vendor') && (
                  <div className="payment-actions">
                    {order.payment.status === 'pending' && (
                      <button 
                        className="confirm-payment-btn"
                        onClick={() => handleConfirmPayment(order.payment.id)}
                      >
                        ✅ Ödənişi təsdiqlə
                      </button>
                    )}
                    
                    {order.payment.status === 'completed' && canRefundPayment(order) && (
                      <button 
                        className="refund-payment-btn"
                        onClick={() => handleRefundPayment(order.payment.id)}
                      >
                        🔄 Ödənişi geri qaytar
                      </button>
                    )}
                  </div>
                )}

                {/* Geri qaytarma məlumatları */}
                {order.payment.refunds && order.payment.refunds.length > 0 && (
                  <div className="refund-info">
                    <h3>🔄 Geri qaytarma tarixçəsi</h3>
                    {order.payment.refunds.map((refund, index) => (
                      <div key={index} className="refund-item">
                        <div className="refund-header">
                          <span className="refund-amount">
                            {formatPrice(refund.amount)}
                          </span>
                          <div className="refund-date-info">
                            <div className="refund-date-main">
                              {formatDate(refund.processedAt)}
                            </div>
                            <div className="refund-date-relative">
                              {formatRelativeDate(refund.processedAt)}
                            </div>
                          </div>
                        </div>
                        {refund.reason && (
                          <div className="refund-reason">
                            📝 Səbəb: {refund.reason}
                          </div>
                        )}
                        {refund.status && (
                          <div className={`refund-status ${refund.status}`}>
                            {refund.status === 'completed' ? '✅ Tamamlandı' :
                             refund.status === 'pending' ? '⏳ Proses edilir' :
                             refund.status === 'failed' ? '❌ Uğursuz' : refund.status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="shipping-section">
              <h2>🏠 Çatdırılma ünvanı</h2>
              <div className="address-info">
                <p>
                  <strong>
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  </strong>
                </p>
                <p>📧 {order.shippingAddress.email}</p>
                {order.shippingAddress.phone && (
                  <p>📞 {order.shippingAddress.phone}</p>
                )}
                {order.shippingAddress.street && (
                  <p>🏢 {order.shippingAddress.street}</p>
                )}
                {order.shippingAddress.city && (
                  <p>🏙️ {order.shippingAddress.city}</p>
                )}
                <p>🌍 {order.shippingAddress.country || 'Azerbaijan'}</p>
                {order.shippingAddress.deliveryInstructions && (
                  <div className="delivery-instructions">
                    <strong>📋 Çatdırılma təlimatları:</strong>
                    <p>{order.shippingAddress.deliveryInstructions}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order History - Təkmilləşdirilmiş */}
          {order.orderHistory && order.orderHistory.length > 0 && (
            <div className="order-history-section">
              <h2>📋 Sifariş tarixçəsi</h2>
              <div className="history-timeline">
                {order.orderHistory
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((history, index) => (
                    <div key={index} className="history-item">
                      <div className="history-timestamp">
                        <div className="history-date-main">
                          {formatDate(history.timestamp)}
                        </div>
                        <div className="history-date-relative">
                          {formatRelativeDate(history.timestamp)}
                        </div>
                      </div>
                      <div className="history-content">
                        <div className="history-status">
                          <span 
                            className="status-badge"
                            style={{ 
                              backgroundColor: getStatusColor(history.status) + '20',
                              color: getStatusColor(history.status)
                            }}
                          >
                            {getStatusText(history.status)}
                          </span>
                        </div>
                        {history.note && (
                          <div className="history-note">
                            💬 {history.note}
                          </div>
                        )}
                        {history.updatedBy && (
                          <div className="history-updated-by">
                            👤 {history.updatedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;