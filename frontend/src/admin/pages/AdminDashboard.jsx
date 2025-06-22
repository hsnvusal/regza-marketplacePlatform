import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminDashboard = () => {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalVendors: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    try {
      // Burada API çağırısı olacaq
      // const response = await adminService.getDashboardStats();
      
      // Mock data - gerçək API ilə əvəz edin
      setTimeout(() => {
        setStats({
          totalOrders: 1248,
          totalRevenue: 45680,
          totalCustomers: 892,
          totalVendors: 156,
          pendingOrders: 23,
          completedOrders: 1195
        });
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Dashboard stats loading error:', error);
      setIsLoading(false);
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('az-AZ', {
      style: 'currency',
      currency: 'AZN'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Dashboard yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-welcome">
        <h2>Xoş gəlmisiniz, {admin?.firstName}!</h2>
        <p>Bu gün sistemdəki vəziyyətə ümumi baxış</p>
      </div>

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
          <div className="card-value">{stats.totalOrders.toLocaleString()}</div>
          <div className="card-subtitle">
            {stats.pendingOrders} gözləyən, {stats.completedOrders} tamamlanmış
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
          <div className="card-value">{formatPrice(stats.totalRevenue)}</div>
          <div className="card-subtitle">Bu ay 12% artım</div>
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
          <div className="card-value">{stats.totalCustomers.toLocaleString()}</div>
          <div className="card-subtitle">Aktiv müştəri hesabları</div>
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
          <div className="card-value">{stats.totalVendors}</div>
          <div className="card-subtitle">Qeydiyyatlı vendor hesabları</div>
        </div>
      </div>

      <div className="dashboard-actions">
        <h3>Tez əməliyyatlar</h3>
        <div className="action-buttons">
          <button className="action-btn primary">
            📋 Yeni sifariş yarat
          </button>
          <button className="action-btn secondary">
            📦 Məhsul əlavə et
          </button>
          <button className="action-btn secondary">
            👤 Vendor əlavə et
          </button>
          <button className="action-btn secondary">
            📊 Hesabat yarat
          </button>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Son fəaliyyətlər</h3>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">📋</div>
            <div className="activity-content">
              <span className="activity-text">Yeni sifariş #1249 yaradıldı</span>
              <span className="activity-time">5 dəqiqə əvvəl</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">👤</div>
            <div className="activity-content">
              <span className="activity-text">Yeni müştəri qeydiyyatdan keçdi</span>
              <span className="activity-time">15 dəqiqə əvvəl</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">💰</div>
            <div className="activity-content">
              <span className="activity-text">Ödəniş təsdiqləndi - 250 AZN</span>
              <span className="activity-time">1 saat əvvəl</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;