import React from 'react';

const DashboardPage = () => {
  return (
    <div style={{ padding: '6rem 2rem 2rem', textAlign: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#6366f1' }}>📊 Dashboard</h1>
      <p style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '2rem' }}>
        İstifadəçi dashboard-u burada olacaq
      </p>
      <div style={{ background: '#f1f5f9', padding: '2rem', borderRadius: '12px', maxWidth: '600px', margin: '0 auto' }}>
        <p><strong>Planned Features:</strong></p>
        <ul style={{ textAlign: 'left', marginTop: '1rem' }}>
          <li>👤 User profile management</li>
          <li>📦 Order history</li>
          <li>⭐ Reviews and ratings</li>
          <li>❤️ Wishlist management</li>
          <li>📍 Address book</li>
          <li>🔔 Notifications</li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardPage;