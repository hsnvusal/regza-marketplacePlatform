import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout/Layout'
import Home from '../pages/Home'
import ProductsPage from '../pages/ProductsPage'
import ProductDetailPage from '../pages/ProductDetailPage'
import CartPage from '../pages/CartPage'
import OrdersPage from '../pages/OrdersPage'
import OrderDetailsPage from '../pages/OrderDetailsPage'
import OrderTrackingPage from '../pages/OrderTrackingPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import DashboardPage from '../pages/DashboardPage'
import NotFound from '../pages/NotFound'

// Loading Component
const LoadingScreen = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    backgroundColor: '#f8fafc',
    color: '#64748b',
    fontFamily: 'Inter, sans-serif'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        fontSize: '48px',
        marginBottom: '20px',
        animation: 'spin 2s linear infinite'
      }}>
        🔄
      </div>
      <div style={{ fontSize: '16px', fontWeight: '500' }}>
        MarketPlace Pro yüklənir...
      </div>
      <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}>
        Giriş məlumatları yoxlanılır...
      </div>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, isInitialized } = useAuth();
   
  console.log('🛡️ ProtectedRoute check - isLoggedIn:', isLoggedIn, 'isInitialized:', isInitialized);
   
  // Auth hələ də initialize olmayıbsa loading göstər
  if (!isInitialized) {
    console.log('⏳ ProtectedRoute: Auth not initialized yet, showing loading');
    return <LoadingScreen />;
  }
   
  if (!isLoggedIn) {
    console.log('❌ ProtectedRoute: User not logged in, redirecting to login');
    return <Navigate to="/login" replace />;
  }
   
  console.log('✅ ProtectedRoute: User authenticated, allowing access');
  return children;
};

const Router = () => {
  const { isLoading, isInitialized, isLoggedIn } = useAuth();
 
  // Show loading while auth is initializing
  if (isLoading || !isInitialized) {
    console.log('🔄 Router: Auth loading state:', { isLoading, isInitialized });
    return <LoadingScreen />;
  }
 
  console.log('✅ Router: Auth initialized, rendering routes. isLoggedIn:', isLoggedIn);
 
  return (
    <Routes>
      {/* Main Layout Routes */}
      <Route path='/' element={<Layout />}>
        {/* PUBLIC ROUTES - No login required */}
        <Route index element={<Home />} />
        <Route path='/products' element={<ProductsPage />} />
        <Route path='/products/:id' element={<ProductDetailPage />} />
                
        {/* PROTECTED ROUTES - Login required */}
        <Route 
          path='/cart'
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
         />
        <Route 
          path='/orders'
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
         />
        
        {/* 🔥 ORDER DETAIL ROUTE - orders/:orderId (tracking-dən əvvəl) */}
        <Route 
          path='/orders/:orderId'
          element={
            <ProtectedRoute>
              <OrderDetailsPage />
            </ProtectedRoute>
          }
         />
        
        {/* 🔥 ORDER TRACKING ROUTE - orders/:orderId/tracking (daha spesifik) */}
        <Route 
          path='/orders/:orderId/tracking'
          element={
            <ProtectedRoute>
              <OrderTrackingPage />
            </ProtectedRoute>
          }
         />
        
        <Route 
          path='/dashboard'
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
         />
      </Route>
                
      {/* Auth Routes (without main layout) */}
      <Route 
        path='/login'
        element={
          isLoggedIn ? (
            <>
              {console.log('🔄 Login page: User already logged in, redirecting to dashboard')}
              <Navigate to="/dashboard" replace />
            </>
          ) : (
            <>
              {console.log('✅ Login page: Showing login form')}
              <LoginPage />
            </>
          )
        }
       />
      <Route 
        path='/register'
        element={
          isLoggedIn ? (
            <>
              {console.log('🔄 Register page: User already logged in, redirecting to dashboard')}
              <Navigate to="/dashboard" replace />
            </>
          ) : (
            <>
              {console.log('✅ Register page: Showing register form')}
              <RegisterPage />
            </>
          )
        }
       />
                
      {/* 404 */}
      <Route path='*' element={<NotFound />} />
    </Routes>
  )
}

export default Router