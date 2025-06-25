import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Admin Components
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminOrderDetails from './pages/AdminOrderDetails';
import AdminProducts from './pages/AdminProducts';
import AdminProductDetails from './pages/AdminProductDetails';
import AdminUsers from './pages/AdminUsers';
// import AdminVendors from './pages/AdminVendors';
// import AdminCustomers from './pages/AdminCustomers';
// import AdminReports from './pages/AdminReports';
// import AdminSettings from './pages/AdminSettings';

// Admin Styles
import './styles/admin.css';

const AdminApp = () => {
  return (
    <div className="admin-app">
      <Routes>
        {/* 🔓 Public admin routes */}
        <Route path="login" element={<AdminLogin />} />
        
        {/* 🔐 Protected admin routes */}
        <Route path="/" element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }>
          {/* Default redirect to dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />
          
          {/* 📊 Dashboard */}
          <Route path="dashboard" element={<AdminDashboard />} />
          
          {/* 📋 Orders Management */}
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:orderId" element={<AdminOrderDetails />} />
          
          {/* 📦 Products Management */}
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/:productId" element={<AdminProductDetails />} />
          
          {/* 👥 Users Management */}
          <Route path="users" element={<AdminUsers />} />
          {/* <Route path="vendors" element={<AdminVendors />} /> */}
          {/* <Route path="customers" element={<AdminCustomers />} /> */}
          
          {/* 📈 Reports & Analytics */}
          {/* <Route path="reports" element={<AdminReports />} /> */}
          
          {/* ⚙️ Settings */}
          {/* <Route path="settings" element={<AdminSettings />} /> */}
        </Route>
        
        {/* 🔄 Fallback redirects */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default AdminApp;