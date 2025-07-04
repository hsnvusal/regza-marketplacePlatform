// src/admin/components/AdminHeader.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AdminHeader.css'; // AdminHeader üçün CSS faylı
const AdminHeader = ({ admin, onLogout, onSidebarToggle, sidebarOpen }) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  // Klik xaricində menyu bağlamaq üçün
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Admin məlumatları üçün təhlükəsizlik yoxlaması
  const adminFirstName = admin?.firstName || 'A';
  const adminLastName = admin?.lastName || 'U';
  const adminFullName = `${admin?.firstName || 'Admin'} ${admin?.lastName || 'User'}`;

  // Bildiriş məlumatları (nümunə məlumat)
  const notifications = [
    { id: 1, message: 'Yeni sifariş alındı', time: '5 dəq əvvəl', type: 'order' },
    { id: 2, message: 'Məhsul stoku azalıb', time: '15 dəq əvvəl', type: 'warning' },
    { id: 3, message: 'Yeni istifadəçi qeydiyyatdan keçdi', time: '1 saat əvvəl', type: 'user' }
  ];

  return (
    <header className="admin-header">
      <div className="admin-header-content">
        {/* Sol hissə - Sidebar toggle və Logo */}
        <div className="admin-header-left">
          <button 
            onClick={onSidebarToggle}
            className="sidebar-toggle"
            title={sidebarOpen ? 'Sidebar-ı gizlət' : 'Sidebar-ı göstər'}
            aria-label={sidebarOpen ? 'Sidebar-ı gizlət' : 'Sidebar-ı göstər'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
          
          <Link to="/admin/dashboard" className="admin-logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span className="logo-text">RegzaAPP Admin</span>
          </Link>
        </div>

        {/* Sağ hissə - Bildirişlər və Profil */}
        <div className="admin-header-right">
          {/* Bildirişlər */}
          <div className="admin-notifications" ref={notificationRef}>
            <button 
              className="notification-btn"
              onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
              title="Bildirişlər"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>

            {/* Bildirişlər dropdown */}
            {notificationMenuOpen && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Bildirişlər</h3>
                  <button className="mark-all-read">Hamısını oxu</button>
                </div>
                <div className="notification-list">
                  {notifications.map(notification => (
                    <div key={notification.id} className={`notification-item ${notification.type}`}>
                      <div className="notification-content">
                        <p>{notification.message}</p>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="notification-footer">
                  <Link to="/admin/notifications" className="view-all">
                    Hamısını gör
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Tez əməliyyatlar */}
          <div className="quick-actions">
            <Link to="/admin/orders" className="quick-action" title="Sifarişlər">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            </Link>
            <Link to="/admin/products" className="quick-action" title="Məhsullar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </Link>
            <Link to="/admin/users" className="quick-action" title="İstifadəçilər">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </Link>
          </div>

          {/* Ana səhifə linki */}
          <Link to="/" className="public-site-link" title="Ana səhifəyə get">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            <span>Ana səhifə</span>
          </Link>

          {/* Admin profil */}
          <div className="admin-profile" ref={profileRef}>
            <button 
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="profile-btn"
            >
              <div className="profile-avatar">
                {admin?.avatar ? (
                  <img src={admin.avatar} alt={adminFullName} />
                ) : (
                  <span className="avatar-initials">
                    {adminFirstName[0]}{adminLastName[0]}
                  </span>
                )}
              </div>
              <div className="profile-info">
                <span className="profile-name">{adminFullName}</span>
                <span className="profile-role">Admin</span>
              </div>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={`profile-arrow ${profileMenuOpen ? 'open' : ''}`}
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>

            {/* Profil dropdown */}
            {profileMenuOpen && (
              <div className="profile-dropdown">
                <Link to="/admin/profile" className="dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Profil</span>
                </Link>
                <Link to="/admin/settings" className="dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m17-4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V8zM7 15a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2z"/>
                  </svg>
                  <span>Tənzimləmələr</span>
                </Link>
                <div className="dropdown-divider"></div>
                <button onClick={onLogout} className="dropdown-item logout">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span>Çıxış</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;