import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const footerSections = {
    customer: {
      title: 'Alıcılar üçün',
      links: [
        { href: '/help/how-to-order', label: 'Necə sifariş verim?', icon: '❓' },
        { href: '/help/payment', label: 'Ödəniş üsulları', icon: '💳' },
        { href: '/help/delivery', label: 'Çatdırılma xidməti', icon: '🚚' },
        { href: '/help/returns', label: 'Qaytarma şərtləri', icon: '↩️' },
        { href: '/help/guarantee', label: 'Alıcı zəmanəti', icon: '🛡️' },
        { href: '/support', label: 'Müştəri dəstəyi', icon: '📞' }
      ]
    },
    vendor: {
      title: 'Satıcılar üçün',
      links: [
        { href: '/vendor/register', label: 'Satıcı ol', icon: '🏪' },
        { href: '/vendor/dashboard', label: 'Satıcı paneli', icon: '📊' },
        { href: '/vendor/fees', label: 'Komissiya haqqları', icon: '💰' },
        { href: '/vendor/reports', label: 'Satış hesabatları', icon: '📈' },
        { href: '/vendor/ads', label: 'Reklam xidmətləri', icon: '🎯' },
        { href: '/vendor/training', label: 'Satıcı təlimləri', icon: '🎓' }
      ]
    },
    company: {
      title: 'Şirkət haqqında',
      links: [
        { href: '/about', label: 'Haqqımızda', icon: 'ℹ️' },
        { href: '/careers', label: 'Karyera', icon: '💼' },
        { href: '/press', label: 'Press mərkəzi', icon: '📰' },
        { href: '/partners', label: 'Tərəfdaş ol', icon: '🤝' },
        { href: '/responsibility', label: 'Sosial məsuliyyət', icon: '🌱' },
        { href: '/offices', label: 'Ofislərimiz', icon: '📍' }
      ]
    }
  };

  const socialLinks = [
    { href: '#', icon: '📘', label: 'Facebook', color: '#1877F2' },
    { href: '#', icon: '📷', label: 'Instagram', color: '#E4405F' },
    { href: '#', icon: '🐦', label: 'Twitter', color: '#1DA1F2' },
    { href: '#', icon: '📺', label: 'YouTube', color: '#FF0000' },
    { href: '#', icon: '💼', label: 'LinkedIn', color: '#0A66C2' }
  ];

  const bottomLinks = [
    { href: '/privacy', label: 'Məxfilik Siyasəti' },
    { href: '/terms', label: 'İstifadə Şərtləri' },
    { href: '/cookies', label: 'Cookie Siyasəti' }
  ];

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* Brand Section */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <div className="footer-logo-icon">🛍️</div>
              <div className="footer-logo-text">MarketPlace Pro</div>
            </Link>
            <p className="footer-description">
              Azərbaycanın ən böyük və etibar edilən e-commerce platforması. 
              Hər gün milyonlarla müştəriyə xidmət göstəririk və onların alış-veriş təcrübəsini mükəmməl edirik.
            </p>
            <div className="social-links">
              {socialLinks.map((social, index) => (
                <a 
                  key={index}
                  href={social.href} 
                  className="social-link"
                  aria-label={social.label}
                  style={{ '--social-color': social.color }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Footer Sections */}
          {Object.entries(footerSections).map(([key, section]) => (
            <div key={key} className="footer-section">
              <h3>{section.title}</h3>
              <ul>
                {section.links.map((link, index) => (
                  <li key={index}>
                    <Link to={link.href} className="footer-link">
                      <span className="footer-link-icon">{link.icon}</span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <p>&copy; 2025 MarketPlace Pro. Bütün hüquqlar qorunur.</p>
          </div>
          <div className="footer-bottom-links">
            {bottomLinks.map((link, index) => (
              <Link key={index} to={link.href} className="footer-bottom-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;