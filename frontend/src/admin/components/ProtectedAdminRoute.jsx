// src/admin/components/ProtectedAdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const ProtectedAdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAdminAuth();

  console.log('🛡️ ProtectedAdminRoute check - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  // Auth hələ də initialize olmayıbsa loading göstər
  if (isLoading) {
    console.log('⏳ ProtectedAdminRoute: Auth loading, showing spinner');
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Admin paneli yoxlanılır...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ ProtectedAdminRoute: Admin not authenticated, redirecting to login');
    return <Navigate to="/admin/login" replace />;
  }

  console.log('✅ ProtectedAdminRoute: Admin authenticated, allowing access');
  return children;
};

export default ProtectedAdminRoute;