// src/admin/pages/AdminOrderDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import adminService from '../services/adminService';

const AdminOrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusHistory, setStatusHistory] = useState([]);
  const [notes, setNotes] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await adminService.getOrderDetails(orderId);
      
      if (result.success) {
        setOrder(result.order);
        setStatusHistory(result.order.statusHistory || []);
        setNotes(result.order.adminNotes || '');
      } else {
        setError(result.error || 'Sifariş məlumatları tapılmadı');
      }
    } catch (error) {
      console.error('Order details loading error:', error);
      setError('Sifariş məlumatları yüklənərkən xəta baş verdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!window.confirm(`Sifarişin statusunu "${getStatusText(newStatus)}" olaraq dəyişmək istəyirsiniz?`)) {
      return;
    }

    setIsUpdating(true);
    
    try {
      const result = await adminService.updateOrderStatus(orderId, {
        status: newStatus,
        adminId: admin._id,
        adminName: `${admin.firstName} ${admin.lastName}`,
        note: newNote.trim()
      });
      
      if (result.success) {
        setOrder(prev => ({ ...prev, status: newStatus }));
        setStatusHistory(prev => [...prev, {
          status: newStatus,
          timestamp: new Date(),
          admin: {
            id: admin._id,
            name: `${admin.firstName} ${admin.lastName}`
          },
          note: newNote.trim()
        }]);
        setNewNote('');
        alert('Sifariş statusu uğurla yeniləndi!');
      } else {
        alert('Xəta: ' + result.error);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Status yeniləmə xətası');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotesUpdate = async () => {
    setIsUpdating(true);
    
    try {
      const result = await adminService.updateOrderNotes(orderId, {
        notes: notes,
        adminId: admin._id
      });
      
      if (result.success) {
        alert('Qeydlər uğurla yeniləndi!');
      } else {
        alert('Xəta: ' + result.error);
      }
    } catch (error) {
      console.error('Notes update error:', error);
      alert('Qeydlər yeniləmə xətası');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Gözləyir',
      'confirmed': 'Təsdiqləndi',
      'processing': 'Hazırlanır',
      'shipped': 'Göndərildi',
      'delivered': 'Çatdırıldı',
      'completed': 'Tamamlandı',
      'cancelled': 'Ləğv edildi'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'pending': '#f59e0b',
      'confirmed': '#3b82f6',
      'processing': '#8b5cf6',
      'shipped': '#06b6d4',
      'delivered': '#10b981',
      'completed': '#059669',
      'cancelled': '#ef4444'
    };
    return colorMap[status] || '#6b7280';
  };

  const formatPrice = (amount) => {
    return adminService.formatPrice(amount);
  };

  const formatDate = (date) => {
    return adminService.formatDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Sifariş məlumatları yüklənir...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <div className="error-message">
          ❌ {error}
        </div>
        <div className="error-actions">
          <button onClick={loadOrderDetails} className="retry-btn">
            🔄 Yenidən cəhd edin
          </button>
          <button onClick={() => navigate('/admin/orders')} className="back-btn">
            ← Sifarişlər siyahısına qayıt
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="admin-error">
        <div className="error-message">
          ❌ Sifariş tapılmadı
        </div>
        <button onClick={() => navigate('/admin/orders')} className="back-btn">
          ← Sifarişlər siyahısına qayıt
        </button>
      </div>
    );
  }

  return (
    <div className="admin-order-details">
      {/* Header */}
      <div className="order-details-header">
        <div className="header-left">
          <Link to="/admin/orders" className="back-link">
            ← Sifarişlər
          </Link>
          <h1>Sifariş #{order.orderNumber}</h1>
          <div 
            className="status-badge large"
            style={{ 
              backgroundColor: getStatusColor(order.status),
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: '500'
            }}
          >
            {getStatusText(order.status)}
          </div>
        </div>
        
        <div className="header-actions">
          <button onClick={() => loadOrderDetails()} className="refresh-btn">
            🔄 Yenilə
          </button>
          <button onClick={() => window.print()} className="print-btn">
            🖨️ Çap et
          </button>
        </div>
      </div>

      {/* Order Info Grid */}
      <div className="order-info-grid">
        {/* Customer Info */}
        <div className="info-card">
          <h3>👤 Müştəri Məlumatları</h3>
          <div className="info-content">
            <p><strong>Ad:</strong> {order.customer.firstName} {order.customer.lastName}</p>
            <p><strong>Email:</strong> {order.customer.email}</p>
            <p><strong>Telefon:</strong> {order.customer.phone || 'Qeyd edilməyib'}</p>
            <p><strong>Qeydiyyat tarixi:</strong> {formatDate(order.customer.createdAt)}</p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="info-card">
          <h3>📍 Çatdırılma Ünvanı</h3>
          <div className="info-content">
            <p><strong>Ad:</strong> {order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
            <p><strong>Telefon:</strong> {order.shippingAddress.phone}</p>
            <p><strong>Ünvan:</strong> {order.shippingAddress.street}</p>
            <p><strong>Şəhər:</strong> {order.shippingAddress.city}</p>
            <p><strong>Rayon:</strong> {order.shippingAddress.district}</p>
            <p><strong>Poçt kodu:</strong> {order.shippingAddress.postalCode}</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="info-card">
          <h3>📋 Sifariş Məlumatları</h3>
          <div className="info-content">
            <p><strong>Sifariş tarixi:</strong> {formatDate(order.createdAt)}</p>
            <p><strong>Ödəniş metodu:</strong> {order.paymentMethod}</p>
            <p><strong>Ödəniş statusu:</strong> 
              <span className={`payment-status ${order.paymentStatus}`}>
                {order.paymentStatus === 'paid' ? 'Ödənilib' : 'Ödənilməyib'}
              </span>
            </p>
            <p><strong>Çatdırılma metodu:</strong> {order.deliveryMethod}</p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="order-items-section">
        <h3>📦 Sifariş Məhsulları</h3>
        <div className="order-items-table">
          <table>
            <thead>
              <tr>
                <th>Məhsul</th>
                <th>Qiymət</th>
                <th>Miqdar</th>
                <th>Cəmi</th>
              </tr>
            </thead>
            <tbody>
              {order.vendorOrders?.flatMap(vo => vo.items.map((item, index) => (
                <tr key={item.id || index}>
                  <td>
                    <div className="product-info">
                      <img 
                        src={item.product?.image || '/placeholder.jpg'} 
                        alt={item.product?.name}
                        className="product-image"
                      />
                      <div>
                        <div className="product-name">{item.product?.name}</div>
                        <div className="product-sku">SKU: {item.product?.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="price">{formatPrice(item.unitPrice)}</td>
                  <td className="quantity">{item.quantity}</td>
                  <td className="total">{formatPrice(item.totalPrice)}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Order Totals */}
        <div className="order-totals">
          <div className="total-row">
            <span>Məhsulların cəmi:</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="total-row">
            <span>Çatdırılma:</span>
            <span>{formatPrice(order.shippingCost)}</span>
          </div>
          <div className="total-row">
            <span>Vergi:</span>
            <span>{formatPrice(order.tax)}</span>
          </div>
          <div className="total-row final">
            <span>Ümumi məbləğ:</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Status Management */}
      <div className="status-management">
        <h3>🔄 Status İdarəetməsi</h3>
        
        <div className="status-actions">
          <div className="quick-actions">
            <h4>Tez əməliyyatlar:</h4>
            <div className="action-buttons">
              {order.status === 'pending' && (
                <button 
                  onClick={() => handleStatusUpdate('confirmed')}
                  className="status-btn confirm"
                  disabled={isUpdating}
                >
                  ✅ Təsdiqlə
                </button>
              )}
              {order.status === 'confirmed' && (
                <button 
                  onClick={() => handleStatusUpdate('processing')}
                  className="status-btn process"
                  disabled={isUpdating}
                >
                  ⚙️ Hazırla
                </button>
              )}
              {order.status === 'processing' && (
                <button 
                  onClick={() => handleStatusUpdate('shipped')}
                  className="status-btn ship"
                  disabled={isUpdating}
                >
                  🚚 Göndər
                </button>
              )}
              {order.status === 'shipped' && (
                <button 
                  onClick={() => handleStatusUpdate('delivered')}
                  className="status-btn deliver"
                  disabled={isUpdating}
                >
                  📦 Çatdır
                </button>
              )}
              {order.status === 'delivered' && (
                <button 
                  onClick={() => handleStatusUpdate('completed')}
                  className="status-btn complete"
                  disabled={isUpdating}
                >
                  ✅ Tamamla
                </button>
              )}
              <button 
                onClick={() => handleStatusUpdate('cancelled')}
                className="status-btn cancel"
                disabled={isUpdating || order.status === 'completed'}
              >
                ❌ Ləğv et
              </button>
            </div>
          </div>

          <div className="status-note">
            <label htmlFor="statusNote">Status dəyişikliyi qeydi:</label>
            <textarea
              id="statusNote"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Status dəyişikliyi ilə bağlı qeyd əlavə edin..."
              disabled={isUpdating}
            />
          </div>
        </div>
      </div>

      {/* Status History */}
      {statusHistory.length > 0 && (
        <div className="status-history">
          <h3>📜 Status Tarixçəsi</h3>
          <div className="history-timeline">
            {statusHistory.map((entry, index) => (
              <div key={index} className="history-item">
                <div className="history-marker" style={{ backgroundColor: getStatusColor(entry.status) }}></div>
                <div className="history-content">
                  <div className="history-status">{getStatusText(entry.status)}</div>
                  <div className="history-meta">
                    {formatDate(entry.timestamp)} • {entry.admin?.name || 'Sistem'}
                  </div>
                  {entry.note && (
                    <div className="history-note">{entry.note}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Notes */}
      <div className="admin-notes">
        <h3>📝 Admin Qeydləri</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bu sifariş haqqında qeydlər əlavə edin..."
          disabled={isUpdating}
          rows="6"
        />
        <button 
          onClick={handleNotesUpdate}
          className="save-notes-btn"
          disabled={isUpdating}
        >
          {isUpdating ? '⏳ Yadda saxlanılır...' : '💾 Qeydləri Yadda Saxla'}
        </button>
      </div>
    </div>
  );
};

export default AdminOrderDetails;