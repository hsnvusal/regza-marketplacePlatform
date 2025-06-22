import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminOrderDetails from './pages/AdminOrderDetails';
import AdminProducts from './pages/AdminProducts';
import AdminVendors from './pages/AdminVendors';
import AdminCustomers from './pages/AdminCustomers';
import AdminSettings from './pages/AdminSettings';
import AdminReports from './pages/AdminReports';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import './styles/admin.css';

const AdminApp = () => {
  return (
    <AdminAuthProvider>
      <Router basename="/admin">
        <Routes>
          {/* Public admin routes */}
          <Route path="/login" element={<AdminLogin />} />
          
          {/* Protected admin routes */}
          <Route path="/" element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:orderId" element={<AdminOrderDetails />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AdminAuthProvider>
  );
};

export default AdminApp;