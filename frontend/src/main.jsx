import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import Router from "./router/router";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import toast, { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Router />
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
            }}
          />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  </React.StrictMode>
);