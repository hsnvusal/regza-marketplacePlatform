// src/admin/pages/AdminProductDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import adminService from '../services/adminService';

const AdminProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (productId) {
      loadProductDetails();
      loadProductReviews();
      loadProductOrderHistory();
    }
  }, [productId]);

  const loadProductDetails = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await adminService.getProductDetails(productId);
      
      if (result.success) {
        setProduct(result.product);
      } else {
        setError(result.error || 'Məhsul məlumatları tapılmadı');
      }
    } catch (error) {
      console.error('Product details loading error:', error);
      setError('Məhsul məlumatları yüklənərkən xəta baş verdi');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductReviews = async () => {
    try {
      const result = await adminService.getProductReviews(productId, { limit: 10 });
      if (result.success) {
        setReviews(result.reviews);
      }
    } catch (error) {
      console.error('Reviews loading error:', error);
    }
  };

  const loadProductOrderHistory = async () => {
    try {
      const result = await adminService.getProductOrderHistory(productId, { limit: 10 });
      if (result.success) {
        setOrderHistory(result.orders);
      }
    } catch (error) {
      console.error('Order history loading error:', error);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!window.confirm(`Məhsul statusunu "${getStatusText(newStatus)}" olaraq dəyişmək istəyirsiniz?`)) {
      return;
    }

    setIsUpdating(true);
    
    try {
      const result = await adminService.updateProductStatus(productId, {
        status: newStatus,
        adminId: admin._id,
        adminName: `${admin.firstName} ${admin.lastName}`
      });
      
      if (result.success) {
        setProduct(prev => ({ ...prev, status: newStatus }));
        alert('Məhsul statusu uğurla yeniləndi!');
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

  const handleStockUpdate = async (newStock) => {
    const stock = parseInt(newStock);
    if (isNaN(stock) || stock < 0) {
      alert('Düzgün stok miqdarı daxil edin');
      return;
    }

    setIsUpdating(true);
    
    try {
      const result = await adminService.updateProductStock(productId, {
        stock: stock,
        adminId: admin._id
      });
      
      if (result.success) {
        setProduct(prev => ({ ...prev, stock: stock }));
        alert('Stok miqdarı yeniləndi!');
      } else {
        alert('Xəta: ' + result.error);
      }
    } catch (error) {
      console.error('Stock update error:', error);
      alert('Stok yeniləmə xətası');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm('Bu məhsulu silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.')) {
      return;
    }

    setIsUpdating(true);
    
    try {
      const result = await adminService.deleteProduct(productId);
      
      if (result.success) {
        alert('Məhsul silindi!');
        navigate('/admin/products');
      } else {
        alert('Xəta: ' + result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silinmə xətası');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'active': 'Aktiv',
      'inactive': 'Deaktiv',
      'pending': 'Gözləyir',
      'rejected': 'Rədd edilib'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'active': '#10b981',
      'inactive': '#6b7280',
      'pending': '#f59e0b',
      'rejected': '#ef4444'
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

  const getRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= rating ? 'filled' : ''}`}>
          ⭐
        </span>
      );
    }
    return stars;
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Məhsul məlumatları yüklənir...</p>
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
          <button onClick={loadProductDetails} className="retry-btn">
            🔄 Yenidən cəhd edin
          </button>
          <button onClick={() => navigate('/admin/products')} className="back-btn">
            ← Məhsullar siyahısına qayıt
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="admin-error">
        <div className="error-message">
          ❌ Məhsul tapılmadı
        </div>
        <button onClick={() => navigate('/admin/products')} className="back-btn">
          ← Məhsullar siyahısına qayıt
        </button>
      </div>
    );
  }

  return (
    <div className="admin-product-details">
      {/* Header */}
      <div className="product-details-header">
        <div className="header-left">
          <Link to="/admin/products" className="back-link">
            ← Məhsullar
          </Link>
          <h1>{product.name}</h1>
          <div 
            className="status-badge large"
            style={{ 
              backgroundColor: getStatusColor(product.status),
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: '500'
            }}
          >
            {getStatusText(product.status)}
          </div>
        </div>
        
        <div className="header-actions">
          <Link to={`/admin/products/${product._id}/edit`} className="edit-btn">
            ✏️ Redaktə et
          </Link>
          <button onClick={() => loadProductDetails()} className="refresh-btn">
            🔄 Yenilə
          </button>
          <button 
            onClick={handleDeleteProduct} 
            className="delete-btn"
            disabled={isUpdating}
          >
            🗑️ Sil
          </button>
        </div>
      </div>

      {/* Product Info Grid */}
      <div className="product-info-grid">
        {/* Images Section */}
        <div className="product-images">
          <div className="main-image">
            <img 
              src={product.images?.[selectedImage] || '/placeholder.jpg'} 
              alt={product.name}
            />
          </div>
          {product.images && product.images.length > 1 && (
            <div className="image-thumbnails">
              {product.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="product-basic-info">
          <div className="info-card">
            <h3>📋 Əsas Məlumatlar</h3>
            <div className="info-content">
              <p><strong>SKU:</strong> {product.sku}</p>
              <p><strong>Kateqoriya:</strong> {product.category?.name || '-'}</p>
              <p><strong>Marka:</strong> {product.brand || '-'}</p>
              <p><strong>Satıcı:</strong> {product.vendor?.businessName || '-'}</p>
              <p><strong>Yaradılma tarixi:</strong> {formatDate(product.createdAt)}</p>
              <p><strong>Son yeniləmə:</strong> {formatDate(product.updatedAt)}</p>
            </div>
          </div>

          <div className="info-card">
            <h3>💰 Qiymət Məlumatları</h3>
            <div className="info-content">
              <p><strong>Əsas qiymət:</strong> {formatPrice(product.price)}</p>
              {product.discountPrice && (
                <p><strong>Endirimli qiymət:</strong> {formatPrice(product.discountPrice)}</p>
              )}
              {product.cost && (
                <p><strong>Maya dəyəri:</strong> {formatPrice(product.cost)}</p>
              )}
              {product.discountPrice && (
                <p><strong>Endirim faizi:</strong> 
                  {Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stock & Status Management */}
        <div className="product-management">
          <div className="info-card">
            <h3>📦 Stok İdarəetməsi</h3>
            <div className="info-content">
              <div className="stock-info">
                <p><strong>Cari stok:</strong> 
                  <span className={`stock-value ${product.stock <= product.lowStockThreshold ? 'low' : 'normal'}`}>
                    {product.stock} ədəd
                  </span>
                </p>
                <p><strong>Az stok hədd:</strong> {product.lowStockThreshold} ədəd</p>
                <p><strong>Satılmış:</strong> {product.soldCount || 0} ədəd</p>
              </div>
              
              <div className="stock-actions">
                <label htmlFor="newStock">Yeni stok miqdarı:</label>
                <div className="stock-input-group">
                  <input
                    type="number"
                    id="newStock"
                    min="0"
                    placeholder={product.stock}
                    disabled={isUpdating}
                  />
                  <button 
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      handleStockUpdate(input.value);
                      input.value = '';
                    }}
                    disabled={isUpdating}
                    className="update-stock-btn"
                  >
                    📦 Yenilə
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h3>🔄 Status İdarəetməsi</h3>
            <div className="info-content">
              <p><strong>Cari status:</strong> {getStatusText(product.status)}</p>
              
              <div className="status-actions">
                <h4>Status dəyişdir:</h4>
                <div className="status-buttons">
                  {product.status !== 'active' && (
                    <button 
                      onClick={() => handleStatusUpdate('active')}
                      className="status-btn active"
                      disabled={isUpdating}
                    >
                      ✅ Aktiv et
                    </button>
                  )}
                  {product.status !== 'inactive' && (
                    <button 
                      onClick={() => handleStatusUpdate('inactive')}
                      className="status-btn inactive"
                      disabled={isUpdating}
                    >
                      🔴 Deaktiv et
                    </button>
                  )}
                  {product.status === 'pending' && (
                    <button 
                      onClick={() => handleStatusUpdate('rejected')}
                      className="status-btn rejected"
                      disabled={isUpdating}
                    >
                      ❌ Rədd et
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="product-description">
        <h3>📄 Məhsul Təsviri</h3>
        <div className="description-content">
          {product.description ? (
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          ) : (
            <p className="no-description">Təsvir əlavə edilməyib</p>
          )}
        </div>
      </div>

      {/* Specifications */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <div className="product-specifications">
          <h3>🔧 Texniki Xüsusiyyətlər</h3>
          <div className="specifications-grid">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key} className="spec-item">
                <span className="spec-label">{key}:</span>
                <span className="spec-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="product-reviews">
          <h3>⭐ Məhsul Rəyləri ({reviews.length})</h3>
          <div className="reviews-summary">
            <div className="rating-average">
              <span className="rating-number">{product.averageRating?.toFixed(1) || '0.0'}</span>
              <div className="rating-stars">{getRatingStars(Math.round(product.averageRating || 0))}</div>
              <span className="rating-count">({product.reviewCount || 0} rəy)</span>
            </div>
          </div>
          
          <div className="reviews-list">
            {reviews.slice(0, 5).map((review, index) => (
              <div key={index} className="review-item">
                <div className="review-header">
                  <div className="reviewer-info">
                    <span className="reviewer-name">{review.customer?.firstName} {review.customer?.lastName}</span>
                    <div className="review-rating">{getRatingStars(review.rating)}</div>
                  </div>
                  <span className="review-date">{formatDate(review.createdAt)}</span>
                </div>
                <div className="review-content">
                  <p>{review.comment}</p>
                </div>
              </div>
            ))}
          </div>
          
          {reviews.length > 5 && (
            <div className="reviews-more">
              <Link to={`/admin/products/${product._id}/reviews`} className="view-all-reviews">
                Bütün rəyləri gör ({reviews.length})
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Order History */}
      {orderHistory.length > 0 && (
        <div className="product-order-history">
          <h3>📊 Sifariş Tarixçəsi</h3>
          <div className="order-history-table">
            <table>
              <thead>
                <tr>
                  <th>Sifariş #</th>
                  <th>Müştəri</th>
                  <th>Miqdar</th>
                  <th>Qiymət</th>
                  <th>Status</th>
                  <th>Tarix</th>
                </tr>
              </thead>
              <tbody>
                {orderHistory.slice(0, 10).map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/admin/orders/${order._id}`} className="order-link">
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td>{order.customer?.firstName} {order.customer?.lastName}</td>
                    <td>{order.quantity} ədəd</td>
                    <td>{formatPrice(order.price)}</td>
                    <td>
                      <span className={`status-badge ${order.status}`}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {orderHistory.length > 10 && (
            <div className="order-history-more">
              <Link to={`/admin/products/${product._id}/orders`} className="view-all-orders">
                Bütün sifarişləri gör ({orderHistory.length})
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Analytics Summary */}
      <div className="product-analytics">
        <h3>📈 Məhsul Analitikası</h3>
        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="analytics-value">{product.viewCount || 0}</div>
            <div className="analytics-label">Baxış sayı</div>
          </div>
          <div className="analytics-card">
            <div className="analytics-value">{product.soldCount || 0}</div>
            <div className="analytics-label">Satılan miqdar</div>
          </div>
          <div className="analytics-card">
            <div className="analytics-value">{formatPrice((product.soldCount || 0) * product.price)}</div>
            <div className="analytics-label">Ümumi satış</div>
          </div>
          <div className="analytics-card">
            <div className="analytics-value">{product.reviewCount || 0}</div>
            <div className="analytics-label">Rəy sayı</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProductDetails;