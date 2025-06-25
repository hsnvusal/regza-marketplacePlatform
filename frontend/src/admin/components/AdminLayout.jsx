// src/admin/components/AdminLayout.jsx
import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

const AdminLayout = () => {
  const { admin, logout } = useAdminAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Debug üçün
  console.log('🔍 AdminLayout Debug:', { admin, location: location?.pathname });

  const handleLogout = () => {
    if (window.confirm('Admin paneldən çıxmaq istəyirsiniz?')) {
      logout();
    }
  };

  return (
    <div className="admin-layout">
      {/* Admin Header */}
      <AdminHeader 
        admin={admin}
        onLogout={handleLogout}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      {/* Admin Main Content */}
      <div className="admin-main">
        {/* Admin Sidebar */}
        <AdminSidebar 
          isOpen={sidebarOpen}
          currentPath={location?.pathname || '/admin/dashboard'}
        />

        {/* Admin Content Area */}
        <div className={`admin-content ${sidebarOpen ? 'with-sidebar' : 'full-width'}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;