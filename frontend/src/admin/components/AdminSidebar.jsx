// src/admin/components/AdminSidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const AdminSidebar = ({ isOpen }) => {
  // useLocation hook-u ilə path-i birbaşa götürürük
  const location = useLocation();
  const currentPath = location.pathname || '/admin/dashboard';

  // Debug üçün
  console.log('🔍 AdminSidebar Debug:', {
    isOpen,
    currentPath,
    location: location
  });

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      path: '/admin/dashboard',
      description: 'Ümumi baxış və statistika'
    },
    {
      id: 'orders',
      label: 'Sifarişlər',
      icon: '📋',
      path: '/admin/orders',
      description: 'Sifariş idarəetməsi',
      submenu: [
        { label: 'Bütün sifarişlər', path: '/admin/orders' },
        { label: 'Gözləyən sifarişlər', path: '/admin/orders?status=pending' },
        { label: 'Hazırlanan sifarişlər', path: '/admin/orders?status=processing' }
      ]
    },
    {
      id: 'products',
      label: 'Məhsullar',
      icon: '📦',
      path: '/admin/products',
      description: 'Məhsul kataloqu idarəetməsi',
      submenu: [
        { label: 'Bütün məhsullar', path: '/admin/products' },
        { label: 'Yeni məhsul əlavə et', path: '/admin/products/new' },
        { label: 'Kateqoriyalar', path: '/admin/categories' },
        { label: 'Stok idarəetməsi', path: '/admin/inventory' }
      ]
    },
    {
      id: 'users',
      label: 'İstifadəçilər',
      icon: '👥',
      path: '/admin/users',
      description: 'İstifadəçi və rol idarəetməsi',
      submenu: [
        { label: 'Bütün istifadəçilər', path: '/admin/users' },
        { label: 'Müştərilər', path: '/admin/customers' },
        { label: 'Satıcılar', path: '/admin/vendors' },
        { label: 'Adminlər', path: '/admin/admins' }
      ]
    },
    {
      id: 'chat',
      label: 'Chat Yönetimi',
      icon: '💬',
      path: '/admin/chat',
      description: 'Müşteri destek konuşmaları'
    },
    {
      id: 'vendors',
      label: 'Satıcılar',
      icon: '🏪',
      path: '/admin/vendors',
      description: 'Satıcı hesabları və təsdiqlər'
    },
    {
      id: 'reports',
      label: 'Hesabatlar',
      icon: '📈',
      path: '/admin/reports',
      description: 'Analitika və hesabatlar',
      submenu: [
        { label: 'Satış hesabatı', path: '/admin/reports/sales' },
        { label: 'Məhsul analitikası', path: '/admin/reports/products' },
        { label: 'İstifadəçi analitikası', path: '/admin/reports/users' }
      ]
    },
    {
      id: 'settings',
      label: 'Tənzimləmələr',
      icon: '⚙️',
      path: '/admin/settings',
      description: 'Sistem tənzimləmələri',
      submenu: [
        { label: 'Ümumi tənzimləmələr', path: '/admin/settings/general' },
        { label: 'Ödəniş tənzimləmələri', path: '/admin/settings/payments' },
        { label: 'Email tənzimləmələri', path: '/admin/settings/email' }
      ]
    }
  ];

  const isActiveLink = (path) => {
    // Safety check - əgər currentPath yoxdursa false qaytar
    if (!currentPath || typeof currentPath !== 'string') {
      return false;
    }
    
    if (path === '/admin/dashboard') {
      return currentPath === path;
    }
    
    // StartsWith method-unu safely istifadə et
    try {
      return currentPath.startsWith(path);
    } catch (error) {
      console.error('isActiveLink error:', error);
      return false;
    }
  };

  console.log('🔍 AdminSidebar currentPath:', currentPath);

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-content">
        {/* Main Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = isActiveLink(item.path);
            
            return (
              <div key={item.id} className="nav-group">
                <Link
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  title={!isOpen ? item.label : ''}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {isOpen && (
                    <div className="nav-content">
                      <span className="nav-label">{item.label}</span>
                      <span className="nav-description">{item.description}</span>
                    </div>
                  )}
                </Link>

                {/* Submenu - only show if sidebar is open and current item is active */}
                {isOpen && item.submenu && isActive && (
                  <div className="nav-submenu">
                    {item.submenu.map((subItem, index) => (
                      <Link
                        key={index}
                        to={subItem.path}
                        className={`nav-subitem ${currentPath === subItem.path ? 'active' : ''}`}
                      >
                        <span className="subitem-dot">•</span>
                        <span className="subitem-label">{subItem.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {isOpen && (
          <div className="sidebar-footer">
            <div className="footer-info">
              <div className="app-version">
                <span className="version-label">RegzaAPP Admin</span>
                <span className="version-number">v1.0.0</span>
              </div>
              <div className="footer-links">
                <a href="/admin/help" className="footer-link">
                  ❓ Kömək
                </a>
                <a href="/admin/documentation" className="footer-link">
                  📚 Sənədlər
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;