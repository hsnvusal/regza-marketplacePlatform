import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import './Header.css';

const Header = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Use contexts
  const { user, isLoggedIn, logout } = useAuth();
  const { itemCount } = useCart();
  
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
      toast.success(`"${searchTerm}" üçün axtarış edilir...`);
    }
  };

  const handleCartClick = () => {
    navigate('/cart');
  };

  const handleLoginClick = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Uğurla çıxış etdiniz');
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const showToast = (message) => {
    // Toast notification helper
    console.log('Toast:', message);
  };

  const navItems = [
    { href: '/products', label: 'Məhsullar', icon: '📦' },
    { href: '/categories', label: 'Kateqoriyalar', icon: '📂' },
    { href: '/vendors', label: 'Satıcılar', icon: '🏪' },
    { href: '/support', label: 'Dəstək', icon: '🎧' }
  ];

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <nav className="nav-container">
        {/* Logo */}
        <Link to="/" className="logo">
          <div className="logo-icon">🛍️</div>
          <div className="logo-text">MarketPlace Pro</div>
        </Link>

        {/* Search Bar */}
        <div className="search-container">
          <form onSubmit={handleSearch} className="search-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Məhsul, marka, kateqoriya axtarın..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="search-btn">
              🔍
            </button>
          </form>
        </div>

        {/* Desktop Navigation */}
        <div className="nav-menu">
          {navItems.map((item, index) => (
            <Link key={index} to={item.href} className="nav-link">
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="nav-actions">
          {/* Cart Button */}
          <button className="cart-btn" onClick={handleCartClick}>
            🛒
            {itemCount > 0 && (
              <span className="cart-count">{itemCount}</span>
            )}
          </button>

          {/* Login/User Button */}
          {isLoggedIn && user ? (
            <div className="user-menu">
              <button className="user-button">
                <span className="user-avatar">👤</span>
                {user.firstName}
              </button>
              <div className="user-dropdown">
                <Link to="/dashboard" className="dropdown-link">
                  📊 Dashboard
                </Link>
                <Link to="/orders" className="dropdown-link">
                  📦 Sifarişlərim
                </Link>
                <Link to="/profile" className="dropdown-link">
                  ⚙️ Profil
                </Link>
                <button onClick={handleLogout} className="dropdown-link logout">
                  🚪 Çıxış
                </button>
              </div>
            </div>
          ) : (
            <button className="btn-primary" onClick={handleLoginClick}>
              Giriş / Qeydiyyat
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <span className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          {navItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className="mobile-nav-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          
          <div className="mobile-menu-divider"></div>
          
          {isLoggedIn && user ? (
            <>
              <Link to="/dashboard" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="mobile-nav-icon">📊</span>
                Dashboard
              </Link>
              <Link to="/orders" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="mobile-nav-icon">📦</span>
                Sifarişlərim
              </Link>
              <button className="mobile-logout-btn" onClick={handleLogout}>
                🚪 Çıxış
              </button>
            </>
          ) : (
            <button 
              className="mobile-login-btn"
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLoginClick();
              }}
            >
              Giriş / Qeydiyyat
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
    </header>
  );
};

export default Header;