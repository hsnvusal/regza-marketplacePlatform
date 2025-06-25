import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import adminService from '../services/adminService';

const AdminDashboard = () => {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState({
    overview: {
      totalOrders: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      totalVendors: 0,
      pendingOrders: 0,
      completedOrders: 0,
      todayOrders: 0,
      monthlyRevenue: 0
    },
    recentOrders: [],
    monthlyTrend: [],
    topProducts: []
  });
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Dashboard stats və activities parallel al
      const [statsResult, activitiesResult] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getRecentActivities(10)
      ]);

      if (statsResult.success) {
        setStats(statsResult.data);
      } else {
        setError(statsResult.error);
      }

      if (activitiesResult.success) {
        setActivities(activitiesResult.activities);
      }

    } catch (error) {
      console.error('Dashboard loading error:', error);
      setError('Dashboard məlumatları yüklənərkən xəta baş verdi');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (amount) => {
    return adminService.formatPrice(amount);
  };

  const formatDate = (date) => {
    return adminService.formatDate(date, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getActivityIcon = (type) => {
    const icons = {
      new_order: '📋',
      new_customer: '👤',
      new_vendor: '🏪',
      payment: '💰',
      product_update: '📦',
      user_update: '👥'
    };
    return icons[type] || '📝';
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Dashboard yüklənir...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <div className="error-message">
          ❌ {error}
        </div>
        <button onClick={loadDashboardData} className="retry-btn">
          🔄 Yenidən cəhd edin
        </button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-welcome">
        <h2>Xoş gəlmisiniz, {admin?.firstName}!</h2>
        <p>Bu gün sistemdəki vəziyyətə ümumi baxış</p>
        <button onClick={loadDashboardData} className="refresh-btn">
          🔄 Yenilə
        </button>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: '#ebf8ff', color: '#3182ce' }}>
              📋
            </div>
            <div>
              <div className="card-title">Ümumi Sifarişlər</div>
            </div>
          </div>
          <div className="card-value">{stats.overview.totalOrders.toLocaleString()}</div>
          <div className="card-subtitle">
            {stats.overview.pendingOrders} gözləyən, {stats.overview.completedOrders} tamamlanmış
          </div>
          <div className="card-trend">
            Bu gün: {stats.overview.todayOrders} sifariş
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: '#f0fff4', color: '#38a169' }}>
              💰
            </div>
            <div>
              <div className="card-title">Ümumi Gəlir</div>
            </div>
          </div>
          <div className="card-value">{formatPrice(stats.overview.totalRevenue)}</div>
          <div className="card-subtitle">Tamamlanmış sifarişlərdən</div>
          <div className="card-trend">
            Bu ay: {formatPrice(stats.overview.monthlyRevenue)}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: '#fef5e7', color: '#d69e2e' }}>
              👥
            </div>
            <div>
              <div className="card-title">Müştərilər</div>
            </div>
          </div>
          <div className="card-value">{stats.overview.totalCustomers.toLocaleString()}</div>
          <div className="card-subtitle">Qeydiyyatlı müştərilər</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon" style={{ background: '#fed7e2', color: '#d53f8c' }}>
              🏪
            </div>
            <div>
              <div className="card-title">Satıcılar</div>
            </div>
          </div>
          <div className="card-value">{stats.overview.totalVendors}</div>
          <div className="card-subtitle">Aktiv vendor hesabları</div>
        </div>
      </div>

      {/* Recent Orders & Activities */}
      <div className="dashboard-content">
        <div className="dashboard-section">
          <h3>Son Sifarişlər</h3>
          {stats.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="recent-orders">
              {stats.recentOrders.map((order) => (
                <div key={order._id} className="order-item">
                  <div className="order-info">
                    <span className="order-number">#{order.orderNumber}</span>
                    <span className="customer-name">
                      {order.customer?.firstName} {order.customer?.lastName}
                    </span>
                  </div>
                  <div className="order-details">
                    <span className="order-total">{formatPrice(order.total)}</span>
                    <span className={`order-status status-${order.status}`}>
                      {adminService.getStatusBadgeConfig(order.status).text}
                    </span>
                  </div>
                  <div className="order-date">
                    {formatDate(order.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>Hələ sifariş yoxdur</p>
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <h3>Son Fəaliyyətlər</h3>
          {activities.length > 0 ? (
            <div className="activity-list">
              {activities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-content">
                    <span className="activity-text">{activity.message}</span>
                    <span className="activity-time">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>Son fəaliyyət yoxdur</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      {stats.topProducts && stats.topProducts.length > 0 && (
        <div className="dashboard-section">
          <h3>Ən Çox Satılan Məhsullar</h3>
          <div className="top-products">
            {stats.topProducts.map((item, index) => (
              <div key={item._id} className="product-item">
                <div className="product-rank">#{index + 1}</div>
                <div className="product-info">
                  <span className="product-name">
                    {item.productInfo?.[0]?.name || 'Məhsul adı'}
                  </span>
                  <span className="product-sales">
                    {item.totalSold} ədəd satıldı
                  </span>
                </div>
                <div className="product-revenue">
                  {formatPrice(item.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="dashboard-actions">
        <h3>Tez əməliyyatlar</h3>
        <div className="action-buttons">
          <button 
            className="action-btn primary"
            onClick={() => window.location.href = '/admin/orders'}
          >
            📋 Sifarişləri idarə et
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => window.location.href = '/admin/products'}
          >
            📦 Məhsulları idarə et
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => window.location.href = '/admin/vendors'}
          >
            🏪 Vendorları idarə et
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => window.location.href = '/admin/reports'}
          >
            📊 Hesabat yarat
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;