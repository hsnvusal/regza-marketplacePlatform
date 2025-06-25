// src/admin/components/AdminHeader.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const AdminHeader = ({ admin, onLogout, onSidebarToggle, sidebarOpen }) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Safety check üçün
  const adminFirstName = admin?.firstName || 'A';
  const adminLastName = admin?.lastName || 'U';
  const adminFullName = `${admin?.firstName || 'Admin'} ${admin?.lastName || 'User'}`;

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        {/* Sidebar Toggle */}
        <button 
          onClick={onSidebarToggle}
          className="sidebar-toggle"
          title={sidebarOpen ? 'Sidebar-ı gizlət' : 'Sidebar-ı göstər'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {/* Admin Logo */}
        <Link to="/admin/dashboard" className="admin-logo">
          <span className="logo-icon">🔐</span>
          <span className="logo-text">RegzaAPP Admin</span>
        </Link>
      </div>

      <div className="admin-header-center">
        {/* Search */}
        <div className="admin-search">
          <input 
            type="text" 
            placeholder="Sifariş, məhsul və ya istifadəçi axtarın..."
            className="search-input"
          />
          <button className="search-btn">🔍</button>
        </div>
      </div>

      <div className="admin-header-right">
        {/* Notifications */}
        <div className="admin-notifications">
          <button className="notification-btn">
            🔔
            <span className="notification-badge">3</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <Link to="/admin/orders" className="quick-action" title="Sifarişlər">
            📋
          </Link>
          <Link to="/admin/products" className="quick-action" title="Məhsullar">
            📦
          </Link>
          <Link to="/admin/users" className="quick-action" title="İstifadəçilər">
            👥
          </Link>
        </div>

        {/* Public Site Link */}
        <Link to="/" className="public-site-link" title="Ana səhifəyə get">
          🌐 Ana səhifə
        </Link>

        {/* Admin Profile */}
        <div className="admin-profile">
          <button 
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="profile-btn"
          >
            <div className="profile-avatar">
              {admin?.avatar ? (
                <img src={admin.avatar} alt={adminFullName} />
              ) : (
                <span>{adminFirstName[0]}{adminLastName[0]}</span>
              )}
            </div>
            <div className="profile-info">
              <span className="profile-name">{adminFullName}</span>
              <span className="profile-role">Admin</span>
            </div>
            <span className="profile-arrow">{profileMenuOpen ? '▲' : '▼'}</span>
          </button>

          {/* Profile Dropdown */}
          {profileMenuOpen && (
            <div className="profile-dropdown">
              <Link to="/admin/profile" className="dropdown-item">
                👤 Profil
              </Link>
              <Link to="/admin/settings" className="dropdown-item">
                ⚙️ Tənzimləmələr
              </Link>
              <div className="dropdown-divider"></div>
              <button onClick={onLogout} className="dropdown-item logout">
                🚪 Çıxış
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;