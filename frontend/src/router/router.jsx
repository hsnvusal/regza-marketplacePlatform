import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from '../components/Layout/Layout'
import Home from '../pages/Home'
import ProductsPage from '../pages/ProductsPage'
import ProductDetailPage from '../pages/ProductDetailPage'
import CartPage from '../pages/CartPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import DashboardPage from '../pages/DashboardPage'
import NotFound from '../pages/NotFound'

const Router = () => {
  return (
    <Routes>
      {/* Main Layout Routes */}
      <Route path='/' element={<Layout />}>
        <Route index element={<Home />} />
        <Route path='/products' element={<ProductsPage />} />
        <Route path='/products/:id' element={<ProductDetailPage />} />
        <Route path='/cart' element={<CartPage />} />
        <Route path='/dashboard' element={<DashboardPage />} />
      </Route>
      
      {/* Auth Routes (without main layout) */}
      <Route path='/login' element={<LoginPage />} />
      <Route path='/register' element={<RegisterPage />} />
      
      {/* 404 */}
      <Route path='*' element={<NotFound />} />
    </Routes>
  )
}

export default Router