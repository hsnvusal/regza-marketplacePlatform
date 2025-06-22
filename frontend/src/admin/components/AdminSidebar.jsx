import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminSidebar = () => {
  const { admin, logout } = useAdminAuth();
  const location = useLocation();

  const menuItems = [
    {
      path: '/dashboard',
      icon: '📊',
      label: 'Dashboard',
      description: 'Ümumi məlumatlar'
    },
    {
      path: '/orders',
      icon: '📋',
      label: 'Sifarişlər',
      description: 'Bütün sifarişlər'
    },
    {
      path: '/products',
      icon: '📦',
      label: 'Məhsullar',
      description: 'Məhsul idarəetməsi'
    },
    {
      path: '/vendors',
      icon: '🏪',
      label: 'Satıcılar',
      description: 'Vendor idarəetməsi'
    },
    {
      path: '/customers',
      icon: '👥',
      label: 'Müştərilər',
      description: 'Müştəri məlumatları'
    },
    {
      path: '/reports',
      icon: '📈',
      label: 'Hesabatlar',
      description: 'Analitika və hesabatlar'
    },
    {
      path: '/settings',
      icon: '⚙️',
      label: 'Tənzimləmələr',
      description: 'Sistem tənzimləmələri'
    }
  ];

  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <div className="admin-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">Admin Panel</span>
        </div>
        <div className="admin-info">
          <div className="admin-avatar">
            {admin?.firstName?.charAt(0) || 'A'}
          </div>
          <div className="admin-details">
            <span className="admin-name">
              {admin?.firstName} {admin?.lastName}
            </span>
            <span className="admin-role">Administrator</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <span className="nav-icon">{item.icon}</span>
                <div className="nav-content">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button onClick={logout} className="logout-btn">
          🚪 Çıxış
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;