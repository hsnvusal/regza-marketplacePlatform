import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import Router from "./router/router";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Toaster } from 'react-hot-toast';
import toastManager from './utils/toastManager';

// 🔐 Admin Panel Context (ayrı admin sistem üçün)
import { AdminAuthProvider } from './admin/context/AdminAuthContext';

// Initialize toast manager early

// DISABLE StrictMode completely in development
const isDev = import.meta.env.DEV;
const AppWrapper = isDev ? React.Fragment : React.StrictMode;

// Initialize toastManager as soon as possible
if (isDev) {
  console.log('🔧 Development mode - StrictMode disabled, ToastManager initialized');
  console.log('🔐 Admin Panel available at: /admin');
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <AppWrapper>
    {/* 🌐 Public App Providers */}
    <AuthProvider>
      <CartProvider>
        
        {/* 🔐 Admin Panel Provider (ayrı context) */}
        <AdminAuthProvider>
          
          <BrowserRouter>
            <Router />
            
            {/* 🍞 Toast Notifications (həm public, həm admin üçün) */}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '500',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                  style: {
                    background: '#10b981',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                  style: {
                    background: '#ef4444',
                  },
                },
                // 🔐 Admin toasts (fərqli stil)
                loading: {
                  style: {
                    background: '#f59e0b',
                  },
                }
              }}
            />
          </BrowserRouter>
          
        </AdminAuthProvider>
      </CartProvider>
    </AuthProvider>
  </AppWrapper>
);