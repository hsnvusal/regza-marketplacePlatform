import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ordersService from '../services/ordersService';
import toastManager from '../utils/toastManager';
import './OrdersPage.css';

const OrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    limit: 10
  });

  // Filters
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    minAmount: searchParams.get('minAmount') || '',
    maxAmount: searchParams.get('maxAmount') || ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');

  // Load orders
  useEffect(() => {
    loadOrders();
  }, [user, searchParams]);

  const loadOrders = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const page = parseInt(searchParams.get('page')) || 1;
      const queryFilters = { ...filters };

      // Remove empty filters
      Object.keys(queryFilters).forEach(key => {
        if (!queryFilters[key] || queryFilters[key] === '') {
          delete queryFilters[key];
        }
      });

      console.log('🔄 Loading orders with filters:', queryFilters);

      let result;
      if (user.role === 'customer') {
        result = await ordersService.getMyOrders(page, pagination.limit, queryFilters);
      } else if (user.role === 'vendor') {
        result = await ordersService.getVendorOrders(page, pagination.limit, queryFilters);
      } else if (user.role === 'admin') {
        result = await ordersService.getAllOrders(page, pagination.limit, queryFilters);
      }

      if (result?.success) {
        console.log('✅ Orders loaded successfully:', result.data);
        
        // Backend response structure-ə uyğun
        const ordersData = result.data.orders || result.data.data || result.data || [];
        
        setOrders(ordersData);
        setPagination(prev => ({
          ...prev,
          currentPage: result.data.currentPage || result.data.page || page,
          totalOrders: result.data.totalOrders || result.data.total || result.data.totalCount || ordersData.length,
          totalPages: result.data.totalPages || Math.ceil((result.data.total || ordersData.length) / pagination.limit)
        }));
      } else {
        console.error('❌ Failed to load orders:', result?.error);
        toastManager.error(result?.error || 'Sifarişlər yüklənərkən xəta baş verdi');
        setOrders([]);
        setPagination(prev => ({
          ...prev,
          totalOrders: 0,
          totalPages: 1
        }));
      }
    } catch (error) {
      console.error('❌ Error loading orders:', error);
      toastManager.error('Sifarişlər yüklənərkən xəta baş verdi');
      setOrders([]);
      setPagination(prev => ({
        ...prev,
        totalOrders: 0,
        totalPages: 1
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateURL(newFilters, 1);
  };

  // Handle search with debounce
  const handleSearchChange = (value) => {
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
    
    // Simple debounce
    setTimeout(() => {
      updateURL(newFilters, 1);
    }, 500);
  };

  // Update URL with filters
  const updateURL = (newFilters, page = pagination.currentPage) => {
    const params = new URLSearchParams();
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '') {
        params.set(key, value);
      }
    });

    if (page > 1) {
      params.set('page', page.toString());
    }

    setSearchParams(params);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    updateURL(filters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle order status update (admin/vendor only)
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      console.log('🔄 Updating order status:', { orderId, newStatus });
      
      let result;
      if (user.role === 'vendor') {
        result = await ordersService.updateVendorOrderStatus(orderId, newStatus);
      } else if (user.role === 'admin') {
        result = await ordersService.updateOrderStatus(orderId, newStatus);
      }

      if (result?.success) {
        // Update local state
        setOrders(prev => 
          prev.map(order => 
            getOrderId(order) === orderId 
              ? { ...order, status: newStatus }
              : order
          )
        );
        toastManager.success(result.message || 'Sifariş statusu yeniləndi');
      } else {
        toastManager.error(result?.error || 'Status yenilənərkən xəta baş verdi');
      }
    } catch (error) {
      console.error('❌ Error updating status:', error);
      toastManager.error('Status yenilənərkən xəta baş verdi');
    }
  };

  // Handle order tracking (customer)
  // Handle order tracking (customer)
const handleTrackOrder = async (orderId) => {
  try {
    console.log('🔄 Tracking order:', orderId);
    
    // Birbaşa tracking səhifəsinə get
    navigate(`/orders/${orderId}/tracking`);
    
    // Əgər tracking data yükləmək istəyirsinizsə (opsional):
    /*
    const result = await ordersService.trackOrder(orderId);
    if (result?.success) {
      console.log('✅ Tracking data:', result.data);
      toastManager.success('İzləmə məlumatları yükləndi');
      navigate(`/orders/${orderId}/tracking`);
    } else {
      toastManager.error(result?.error || 'İzləmə məlumatları yüklənmədi');
    }
    */
  } catch (error) {
    console.error('❌ Error tracking order:', error);
    toastManager.error('İzləmə xətası');
  }
};



  // Handle order cancellation (customer)
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bu sifarişi ləğv etmək istədiyinizə əminsiniz?')) return;

    try {
      console.log('🔄 Cancelling order:', orderId);
      
      const result = await ordersService.cancelOrder(orderId, 'Müştəri tərəfindən ləğv edildi');
      if (result?.success) {
        // Update local state
        setOrders(prev => 
          prev.map(order => 
            getOrderId(order) === orderId 
              ? { ...order, status: 'cancelled' }
              : order
          )
        );
        toastManager.success(result.message || 'Sifariş ləğv edildi');
      } else {
        toastManager.error(result?.error || 'Sifariş ləğv edilmədi');
      }
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      toastManager.error('Ləğv edilmədi');
    }
  };

  // Handle bulk actions (admin/vendor)
  const handleBulkAction = async () => {
    if (!bulkAction || selectedOrders.size === 0) return;

    const orderIds = Array.from(selectedOrders);
    
    if (!window.confirm(`${orderIds.length} sifarişin statusunu "${getStatusText(bulkAction)}" olaraq dəyişmək istədiyinizə əminsiniz?`)) return;

    try {
      console.log('🔄 Bulk updating orders:', { orderIds, status: bulkAction });
      
      // Individual updates - çünki bulk API olmaya bilər
      let successCount = 0;
      for (const orderId of orderIds) {
        try {
          await handleStatusUpdate(orderId, bulkAction);
          successCount++;
        } catch (error) {
          console.error('Error updating order:', orderId, error);
        }
      }
      
      toastManager.success(`${successCount}/${orderIds.length} sifariş yeniləndi`);
      setSelectedOrders(new Set());
      setBulkAction('');
    } catch (error) {
      console.error('❌ Error in bulk action:', error);
      toastManager.error('Toplu əməliyyat uğursuz oldu');
    }
  };

  // Handle export orders
  const handleExportOrders = async () => {
    try {
      console.log('🔄 Exporting orders with filters:', filters);
      
      const result = await ordersService.exportOrders(filters, 'xlsx');
      if (result?.success) {
        toastManager.success(result.message || 'Sifarişlər ixrac edildi');
      } else {
        toastManager.error(result?.error || 'İxrac edilmədi');
      }
    } catch (error) {
      console.error('❌ Error exporting orders:', error);
      toastManager.error('İxrac edilmədi');
    }
  };

  // Clear filters
  const clearFilters = () => {
    const clearedFilters = {
      status: '',
      search: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: ''
    };
    setFilters(clearedFilters);
    setSearchParams(new URLSearchParams());
  };

  // Utility functions
  const formatPrice = (price) => {
    return new Intl.NumberFormat('az-AZ').format(price || 0) + ' AZN';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Naməlum';
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      processing: '#8b5cf6',
      shipped: '#06b6d4',
      delivered: '#10b981',
      cancelled: '#ef4444',
      refunded: '#f97316',
      completed: '#10b981'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Gözləyir',
      confirmed: 'Təsdiqləndi',
      processing: 'İşlənir',
      shipped: 'Göndərildi',
      delivered: 'Çatdırıldı',
      cancelled: 'Ləğv edildi',
      refunded: 'Geri qaytarıldı',
      completed: 'Tamamlandı'
    };
    return texts[status] || status;
  };

  const getOrderStatuses = () => {
    return [
      { value: 'pending', label: 'Gözləyir' },
      { value: 'confirmed', label: 'Təsdiqləndi' },
      { value: 'processing', label: 'İşlənir' },
      { value: 'shipped', label: 'Göndərildi' },
      { value: 'delivered', label: 'Çatdırıldı' },
      { value: 'cancelled', label: 'Ləğv edildi' },
      { value: 'refunded', label: 'Geri qaytarıldı' },
      { value: 'completed', label: 'Tamamlandı' }
    ];
  };

  const canCancelOrder = (order) => {
    return user?.role === 'customer' && 
           ['pending', 'confirmed'].includes(order.status);
  };

  const canUpdateStatus = (order) => {
    return (user?.role === 'admin' || user?.role === 'vendor') &&
           !['completed', 'cancelled', 'refunded'].includes(order.status);
  };

  const getOrderId = (order) => {
    return order._id || order.id;
  };

  const getOrderNumber = (order) => {
    return order.orderNumber || order._id || order.id;
  };

  const getCustomerName = (order) => {
    if (order.customer) {
      if (order.customer.firstName && order.customer.lastName) {
        return `${order.customer.firstName} ${order.customer.lastName}`;
      }
      return order.customer.name || order.customer.email || 'Naməlum müştəri';
    }
    return 'Naməlum müştəri';
  };

  const getVendorName = (order) => {
    // Vendor order structure-ə görə
    if (order.vendorOrders && order.vendorOrders.length > 0) {
      const vendor = order.vendorOrders[0].vendor;
      if (vendor) {
        return vendor.businessName || vendor.name || vendor.firstName + ' ' + vendor.lastName || 'Naməlum satıcı';
      }
    }
    if (order.vendor) {
      return order.vendor.businessName || order.vendor.name || 'Naməlum satıcı';
    }
    return 'Naməlum satıcı';
  };

  const getOrderItems = (order) => {
    if (order.vendorOrders && order.vendorOrders.length > 0) {
      // Flatten all items from all vendor orders
      return order.vendorOrders.reduce((allItems, vendorOrder) => {
        return allItems.concat(vendorOrder.items || []);
      }, []);
    }
    return order.items || [];
  };

  const getOrderTotal = (order) => {
    return order.pricing?.total || order.total || order.totalAmount || 0;
  };

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(value => 
    value && value !== ''
  ).length;

  if (isLoading) {
    return (
      <div className="orders-loading">
        <div className="loading-spinner"></div>
        <p>Sifarişlər yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        {/* Header */}
        <div className="orders-header">
          <div className="header-left">
            <h1>
              {user?.role === 'customer' ? '🛒 Sifarişlərim' : 
               user?.role === 'vendor' ? '📦 Vendor Sifarişləri' : 
               '📦 Bütün Sifarişlər'}
            </h1>
            <p>
              {pagination.totalOrders > 0 
                ? `${pagination.totalOrders} sifariş tapıldı`
                : 'Sifariş tapılmadı'
              }
            </p>
          </div>
          
          <div className="header-actions">
            <button 
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              🔽 Filtrlər
              {activeFiltersCount > 0 && (
                <span className="filter-badge">({activeFiltersCount})</span>
              )}
            </button>
            
            {user?.role !== 'customer' && (
              <button className="export-btn" onClick={handleExportOrders}>
                📊 İxrac et
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="orders-filters">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Axtarış</label>
                <input
                  type="text"
                  placeholder="Sifariş ID, müştəri adı..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Bütün statuslar</option>
                  {getOrderStatuses().map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Tarix aralığı</label>
                <div className="date-range">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                  <span>-</span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>Məbləğ aralığı</label>
                <div className="amount-range">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minAmount}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxAmount}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="filter-actions">
              <button onClick={clearFilters} className="clear-filters">
                Filtrlərı təmizlə
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions (Admin/Vendor only) */}
        {user?.role !== 'customer' && selectedOrders.size > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">
              {selectedOrders.size} sifariş seçildi
            </span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">Əməliyyat seçin</option>
              {getOrderStatuses().map(status => (
                <option key={status.value} value={status.value}>
                  {status.label} olaraq işarələ
                </option>
              ))}
            </select>
            <button 
              onClick={handleBulkAction}
              className="apply-bulk"
              disabled={!bulkAction}
            >
              Tətbiq et
            </button>
          </div>
        )}

        {/* Orders List */}
        {orders.length > 0 ? (
          <>
            {user?.role === 'customer' ? (
              /* Customer Orders - Card Layout */
              <div className="customer-orders">
                {orders.map(order => {
                  const items = getOrderItems(order);
                  return (
                    <div key={getOrderId(order)} className="customer-order-card">
                      <div className="order-card-header">
                        <div className="order-id">#{getOrderNumber(order)}</div>
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

                      <div className="order-card-content">
                        <div className="order-vendor">
                          <strong>Satıcı:</strong> {getVendorName(order)}
                        </div>
                        
                        <div className="order-items">
                          {items.slice(0, 2).map((item, index) => (
                            <div key={index} className="order-item">
                              <span className="item-emoji">
                                {item.productSnapshot?.image ? '🖼️' : '📦'}
                              </span>
                              <span className="item-name">
                                {item.productSnapshot?.name || item.product?.name || 'Məhsul'}
                              </span>
                              <span className="item-quantity">x{item.quantity || 1}</span>
                            </div>
                          ))}
                          {items.length > 2 && (
                            <div className="more-items">
                              +{items.length - 2} daha
                            </div>
                          )}
                        </div>

                        <div className="order-details">
                          <div className="order-amount">
                            <strong>{formatPrice(getOrderTotal(order))}</strong>
                          </div>
                          <div className="order-date">
                            {formatDate(order.placedAt || order.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="order-card-actions">
                        <button 
                          className="action-btn primary"
                          onClick={() => navigate(`/orders/${getOrderId(order)}`)}
                        >
                          👁️ Ətraflı
                        </button>
                        <button 
                          className="action-btn secondary"
                          onClick={() => handleTrackOrder(getOrderId(order))}
                        >
                          📍 İzlə
                        </button>
                        {canCancelOrder(order) && (
                          <button 
                            className="action-btn danger"
                            onClick={() => handleCancelOrder(getOrderId(order))}
                          >
                            ❌ Ləğv et
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Admin/Vendor Orders - Table Layout */
              <div className="admin-orders">
                <div className="orders-table">
                  <div className="table-header">
                    <div className="table-cell checkbox-cell">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrders(new Set(orders.map(o => getOrderId(o))));
                          } else {
                            setSelectedOrders(new Set());
                          }
                        }}
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                      />
                    </div>
                    <div className="table-cell">Sifariş ID</div>
                    <div className="table-cell">Müştəri</div>
                    <div className="table-cell">Məhsullar</div>
                    <div className="table-cell">Məbləğ</div>
                    <div className="table-cell">Status</div>
                    <div className="table-cell">Tarix</div>
                    <div className="table-cell">Əməliyyatlar</div>
                  </div>

                  {orders.map(order => {
                    const items = getOrderItems(order);
                    return (
                      <div key={getOrderId(order)} className="table-row">
                        <div className="table-cell checkbox-cell">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(getOrderId(order))}
                            onChange={(e) => {
                              const orderId = getOrderId(order);
                              const newSelected = new Set(selectedOrders);
                              if (e.target.checked) {
                                newSelected.add(orderId);
                              } else {
                                newSelected.delete(orderId);
                              }
                              setSelectedOrders(newSelected);
                            }}
                          />
                        </div>
                        
                        <div className="table-cell order-id-cell">
                          #{getOrderNumber(order)}
                        </div>
                        
                        <div className="table-cell customer-cell">
                          <div className="customer-info">
                            <div className="customer-name">
                              {getCustomerName(order)}
                            </div>
                            <div className="customer-email">
                              {order.customer?.email}
                            </div>
                          </div>
                        </div>
                        
                        <div className="table-cell products-cell">
                          <div className="products-preview">
                            {items.slice(0, 2).map((item, index) => (
                              <span key={index} className="product-tag">
                                {item.productSnapshot?.name || item.product?.name || 'Məhsul'}
                              </span>
                            ))}
                            {items.length > 2 && (
                              <span className="more-products">
                                +{items.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="table-cell amount-cell">
                          {formatPrice(getOrderTotal(order))}
                        </div>
                        
                        <div className="table-cell status-cell">
                          {canUpdateStatus(order) ? (
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusUpdate(getOrderId(order), e.target.value)}
                              className="status-select"
                              style={{ color: getStatusColor(order.status) }}
                            >
                              {getOrderStatuses().map(status => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span 
                              className="status-badge"
                              style={{ color: getStatusColor(order.status) }}
                            >
                              {getStatusText(order.status)}
                            </span>
                          )}
                        </div>
                        
                        <div className="table-cell date-cell">
                          {formatDate(order.placedAt || order.createdAt)}
                        </div>
                        
                        <div className="table-cell actions-cell">
                          <button 
                            className="action-btn view"
                            onClick={() => navigate(`/orders/${getOrderId(order)}`)}
                            title="Ətraflı bax"
                          >
                            👁️
                          </button>
                          <button 
                            className="action-btn edit"
                            onClick={() => navigate(`/orders/${getOrderId(order)}/edit`)}
                            title="Redaktə et"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                >
                  ← Əvvəlki
                </button>

                <div className="page-numbers">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === pagination.totalPages || 
                      Math.abs(page - pagination.currentPage) <= 2
                    )
                    .map((page, index, array) => {
                      const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className="page-ellipsis">...</span>
                          )}
                          <button
                            className={`page-number ${page === pagination.currentPage ? 'active' : ''}`}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })
                  }
                </div>

                <button
                  className="page-btn"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                >
                  Növbəti →
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="empty-orders">
            <div className="empty-icon">📦</div>
            <h3>
              {user?.role === 'customer' ? 'Hələ sifarişiniz yoxdur' : 'Sifariş tapılmadı'}
            </h3>
            <p>
              {user?.role === 'customer' 
                ? 'İlk sifarişinizi vermək üçün məhsullara baxın'
                : 'Filtrləri dəyişdirərək yenidən cəhd edin'
              }
            </p>
            {user?.role === 'customer' ? (
              <button 
                className="browse-products-btn"
                onClick={() => navigate('/products')}
              >
                🛍️ Məhsullara bax
              </button>
            ) : (
              <button onClick={clearFilters} className="clear-filters-btn">
                Filtrlərı təmizlə
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;