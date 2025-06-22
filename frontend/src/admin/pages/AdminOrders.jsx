import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      // API çağırısı
      // const response = await adminService.getOrders(filters);
      
      // Mock data
      setTimeout(() => {
        setOrders([
          {
            id: '1',
            orderNumber: 'ORD-001',
            customer: { name: 'Aysel Məmmədova', email: 'aysel@example.com' },
            total: 150.50,
            status: 'pending',
            createdAt: new Date().toISOString(),
            items: 3
          },
          {
            id: '2',
            orderNumber: 'ORD-002',
            customer: { name: 'Rəşad Əliyev', email: 'reshad@example.com' },
            total: 275.00,
            status: 'completed',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            items: 5
          }
        ]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Orders loading error:', error);
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: '#d69e2e', bg: '#fef5e7', text: 'Gözləyir' },
      confirmed: { color: '#3182ce', bg: '#ebf8ff', text: 'Təsdiqləndi' },
      shipped: { color: '#805ad5', bg: '#faf5ff', text: 'Göndərildi' },
      delivered: { color: '#38a169', bg: '#f0fff4', text: 'Çatdırıldı' },
      completed: { color: '#38a169', bg: '#f0fff4', text: 'Tamamlandı' },
      cancelled: { color: '#e53e3e', bg: '#fed7d7', text: 'Ləğv edildi' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span 
        className="status-badge"
        style={{ 
          backgroundColor: config.bg, 
          color: config.color,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: '500'
        }}
      >
        {config.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Sifarişlər yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="admin-orders">
      <div className="orders-header">
        <div className="orders-filters">
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="all">Bütün statuslar</option>
            <option value="pending">Gözləyən</option>
            <option value="confirmed">Təsdiqlənmiş</option>
            <option value="shipped">Göndərilmiş</option>
            <option value="completed">Tamamlanmış</option>
            <option value="cancelled">Ləğv edilmiş</option>
          </select>
          
          <input
            type="text"
            placeholder="Sifariş axtarışı..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
          />
          
          <button onClick={() => loadOrders()} className="refresh-btn">
            🔄 Yenilə
          </button>
        </div>
      </div>

      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>Sifariş #</th>
              <th>Müştəri</th>
              <th>Məhsullar</th>
              <th>Məbləğ</th>
              <th>Status</th>
              <th>Tarix</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link to={`/admin/orders/${order.id}`} className="order-link">
                    {order.orderNumber}
                  </Link>
                </td>
                <td>
                  <div>
                    <div className="customer-name">{order.customer.name}</div>
                    <div className="customer-email">{order.customer.email}</div>
                  </div>
                </td>
                <td>{order.items} məhsul</td>
                <td className="order-total">{order.total.toFixed(2)} AZN</td>
                <td>{getStatusBadge(order.status)}</td>
                <td>{new Date(order.createdAt).toLocaleDateString('az-AZ')}</td>
                <td>
                  <div className="action-buttons">
                    <Link to={`/admin/orders/${order.id}`} className="view-btn">
                      👁️ Bax
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;