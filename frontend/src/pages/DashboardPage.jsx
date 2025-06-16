import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  ShoppingBag, 
  TrendingUp, 
  Users, 
  Star, 
  Package, 
  CreditCard,
  Heart,
  Bell,
  MapPin,
  Calendar,
  ArrowRight,
  Eye,
  Download,
  Settings,
  Award
} from 'lucide-react';

const DashboardPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    totalOrders: 127,
    totalSpent: 2847.50,
    avgRating: 4.8,
    favoriteProducts: 23,
    reviewsWritten: 12,
    memberSince: 'Yanvar 2024'
  });

  const [recentOrders] = useState([
    { id: '#12345', date: '15 İyun 2025', status: 'Çatdırılıb', amount: '89.99', product: 'Samsung Galaxy Smartphone', image: null },
    { id: '#12346', date: '12 İyun 2025', status: 'Yolda', amount: '45.50', product: 'Bluetooth Qulaqcıq', image: null },
    { id: '#12347', date: '08 İyun 2025', status: 'Çatdırılıb', amount: '156.00', product: 'Laptop Çantası', image: null }
  ]);

  const [notifications] = useState([
    { id: 1, type: 'order', message: 'Sifarişiniz #12346 yolda', time: '2 saat əvvəl', read: false },
    { id: 2, type: 'promotion', message: 'Yeni endirim kampanyası başladı!', time: '5 saat əvvəl', read: false },
    { id: 3, type: 'review', message: 'Məhsul rəyiniz təsdiqləndi', time: '1 gün əvvəl', read: true }
  ]);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
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
            <div className="welcome-section">
              <h1>🏠 Xoş gəlmisiniz!</h1>
              <p>Hesabınızı idarə edin və son fəaliyyətlərinizi izləyin</p>
            </div>
            <div className="quick-actions">
              <Link to="/products" className="action-btn primary">
                <ShoppingBag className="w-5 h-5" />
                Alış-veriş et
              </Link>
              <Link to="/orders" className="action-btn secondary">
                <Package className="w-5 h-5" />
                Sifarişlərim
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon shopping">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <h3>{userStats.totalOrders}</h3>
              <p>Ümumi sifariş</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon money">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <h3>{userStats.totalSpent.toFixed(2)} ₼</h3>
              <p>Ümumi xərc</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon rating">
              <Star className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <h3>{userStats.avgRating}</h3>
              <p>Orta reytinq</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon heart">
              <Heart className="w-6 h-6" />
            </div>
            <div className="stat-content">
              <h3>{userStats.favoriteProducts}</h3>
              <p>Sevimli məhsul</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Recent Orders */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>📦 Son sifarişlər</h2>
              <Link to="/orders" className="view-all">
                Hamısına bax <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="orders-list">
              {recentOrders.map((order) => (
                <div key={order.id} className="order-item">
                  <div className="order-image">
                    {order.image ? (
                      <img src={order.image} alt={order.product} />
                    ) : (
                      <span className="no-image">📦</span>
                    )}
                  </div>
                  <div className="order-info">
                    <div className="order-header">
                      <span className="order-id">{order.id}</span>
                      <span className={`order-status ${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </div>
                    <h4>{order.product}</h4>
                    <p className="order-date">{order.date}</p>
                  </div>
                  <div className="order-amount">
                    <span>{order.amount} ₼</span>
                    <button className="view-btn">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>⚡ Tez əməliyyatlar</h2>
            </div>
            <div className="quick-actions-grid">
              <Link to="/profile" className="quick-action-card">
                <div className="action-icon">
                  <Settings className="w-5 h-5" />
                </div>
                <span>Profili düzəlt</span>
              </Link>
              
              <Link to="/wishlist" className="quick-action-card">
                <div className="action-icon">
                  <Heart className="w-5 h-5" />
                </div>
                <span>İstək siyahısı</span>
              </Link>
              
              <Link to="/addresses" className="quick-action-card">
                <div className="action-icon">
                  <MapPin className="w-5 h-5" />
                </div>
                <span>Ünvanlar</span>
              </Link>
              
              <Link to="/reviews" className="quick-action-card">
                <div className="action-icon">
                  <Star className="w-5 h-5" />
                </div>
                <span>Rəylər</span>
              </Link>
            </div>
          </div>

          {/* Notifications */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>🔔 Bildirişlər</h2>
              <Link to="/notifications" className="view-all">
                Hamısına bax <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="notifications-list">
              {notifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className={`notification-item ${notification.read ? 'read' : 'unread'}`}>
                  <div className="notification-icon">
                    {notification.type === 'order' && <Package className="w-4 h-4" />}
                    {notification.type === 'promotion' && <TrendingUp className="w-4 h-4" />}
                    {notification.type === 'review' && <Star className="w-4 h-4" />}
                  </div>
                  <div className="notification-content">
                    <p>{notification.message}</p>
                    <span className="notification-time">{notification.time}</span>
                  </div>
                  {!notification.read && <div className="unread-dot"></div>}
                </div>
              ))}
            </div>
          </div>

          {/* Account Activity */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>📊 Hesab aktivliyi</h2>
            </div>
            <div className="activity-stats">
              <div className="activity-item">
                <div className="activity-label">
                  <Award className="w-4 h-4" />
                  <span>Üzvlük tarixi</span>
                </div>
                <span className="activity-value">{userStats.memberSince}</span>
              </div>
              
              <div className="activity-item">
                <div className="activity-label">
                  <BarChart3 className="w-4 h-4" />
                  <span>Yazılan rəy</span>
                </div>
                <span className="activity-value">{userStats.reviewsWritten}</span>
              </div>
              
              <div className="activity-item">
                <div className="activity-label">
                  <TrendingUp className="w-4 h-4" />
                  <span>Bu ay xərc</span>
                </div>
                <span className="activity-value">234.50 ₼</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="dashboard-section recommendations">
            <div className="section-header">
              <h2>💡 Tövsiyələr</h2>
            </div>
            <div className="recommendations-content">
              <div className="recommendation-item">
                <div className="rec-icon">🏆</div>
                <div className="rec-content">
                  <h4>VIP üzv ol</h4>
                  <p>Ekskluziv endirimlər və pulsuz çatdırılma</p>
                </div>
                <button className="rec-btn">Ətraflı</button>
              </div>
              
              <div className="recommendation-item">
                <div className="rec-icon">📱</div>
                <div className="rec-content">
                  <h4>Mobil tətbiqi yüklə</h4>
                  <p>Hər yerdə rahat alış-veriş</p>
                </div>
                <button className="rec-btn">Yüklə</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .dashboard-page {
          padding: 6rem 2rem 2rem;
          min-height: calc(100vh - 80px);
          background-color: #f8fafc;
        }

        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 80px);
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .dashboard-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          color: white;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .welcome-section h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .welcome-section p {
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .quick-actions {
          display: flex;
          gap: 1rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 12px 20px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background-color: white;
          color: #6366f1;
        }

        .action-btn.secondary {
          background-color: rgba(255,255,255,0.2);
          color: white;
          border: 2px solid rgba(255,255,255,0.3);
        }

        .action-btn:hover {
          transform: translateY(-2px);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-icon.shopping { background: linear-gradient(45deg, #6366f1, #8b5cf6); }
        .stat-icon.money { background: linear-gradient(45deg, #059669, #10b981); }
        .stat-icon.rating { background: linear-gradient(45deg, #f59e0b, #fbbf24); }
        .stat-icon.heart { background: linear-gradient(45deg, #ef4444, #f87171); }

        .stat-content h3 {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .stat-content p {
          color: #64748b;
          font-size: 0.9rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .dashboard-section {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .view-all {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6366f1;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .order-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          border: 2px solid #f1f5f9;
          border-radius: 12px;
          transition: border-color 0.2s;
        }

        .order-item:hover {
          border-color: #e2e8f0;
        }

        .order-image {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          background-color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          overflow: hidden;
        }

        .order-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image {
          font-size: 1.5rem;
        }

        .order-info {
          flex: 1;
        }

        .order-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .order-id {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
        }

        .order-status {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .order-status.çatdırılıb {
          background-color: #dcfce7;
          color: #166534;
        }

        .order-status.yolda {
          background-color: #fef3c7;
          color: #92400e;
        }

        .order-info h4 {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .order-date {
          font-size: 0.8rem;
          color: #64748b;
        }

        .order-amount {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .order-amount span {
          font-size: 1rem;
          font-weight: 700;
          color: #1f2937;
        }

        .view-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 2px solid #e5e7eb;
          background-color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6366f1;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .quick-action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem 1rem;
          border: 2px solid #f1f5f9;
          border-radius: 12px;
          text-decoration: none;
          color: #1f2937;
          transition: all 0.2s;
          text-align: center;
        }

        .quick-action-card:hover {
          border-color: #6366f1;
          background-color: #f8fafc;
        }

        .action-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: linear-gradient(45deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-bottom: 1rem;
        }

        .quick-action-card span {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .notification-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-radius: 8px;
          transition: background-color 0.2s;
          position: relative;
        }

        .notification-item.unread {
          background-color: #f0f9ff;
        }

        .notification-icon {
          width: 35px;
          height: 35px;
          border-radius: 8px;
          background-color: #6366f1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-right: 0.75rem;
        }

        .notification-content {
          flex: 1;
        }

        .notification-content p {
          font-size: 0.9rem;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .notification-time {
          font-size: 0.8rem;
          color: #64748b;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #ef4444;
        }

        .activity-stats {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .activity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .activity-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          font-size: 0.9rem;
        }

        .activity-value {
          font-weight: 600;
          color: #1f2937;
        }

        .recommendations {
          grid-column: span 2;
        }

        .recommendations-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .recommendation-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          border: 2px solid #f1f5f9;
          border-radius: 12px;
          gap: 1rem;
        }

        .rec-icon {
          font-size: 2rem;
        }

        .rec-content {
          flex: 1;
        }

        .rec-content h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .rec-content p {
          font-size: 0.9rem;
          color: #64748b;
        }

        .rec-btn {
          padding: 8px 16px;
          background-color: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .recommendations {
            grid-column: span 1;
          }

          .quick-actions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;