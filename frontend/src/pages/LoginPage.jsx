import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './LoginPage.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, loginMock, isLoggedIn, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isLoggedIn, isLoading, navigate, location]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email tələb olunur';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Düzgün email formatı daxil edin';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Şifrə tələb olunur';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifrə ən azı 6 simvol olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Zəhmət olmasa bütün sahələri düzgün doldurun');
      return;
    }

    setIsSubmitting(true);

    try {
      // Try real API first, fallback to mock
      let result;
      
      try {
        result = await login(formData.email, formData.password);
      } catch (error) {
        console.log('API not available, using mock login');
        result = loginMock(formData.email, formData.password);
      }

      if (result.success) {
        toast.success(`Xoş gəlmisiniz, ${result.user.firstName}!`);
        
        // Save remember me preference
        if (formData.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }

        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        toast.error(result.error || 'Giriş uğursuz oldu');
        setErrors({ submit: result.error });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Sistem xətası baş verdi');
      setErrors({ submit: 'Sistem xətası baş verdi' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (email, password, userType) => {
    setFormData({ email, password, rememberMe: false });
    
    // Auto submit after setting data
    setTimeout(() => {
      const result = loginMock(email, password);
      if (result.success) {
        toast.success(`Demo ${userType} hesabı ilə giriş edildi!`);
        navigate('/dashboard', { replace: true });
      }
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="login-loading">
        <div className="loader"></div>
        <p>Yoxlanılır...</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-content">
          {/* Left Side - Form */}
          <div className="login-form-section">
            <div className="login-header">
              <Link to="/" className="login-logo">
                <div className="logo-icon">🛍️</div>
                <span>MarketPlace Pro</span>
              </Link>
              <h1>Xoş gəlmisiniz!</h1>
              <p>Hesabınıza daxil olun və alış-verişə davam edin</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {errors.submit && (
                <div className="error-banner">
                  ⚠️ {errors.submit}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  📧 Email ünvanı
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="example@mail.com"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <span className="error-text">{errors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  🔒 Şifrə
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                />
                {errors.password && (
                  <span className="error-text">{errors.password}</span>
                )}
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  <span className="checkbox-custom"></span>
                  Məni xatırla
                </label>

                <Link to="/forgot-password" className="forgot-link">
                  Şifrəni unutdunuz?
                </Link>
              </div>

              <button
                type="submit"
                className={`login-btn ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Giriş edilir...
                  </>
                ) : (
                  <>
                    🚀 Daxil ol
                  </>
                )}
              </button>

              <div className="login-footer">
                <p>
                  Hesabınız yoxdur?{' '}
                  <Link to="/register" className="register-link">
                    Qeydiyyatdan keçin
                  </Link>
                </p>
              </div>
            </form>

            {/* Demo Accounts */}
            <div className="demo-section">
              <h3>Demo Hesabları</h3>
              <div className="demo-buttons">
                <button
                  className="demo-btn admin"
                  onClick={() => handleDemoLogin('admin@example.com', 'password', 'Admin')}
                  disabled={isSubmitting}
                >
                  👨‍💼 Admin
                </button>
                <button
                  className="demo-btn vendor"
                  onClick={() => handleDemoLogin('vendor@example.com', 'password', 'Vendor')}
                  disabled={isSubmitting}
                >
                  🏪 Vendor
                </button>
                <button
                  className="demo-btn customer"
                  onClick={() => handleDemoLogin('user@example.com', 'password', 'Customer')}
                  disabled={isSubmitting}
                >
                  👤 Customer
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Info */}
          <div className="login-info-section">
            <div className="info-content">
              <h2>Azərbaycanın #1 E-commerce Platforması</h2>
              <div className="features">
                <div className="feature">
                  <div className="feature-icon">🛍️</div>
                  <div>
                    <h4>50M+ Məhsul</h4>
                    <p>Ən geniş məhsul çeşidi</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature-icon">🚚</div>
                  <div>
                    <h4>Sürətli Çatdırılma</h4>
                    <p>24 saat içində qapınızda</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature-icon">🔒</div>
                  <div>
                    <h4>Təhlükəsiz Ödəniş</h4>
                    <p>256-bit SSL şifrələmə</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature-icon">⭐</div>
                  <div>
                    <h4>99.9% Məmnuniyyət</h4>
                    <p>Milyonlarla məmnun müştəri</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;