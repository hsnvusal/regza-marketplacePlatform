import React from 'react';
import { Link } from 'react-router-dom';

const RegisterPage = () => {
  return (
    <div style={{ 
      padding: '6rem 2rem 2rem', 
      textAlign: 'center', 
      minHeight: 'calc(100vh - 80px)',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝 Qeydiyyat</h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '2rem', opacity: 0.9 }}>
        Yeni hesab yaradın
      </p>
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '2rem', 
        borderRadius: '12px', 
        maxWidth: '400px', 
        margin: '0 auto',
        backdropFilter: 'blur(10px)'
      }}>
        <p style={{ marginBottom: '1rem' }}><strong>Register form burada olacaq</strong></p>
        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
          Artıq hesabınız var? <Link to="/login" style={{ color: '#fff', textDecoration: 'underline' }}>Daxil olun</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
