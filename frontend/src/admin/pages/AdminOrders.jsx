import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../services/adminService';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await adminService.getOrders(filters);
      
      if (result.success) {
        setOrders(result.orders);
        setPagination(result.pagination);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Orders loading error:', error);
      setError('Sifarişlər yüklənərkən xəta baş verdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const result = await adminService.updateOrderStatus(orderId, {
        status: newStatus
      });
      
      if (result.success) {
        // Refresh orders list
        loadOrders();
        alert('Sifariş statusu yeniləndi!');
      } else {
        alert('Xəta: ' + result.error);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Status yeniləmə xətası');
    }
  };

  const getStatusBadge = (status) => {
    const config = adminService.getStatusBadgeConfig(status);
    
    return (
      <span 
        className="status-badge"
        style={{ 
          backgroundColor: config.bg, 
          color: config.color,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: '500'
        }}
      >
        {config.text}
      </span>
    );
  };

  const formatDate = (date) => {
    return adminService.formatDate(date, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (amount) => {
    return adminService.formatPrice(amount);
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Sifarişlər yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="admin-orders">
      {/* Header & Filters */}
      <div className="orders-header">
        <div className="orders-stats">
          <div className="stat-item">
            <span className="stat-label">Ümumi:</span>
            <span className="stat-value">{pagination.totalOrders || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Səhifə:</span>
            <span className="stat-value">
              {pagination.currentPage || 1} / {pagination.totalPages || 1}
            </span>
          </div>
        </div>

        <div className="orders-filters">
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="all">Bütün statuslar</option>
            <option value="pending">Gözləyən</option>
            <option value="confirmed">Təsdiqlənmiş</option>
            <option value="processing">İşlənir</option>
            <option value="shipped">Göndərilmiş</option>
            <option value="delivered">Çatdırılmış</option>
            <option value="completed">Tamamlanmış</option>
            <option value="cancelled">Ləğv edilmiş</option>
          </select>
          
          <input
            type="text"
            placeholder="Sifariş nömrəsi və ya müştəri..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-search"
          />

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="filter-date"
            title="Başlanğıc tarix"
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="filter-date"
            title="Son tarix"
          />
          
          <button onClick={() => loadOrders()} className="refresh-btn">
            🔄 Yenilə
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={loadOrders} className="retry-btn">
            Yenidən cəhd edin
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Sifariş #</th>
              <th>Müştəri</th>
              <th>Məhsullar</th>
              <th>Məbləğ</th>
              <th>Status</th>
              <th>Tarix</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/admin/orders/${order.id}`} className="order-link">
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td>
                    <div className="customer-info">
                      <div className="customer-name">{order.customer.name}</div>
                      <div className="customer-email">{order.customer.email}</div>
                    </div>
                  </td>
                  <td className="items-count">{order.items} məhsul</td>
                  <td className="order-total">{formatPrice(order.total)}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td className="order-date">{formatDate(order.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/admin/orders/${order.id}`} className="view-btn">
                        👁️ Bax
                      </Link>
                      
                      {/* Quick Status Actions */}
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                          className="quick-action-btn confirm"
                          title="Təsdiqlə"
                        >
                          ✅
                        </button>
                      )}
                      
                      {order.status === 'confirmed' && (
                        <button 
                          onClick={() => handleStatusUpdate(order.id, 'shipped')}
                          className="quick-action-btn ship"
                          title="Göndər"
                        >
                          🚚
                        </button>
                      )}
                      
                      {order.status === 'shipped' && (
                        <button 
                          onClick={() => handleStatusUpdate(order.id, 'delivered')}
                          className="quick-action-btn deliver"
                          title="Çatdır"
                        >
                          📦
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  {filters.search || filters.status !== 'all' ? 
                    'Axtarış kriteriyalarına uyğun sifariş tapılmadı' : 
                    'Hələ sifariş yoxdur'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="pagination-btn"
          >
            ← Əvvəlki
          </button>
          
          <div className="pagination-info">
            Səhifə {pagination.currentPage} / {pagination.totalPages}
          </div>
          
          <button 
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="pagination-btn"
          >
            Sonrakı →
          </button>
        </div>
      )}

      {/* Orders Summary */}
      <div className="orders-summary">
        <div className="summary-item">
          <span className="summary-label">Ümumi sifarişlər:</span>
          <span className="summary-value">{pagination.totalOrders || 0}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Bu səhifədə:</span>
          <span className="summary-value">{orders.length}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;