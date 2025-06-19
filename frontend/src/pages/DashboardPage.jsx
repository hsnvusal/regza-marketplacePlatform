import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import dashboardService from '../services/dashboardService';
import ordersService from '../services/ordersService';
import toastManager from '../utils/toastManager';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { cartItems = [] } = useCart();
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState({
    orders: { total: 0, pending: 0, completed: 0, revenue: 0 },
    products: { total: 0, active: 0, outOfStock: 0, views: 0 },
    customers: { total: 0, active: 0, newThisMonth: 0 },
    analytics: { salesGrowth: 0, orderGrowth: 0, customerGrowth: 0 }
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.role) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Loading dashboard data for role:', user.role);

      // Load statistics
      const statsResult = await dashboardService.getStats(user.role);
      if (statsResult.success) {
        setStats(statsResult.data);
      } else {
        console.error('Failed to load stats:', statsResult.error);
        setStats(getFallbackStats());
      }

      // Load recent orders
      const ordersResult = await dashboardService.getRecentOrders(user.role, 5);
      if (ordersResult.success) {
        setRecentOrders(ordersResult.data);
      } else {
        console.error('Failed to load orders:', ordersResult.error);
        setRecentOrders(getFallbackOrders());
      }

      // Load products for admin/vendor
      if (user.role === 'admin' || user.role === 'vendor') {
        const productsResult = await dashboardService.getRecentProducts(5);
        if (productsResult.success) {
          setRecentProducts(productsResult.data);
        }

        const topProductsResult = await dashboardService.getTopProducts(5);
        if (topProductsResult.success) {
          setTopProducts(topProductsResult.data);
        }
      }

      // Load wishlist for customers
      if (user.role === 'customer') {
        const wishlistResult = await dashboardService.getWishlist();
        if (wishlistResult.success) {
          setWishlistItems(wishlistResult.data);
        }
      }

      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      toastManager.error('Dashboard məlumatları yüklənərkən xəta baş verdi');
      
      // Use fallback data
      setStats(getFallbackStats());
      setRecentOrders(getFallbackOrders());
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback data
  const getFallbackStats = () => ({
    orders: { 
      total: user?.role === 'admin' ? 1247 : user?.role === 'vendor' ? 89 : 12, 
      pending: user?.role === 'admin' ? 43 : user?.role === 'vendor' ? 8 : 2,
      completed: user?.role === 'admin' ? 1180 : user?.role === 'vendor' ? 78 : 10,
      revenue: user?.role === 'admin' ? 47280 : user?.role === 'vendor' ? 3420 : 0
    },
    products: { 
      total: user?.role === 'admin' ? 5420 : user?.role === 'vendor' ? 24 : 0,
      active: user?.role === 'admin' ? 5180 : user?.role === 'vendor' ? 22 : 0,
      outOfStock: user?.role === 'admin' ? 240 : user?.role === 'vendor' ? 2 : 0,
      views: user?.role === 'admin' ? 142000 : user?.role === 'vendor' ? 2100 : 0
    },
    customers: { 
      total: user?.role === 'admin' ? 15420 : user?.role === 'vendor' ? 145 : 0,
      active: user?.role === 'admin' ? 8940 : user?.role === 'vendor' ? 89 : 0,
      newThisMonth: user?.role === 'admin' ? 420 : user?.role === 'vendor' ? 12 : 0
    },
    analytics: { 
      salesGrowth: user?.role === 'admin' ? 15.4 : user?.role === 'vendor' ? 8.2 : 0,
      orderGrowth: user?.role === 'admin' ? 12.8 : user?.role === 'vendor' ? 5.6 : 0,
      customerGrowth: user?.role === 'admin' ? 9.3 : user?.role === 'vendor' ? 14.2 : 0
    }
  });

  const getFallbackOrders = () => {
    return user?.role === 'customer' ? [
      { 
        _id: 'ORD-001', 
        vendor: { businessName: 'TechStore Azerbaijan' }, 
        total: 280, 
        status: 'completed', 
        createdAt: '2025-06-18T10:00:00Z',
        items: [{ product: { name: 'iPhone 15 Pro Max' } }]
      },
      { 
        _id: 'ORD-002', 
        vendor: { businessName: 'ElektroMarket' }, 
        total: 150, 
        status: 'pending', 
        createdAt: '2025-06-18T08:00:00Z',
        items: [{ product: { name: 'AirPods Pro 2' } }]
      }
    ] : [
      { 
        _id: 'ORD-001', 
        customer: { firstName: 'Aysel', lastName: 'Həsənova' }, 
        total: 280, 
        status: 'completed', 
        createdAt: '2025-06-18T10:00:00Z' 
      },
      { 
        _id: 'ORD-002', 
        customer: { firstName: 'Murad', lastName: 'Əliyev' }, 
        total: 150, 
        status: 'pending', 
        createdAt: '2025-06-18T08:00:00Z' 
      }
    ];
  };

  // Event handlers
  const handleLogout = async () => {
    try {
      await logout();
      toastManager.success('Uğurla çıxış edildi');
      navigate('/');
    } catch (error) {
      toastManager.error('Çıxış zamanı xəta baş verdi');
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    setLoadingWishlist(true);
    try {
      const result = await dashboardService.removeFromWishlist(productId);
      if (result.success) {
        setWishlistItems(prev => prev.filter(item => item.product._id !== productId));
        toastManager.success('Məhsul istək siyahısından silindi');
      } else {
        toastManager.error(result.error);
      }
    } catch (error) {
      toastManager.error('Məhsul silinərkən xəta baş verdi');
    } finally {
      setLoadingWishlist(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const result = await ordersService.updateOrderStatus(orderId, newStatus);
      if (result.success) {
        setRecentOrders(prev => 
          prev.map(order => 
            order._id === orderId 
              ? { ...order, status: newStatus }
              : order
          )
        );
        toastManager.success('Sifariş statusu yeniləndi');
      } else {
        toastManager.error(result.error);
      }
    } catch (error) {
      console.error('Status update error:', error);
      toastManager.error('Status yenilənərkən xəta baş verdi');
    }
  };

  const handleTrackOrder = async (orderId) => {
    try {
      const result = await ordersService.trackOrder(orderId);
      if (result.success) {
        console.log('Order tracking data:', result.data);
        toastManager.info('İzləmə məlumatları yükləndi');
      } else {
        toastManager.error(result.error);
      }
    } catch (error) {
      console.error('Track order error:', error);
      toastManager.error('İzləmə məlumatları yüklənərkən xəta baş verdi');
    }
  };

  // Utility functions
  const formatPrice = (price) => {
    return new Intl.NumberFormat('az-AZ').format(price) + ' AZN';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Sabahınız xeyir';
    if (hour < 17) return 'Günortanız xeyir';
    return 'Axşamınız xeyir';
  };

  const getStatusColor = (status) => {
    try {
      return ordersService.getStatusColor(status);
    } catch (error) {
      // Fallback if ordersService is not available
      const statusColors = {
        'completed': '#10b981',
        'pending': '#f59e0b',
        'processing': '#3b82f6',
        'shipped': '#8b5cf6',
        'cancelled': '#ef4444',
        'delivered': '#10b981',
        'confirmed': '#3b82f6'
      };
      return statusColors[status] || '#6b7280';
    }
  };

  const getStatusText = (status) => {
    try {
      return ordersService.getStatusText(status);
    } catch (error) {
      // Fallback if ordersService is not available
      const statusTexts = {
        'completed': 'Tamamlandı',
        'pending': 'Gözləyir',
        'processing': 'Hazırlanır',
        'shipped': 'Çatdırılır',
        'cancelled': 'Ləğv edilib',
        'delivered': 'Çatdırıldı',
        'confirmed': 'Təsdiqləndi'
      };
      return statusTexts[status] || status;
    }
  };

  const formatOrderData = (order) => {
    if (user?.role === 'customer') {
      return {
        id: order._id,
        vendor: order.vendor?.businessName || 'Naməlum satıcı',
        amount: order.total || order.amount || 0,
        status: order.status,
        date: order.createdAt,
        products: order.items?.[0]?.product?.name || 'Məhsul'
      };
    } else {
      return {
        id: order._id,
        customer: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Naməlum müştəri',
        amount: order.total || order.amount || 0,
        status: order.status,
        date: order.createdAt
      };
    }
  };

  const formatProductData = (product) => {
    return {
      id: product._id,
      name: product.name,
      price: product.pricing?.sellingPrice || product.price || 0,
      sales: product.analytics?.totalSales || 0,
      stock: product.inventory?.quantity || 0,
      image: product.images?.[0]?.url || '📦'
    };
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Dashboard yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-left">
              <h1>{getGreeting()}, {user?.firstName || 'İstifadəçi'}! 👋</h1>
              <p>
                {user?.role === 'admin' && 'Admin paneli - Platforma idarəetməsi'}
                {user?.role === 'vendor' && 'Satıcı paneli - Mağaza idarəetməsi'}
                {user?.role === 'customer' && 'İstifadəçi paneli - Şəxsi kabinet'}
              </p>
            </div>
            <div className="header-right">
              <div className="user-info">
                <div className="user-avatar">
                  {user?.firstName?.charAt(0) || '👤'}
                </div>
                <div className="user-details">
                  <span className="user-name">{user?.firstName} {user?.lastName}</span>
                  <span className="user-role">
                    {user?.role === 'admin' && '👨‍💼 Admin'}
                    {user?.role === 'vendor' && '🏪 Satıcı'}
                    {user?.role === 'customer' && '👤 Müştəri'}
                  </span>
                </div>
                <button onClick={handleLogout} className="logout-btn" title="Çıxış">
                  🚪
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="dashboard-nav">
          <button 
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Ümumi baxış
          </button>
          
          {/* Admin və Vendor üçün */}
          {(user?.role === 'admin' || user?.role === 'vendor') && (
            <>
              <button 
                className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                📦 Sifarişlər
              </button>
              <button 
                className={`nav-tab ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => setActiveTab('products')}
              >
                🛍️ Məhsullar
              </button>
            </>
          )}
          
          {/* Customer üçün */}
          {user?.role === 'customer' && (
            <>
              <button 
                className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                🛒 Sifarişlərim
              </button>
              <button 
                className={`nav-tab ${activeTab === 'wishlist' ? 'active' : ''}`}
                onClick={() => setActiveTab('wishlist')}
              >
                ❤️ İstək siyahısı
              </button>
            </>
          )}
          
          <button 
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Tənzimləmələr
          </button>
        </div>

        {/* Content */}
        <div className="dashboard-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-section">
              {/* Stats Cards */}
              <div className="stats-grid">
                {user?.role !== 'customer' && (
                  <>
                    <div className="stat-card revenue">
                      <div className="stat-icon">💰</div>
                      <div className="stat-content">
                        <h3>Gəlir</h3>
                        <p className="stat-value">{formatPrice(stats.orders.revenue)}</p>
                        <span className="stat-change positive">+{stats.analytics.salesGrowth}%</span>
                      </div>
                    </div>

                    <div className="stat-card orders">
                      <div className="stat-icon">📦</div>
                      <div className="stat-content">
                        <h3>Sifarişlər</h3>
                        <p className="stat-value">{stats.orders.total}</p>
                        <span className="stat-change positive">+{stats.analytics.orderGrowth}%</span>
                      </div>
                    </div>

                    <div className="stat-card products">
                      <div className="stat-icon">🛍️</div>
                      <div className="stat-content">
                        <h3>Məhsullar</h3>
                        <p className="stat-value">{stats.products.total}</p>
                        <span className="stat-change neutral">{stats.products.active} aktiv</span>
                      </div>
                    </div>

                    <div className="stat-card customers">
                      <div className="stat-icon">👥</div>
                      <div className="stat-content">
                        <h3>Müştərilər</h3>
                        <p className="stat-value">{stats.customers.total}</p>
                        <span className="stat-change positive">+{stats.analytics.customerGrowth}%</span>
                      </div>
                    </div>
                  </>
                )}

                {user?.role === 'customer' && (
                  <>
                    <div className="stat-card orders">
                      <div className="stat-icon">🛒</div>
                      <div className="stat-content">
                        <h3>Sifarişlərim</h3>
                        <p className="stat-value">{stats.orders.total}</p>
                        <span className="stat-change neutral">{stats.orders.pending} gözləyir</span>
                      </div>
                    </div>

                    <div className="stat-card cart">
                      <div className="stat-icon">🛒</div>
                      <div className="stat-content">
                        <h3>Səbətdə</h3>
                        <p className="stat-value">{cartItems.length}</p>
                        <span className="stat-change neutral">məhsul</span>
                      </div>
                    </div>

                    <div className="stat-card wishlist">
                      <div className="stat-icon">❤️</div>
                      <div className="stat-content">
                        <h3>İstək siyahısı</h3>
                        <p className="stat-value">{wishlistItems.length}</p>
                        <span className="stat-change neutral">məhsul</span>
                      </div>
                    </div>

                    <div className="stat-card points">
                      <div className="stat-icon">⭐</div>
                      <div className="stat-content">
                        <h3>Bonus balları</h3>
                        <p className="stat-value">1,240</p>
                        <span className="stat-change positive">+120 bu ay</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h3>Tez əməliyyatlar</h3>
                <div className="actions-grid">
                  {user?.role === 'admin' && (
                    <>
                      <Link to="/admin/users" className="action-card">
                        <div className="action-icon">👥</div>
                        <span>İstifadəçilər</span>
                      </Link>
                      <Link to="/admin/products" className="action-card">
                        <div className="action-icon">📦</div>
                        <span>Məhsul idarəetməsi</span>
                      </Link>
                      <Link to="/admin/orders" className="action-card">
                        <div className="action-icon">📋</div>
                        <span>Sifariş idarəetməsi</span>
                      </Link>
                      <Link to="/admin/analytics" className="action-card">
                        <div className="action-icon">📊</div>
                        <span>Analitika</span>
                      </Link>
                    </>
                  )}

                  {user?.role === 'vendor' && (
                    <>
                      <Link to="/vendor/products/new" className="action-card">
                        <div className="action-icon">➕</div>
                        <span>Yeni məhsul</span>
                      </Link>
                      <Link to="/vendor/orders" className="action-card">
                        <div className="action-icon">📦</div>
                        <span>Sifarişlər</span>
                      </Link>
                      <Link to="/vendor/inventory" className="action-card">
                        <div className="action-icon">📊</div>
                        <span>Anbar</span>
                      </Link>
                      <Link to="/vendor/analytics" className="action-card">
                        <div className="action-icon">📈</div>
                        <span>Satış hesabatı</span>
                      </Link>
                    </>
                  )}

                  {user?.role === 'customer' && (
                    <>
                      <Link to="/products" className="action-card">
                        <div className="action-icon">🛍️</div>
                        <span>Məhsullara bax</span>
                      </Link>
                      <Link to="/cart" className="action-card">
                        <div className="action-icon">🛒</div>
                        <span>Səbətim</span>
                      </Link>
                      <Link to="/orders" className="action-card">
                        <div className="action-icon">📦</div>
                        <span>Sifarişlərim</span>
                      </Link>
                      <Link to="/profile" className="action-card">
                        <div className="action-icon">👤</div>
                        <span>Profil</span>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity">
                <div className="activity-grid">
                  {/* Recent Orders */}
                  <div className="activity-section">
                    <h3>Son sifarişlər</h3>
                    <div className="activity-list">
                      {recentOrders.slice(0, 5).map(order => {
                        const formattedOrder = formatOrderData(order);
                        return (
                          <div key={formattedOrder.id} className="activity-item">
                            <div className="activity-info">
                              <span className="activity-title">#{formattedOrder.id}</span>
                              <span className="activity-subtitle">
                                {user?.role === 'customer' ? formattedOrder.vendor : formattedOrder.customer}
                              </span>
                            </div>
                            <div className="activity-meta">
                              <span className="activity-amount">{formatPrice(formattedOrder.amount)}</span>
                              <span 
                                className="activity-status"
                                style={{ color: getStatusColor(formattedOrder.status) }}
                              >
                                {getStatusText(formattedOrder.status)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {user?.role !== 'customer' && (
                      <Link to="/orders" className="view-all-link">
                        Hamısını gör →
                      </Link>
                    )}
                  </div>

                  {/* Top Products */}
                  {user?.role !== 'customer' && (
                    <div className="activity-section">
                      <h3>Ən çox satılan</h3>
                      <div className="activity-list">
                        {(topProducts.length > 0 ? topProducts : recentProducts).slice(0, 5).map(product => {
                          const formattedProduct = formatProductData(product);
                          return (
                            <div key={formattedProduct.id} className="activity-item">
                              <div className="activity-info">
                                <span className="product-emoji">
                                  {typeof formattedProduct.image === 'string' && formattedProduct.image.startsWith('http') 
                                    ? '🖼️' 
                                    : formattedProduct.image
                                  }
                                </span>
                                <div>
                                  <span className="activity-title">{formattedProduct.name}</span>
                                  <span className="activity-subtitle">{formattedProduct.sales} satış</span>
                                </div>
                              </div>
                              <div className="activity-meta">
                                <span className="activity-amount">{formatPrice(formattedProduct.price)}</span>
                                <span className="activity-stock">
                                  {formattedProduct.stock > 0 ? `${formattedProduct.stock} ədəd` : 'Bitib'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Link to="/products" className="view-all-link">
                        Hamısını gör →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="orders-section">
              <div className="section-header">
                <h3>
                  {user?.role === 'customer' ? 'Sifarişlərim' : 'Sifarişlər'}
                </h3>
                {user?.role !== 'customer' && (
                  <button className="primary-btn">
                    📊 Hesabat al
                  </button>
                )}
              </div>
              
              {user?.role === 'customer' ? (
                // Customer üçün fərqli göstərim
                <div className="customer-orders">
                  {recentOrders.map(order => {
                    const formattedOrder = formatOrderData(order);
                    return (
                      <div key={formattedOrder.id} className="customer-order-card">
                        <div className="order-header">
                          <span className="order-id">#{formattedOrder.id}</span>
                          <span 
                            className="order-status-badge"
                            style={{ 
                              backgroundColor: getStatusColor(formattedOrder.status) + '20',
                              color: getStatusColor(formattedOrder.status)
                            }}
                          >
                            {getStatusText(formattedOrder.status)}
                          </span>
                        </div>
                        <div className="order-details">
                          <div className="order-info">
                            <p><strong>Satıcı:</strong> {formattedOrder.vendor}</p>
                            <p><strong>Məhsul:</strong> {formattedOrder.products}</p>
                            <p><strong>Məbləğ:</strong> {formatPrice(formattedOrder.amount)}</p>
                            <p><strong>Tarix:</strong> {new Date(formattedOrder.date).toLocaleDateString('az-AZ')}</p>
                          </div>
                          <div className="order-actions-customer">
                            <button 
                              className="action-btn view"
                              onClick={() => navigate(`/orders/${formattedOrder.id}`)}
                            >
                              👁️ Ətraflı
                            </button>
                            <button 
                              className="action-btn track"
                              onClick={() => handleTrackOrder(formattedOrder.id)}
                            >
                              📍 İzlə
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Admin/Vendor üçün cədvəl
                <div className="orders-table">
                  <div className="table-header">
                    <span>Sifariş ID</span>
                    <span>Müştəri</span>
                    <span>Məbləğ</span>
                    <span>Status</span>
                    <span>Tarix</span>
                    <span>Əməliyyat</span>
                  </div>
                  {recentOrders.map(order => {
                    const formattedOrder = formatOrderData(order);
                    return (
                      <div key={formattedOrder.id} className="table-row">
                        <span className="order-id">#{formattedOrder.id}</span>
                        <span>{formattedOrder.customer}</span>
                        <span className="order-amount">{formatPrice(formattedOrder.amount)}</span>
                        <span 
                          className="order-status"
                          style={{ color: getStatusColor(formattedOrder.status) }}
                        >
                          {getStatusText(formattedOrder.status)}
                        </span>
                        <span>{new Date(formattedOrder.date).toLocaleDateString('az-AZ')}</span>
                        <div className="order-actions">
                          <button 
                            className="action-btn view"
                            onClick={() => navigate(`/orders/${formattedOrder.id}`)}
                            title="Ətraflı bax"
                          >
                            👁️
                          </button>
                          <select
                            className="status-select"
                            value={formattedOrder.status}
                            onChange={(e) => handleUpdateOrderStatus(formattedOrder.id, e.target.value)}
                            title="Statusu dəyiş"
                          >
                            {(() => {
                              try {
                                return ordersService.getOrderStatuses().map(status => (
                                  <option key={status.value} value={status.value}>
                                    {status.label}
                                  </option>
                                ));
                              } catch (error) {
                                // Fallback status options
                                const fallbackStatuses = [
                                  { value: 'pending', label: 'Gözləyir' },
                                  { value: 'confirmed', label: 'Təsdiqləndi' },
                                  { value: 'processing', label: 'Hazırlanır' },
                                  { value: 'shipped', label: 'Göndərildi' },
                                  { value: 'delivered', label: 'Çatdırıldı' },
                                  { value: 'completed', label: 'Tamamlandı' },
                                  { value: 'cancelled', label: 'Ləğv edildi' }
                                ];
                                return fallbackStatuses.map(status => (
                                  <option key={status.value} value={status.value}>
                                    {status.label}
                                  </option>
                                ));
                              }
                            })()}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && user?.role !== 'customer' && (
            <div className="products-section">
              <div className="section-header">
                <h3>Məhsullar</h3>
                <button className="primary-btn">
                  ➕ Yeni məhsul
                </button>
              </div>
              
              <div className="products-grid-dashboard">
                {recentProducts.map(product => {
                  const formattedProduct = formatProductData(product);
                  return (
                    <div key={formattedProduct.id} className="product-card-dashboard">
                      <div className="product-image-dashboard">
                        <span className="product-emoji">
                          {typeof formattedProduct.image === 'string' && formattedProduct.image.startsWith('http') 
                            ? '🖼️' 
                            : formattedProduct.image
                          }
                        </span>
                      </div>
                      <div className="product-info-dashboard">
                        <h4>{formattedProduct.name}</h4>
                        <p className="product-price-dashboard">{formatPrice(formattedProduct.price)}</p>
                        <div className="product-stats">
                          <span>📊 {formattedProduct.sales} satış</span>
                          <span>📦 {formattedProduct.stock} ədəd</span>
                        </div>
                      </div>
                      <div className="product-actions-dashboard">
                        <button 
                          className="action-btn edit"
                          onClick={() => navigate(`/products/${formattedProduct.id}/edit`)}
                        >
                          ✏️
                        </button>
                        <button className="action-btn delete">🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wishlist Tab */}
          {activeTab === 'wishlist' && user?.role === 'customer' && (
            <div className="wishlist-section">
              <div className="section-header">
                <h3>❤️ İstək siyahım</h3>
                <span className="wishlist-count">{wishlistItems.length} məhsul</span>
              </div>
              
              {wishlistItems.length > 0 ? (
                <div className="wishlist-grid">
                  {wishlistItems.map(item => (
                    <div key={item._id} className="wishlist-item">
                      <div className="wishlist-image">
                        <span className="product-emoji">
                          {item.product?.images?.[0]?.url 
                            ? '🖼️' 
                            : '📦'
                          }
                        </span>
                        <button 
                          className="remove-wishlist"
                          onClick={() => handleRemoveFromWishlist(item.product._id)}
                          disabled={loadingWishlist}
                        >
                          ❌
                        </button>
                      </div>
                      <div className="wishlist-info">
                        <h4>{item.product?.name || 'Məhsul adı'}</h4>
                        <p className="wishlist-price">
                          {formatPrice(item.product?.pricing?.sellingPrice || 0)}
                        </p>
                        <div className="wishlist-actions">
                          <button 
                            className="add-to-cart-btn"
                            onClick={() => navigate(`/products/${item.product._id}`)}
                          >
                            🛒 Səbətə əlavə et
                          </button>
                          <button 
                            className="view-product-btn"
                            onClick={() => navigate(`/products/${item.product._id}`)}
                          >
                            👁️ Bax
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-wishlist">
                  <div className="empty-icon">💔</div>
                  <h3>İstək siyahınız boşdur</h3>
                  <p>Bəyəndiyiniz məhsulları buraya əlavə edin</p>
                  <Link to="/products" className="browse-products-btn">
                    🛍️ Məhsullara bax
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="settings-section">
              <h3>Tənzimləmələr</h3>
              
              <div className="settings-grid">
                <div className="settings-card">
                  <h4>👤 Profil məlumatları</h4>
                  <p>Şəxsi məlumatlarınızı yeniləyin</p>
                  <button className="secondary-btn">Redaktə et</button>
                </div>

                <div className="settings-card">
                  <h4>🔒 Təhlükəsizlik</h4>
                  <p>Şifrə və təhlükəsizlik tənzimləmələri</p>
                  <button className="secondary-btn">Tənzimləmələr</button>
                </div>

                <div className="settings-card">
                  <h4>🔔 Bildirişlər</h4>
                  <p>Email və push bildiriş seçimləri</p>
                  <button className="secondary-btn">Tənzimlə</button>
                </div>

                <div className="settings-card">
                  <h4>💳 Ödəniş üsulları</h4>
                  <p>Kart və ödəniş məlumatları</p>
                  <button className="secondary-btn">İdarə et</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;