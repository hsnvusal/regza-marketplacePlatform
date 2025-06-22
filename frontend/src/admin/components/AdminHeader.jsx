import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminHeader = () => {
  const { admin } = useAdminAuth();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return { title: 'Dashboard', subtitle: 'Ümumi icmal və statistika' };
      case '/orders':
        return { title: 'Sifarişlər', subtitle: 'Bütün sifarişlərin idarə edilməsi' };
      case '/products':
        return { title: 'Məhsullar', subtitle: 'Məhsul kataloqu və inventar' };
      case '/vendors':
        return { title: 'Satıcılar', subtitle: 'Vendor hesabları və idarəetmə' };
      case '/customers':
        return { title: 'Müştərilər', subtitle: 'Müştəri hesabları və məlumatları' };
      case '/reports':
        return { title: 'Hesabatlar', subtitle: 'Analitika və performans hesabatları' };
      case '/settings':
        return { title: 'Tənzimləmələr', subtitle: 'Sistem konfiqurasiyası' };
      default:
        if (path.includes('/orders/')) {
          return { title: 'Sifariş Detalları', subtitle: 'Sifariş məlumatları və idarəetmə' };
        }
        return { title: 'Admin Panel', subtitle: 'İdarəetmə paneli' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <header className="admin-header">
      <div className="header-content">
        <div className="page-info">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        
        <div className="header-actions">
          <div className="current-time">
            {new Date().toLocaleDateString('az-AZ', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          
          <div className="admin-menu">
            <span className="welcome-text">
              Xoş gəlmisiniz, {admin?.firstName}!
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;