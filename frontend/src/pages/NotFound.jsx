import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{ 
      padding: '6rem 2rem 2rem', 
      textAlign: 'center', 
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ fontSize: '8rem', marginBottom: '1rem', color: '#6366f1' }}>404</h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1f2937' }}>Səhifə Tapılmadı</h2>
      <p style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '2rem' }}>
        Axtardığınız səhifə mövcud deyil və ya köçürülüb.
      </p>
      <Link 
        to="/" 
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '12px',
          textDecoration: 'none',
          fontWeight: '600',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}
      >
        🏠 Ana Səhifəyə Qayıt
      </Link>
    </div>
  );
};

export default NotFound;