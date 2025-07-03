import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toastManager from '../utils/toastManager';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'customer',
    agreeToTerms: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Input change handler
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

  // IMPROVED Form validation to match backend
  const validateForm = () => {
    const newErrors = {};

    // Name validation - matches backend regex
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad tələb olunur';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Ad ən azı 2 simvol olmalıdır';
    } else if (formData.firstName.trim().length > 50) {
      newErrors.firstName = 'Ad 50 simvoldan çox ola bilməz';
    } else if (!/^[a-zA-ZəöüğıçşƏÖÜĞIÇŞ\s]+$/.test(formData.firstName.trim())) {
      newErrors.firstName = 'Ad yalnız hərflərdən ibarət ola bilər';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad tələb olunur';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Soyad ən azı 2 simvol olmalıdır';
    } else if (formData.lastName.trim().length > 50) {
      newErrors.lastName = 'Soyad 50 simvoldan çox ola bilməz';
    } else if (!/^[a-zA-ZəöüğıçşƏÖÜĞIÇŞ\s]+$/.test(formData.lastName.trim())) {
      newErrors.lastName = 'Soyad yalnız hərflərdən ibarət ola bilər';
    }

    // Email validation - matches backend
    if (!formData.email.trim()) {
      newErrors.email = 'Email tələb olunur';
    } else if (formData.email.length > 100) {
      newErrors.email = 'Email 100 simvoldan çox ola bilməz';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Düzgün email formatı daxil edin';
    }

    // Password validation - MATCHES BACKEND EXACTLY
    if (!formData.password) {
      newErrors.password = 'Şifrə tələb olunur';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifrə ən azı 6 simvol olmalıdır';
    } else if (formData.password.length > 100) {
      newErrors.password = 'Şifrə 100 simvoldan çox ola bilməz';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Şifrə ən azı bir kiçik hərf, bir böyük hərf və bir rəqəm daxil etməlidir';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifrə təkrarı tələb olunur';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifrələr uyğun gəlmir';
    }

    // Phone validation - matches backend (optional)
    if (formData.phone && formData.phone.trim()) {
      // Basic phone validation - backend uses isMobilePhone
      if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone.trim())) {
        newErrors.phone = 'Düzgün telefon nömrəsi daxil edin';
      }
    }

    // Role validation
    if (!['customer', 'vendor'].includes(formData.role)) {
      newErrors.role = 'Role yalnız customer və ya vendor ola bilər';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'Şərtləri qəbul etməlisiniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toastManager.error('Xətalı məlumatları düzəldin');
      return;
    }

    setIsLoading(true);

    try {
      console.log('📝 Register attempt for:', formData.email);

      // Prepare registration data - EXACTLY as backend expects
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password, // Don't trim password!
        role: formData.role
      };

      // Only add phone if it's provided and not empty
      if (formData.phone && formData.phone.trim()) {
        registrationData.phone = formData.phone.trim();
      }

      console.log('📤 Sending registration data:', {
        ...registrationData,
        password: '[HIDDEN]'
      });

      // Use toastManager.promise for better UX
      const result = await toastManager.promise(
        register(registrationData),
        {
          loading: 'Qeydiyyat edilir...',
          success: (data) => {
            if (data.success) {
              return `Qeydiyyat tamamlandı! Xoş gəlmisiniz, ${data.user.firstName}!`;
            }
            throw new Error(data.error);
          },
          error: (err) => err.message || 'Qeydiyyat uğursuz oldu'
        }
      );

      if (result.success) {
        console.log('✅ Registration successful');
        
        // Redirect based on role after successful registration
        setTimeout(() => {
          switch (result.user.role) {
            case 'admin':
              navigate('/admin');
              break;
            case 'vendor':
              navigate('/vendor/dashboard');
              break;
            default:
              navigate('/');
          }
        }, 1000);
      } else {
        console.error('❌ Registration failed:', result.error);
        
        // Handle specific errors
        if (result.error?.includes('email') || result.error?.includes('qeydiyyatdan keçib')) {
          setErrors({ email: 'Bu email artıq qeydiyyatdan keçib' });
        }
      }

    } catch (error) {
      console.error('❌ Registration error:', error);
      
      // Handle validation errors from backend
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        console.log('📋 Backend validation errors:', errorData);
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const backendErrors = {};
          errorData.errors.forEach(err => {
            if (err.param) {
              backendErrors[err.param] = err.msg;
            }
          });
          setErrors(backendErrors);
          toastManager.error('Validation xətaları düzəldin');
        } else if (errorData.message) {
          if (errorData.message.includes('email') || errorData.message.includes('qeydiyyatdan keçib')) {
            setErrors({ email: 'Bu email artıq qeydiyyatdan keçib' });
          } else {
            toastManager.error(errorData.message);
          }
        }
      } else {
        toastManager.error(error.message || 'Qeydiyyat zamanı xəta baş verdi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: '6rem 2rem 2rem',
      minHeight: 'calc(100vh - 80px)',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        padding: '3rem',
        width: '100%',
        maxWidth: '500px',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '0.5rem',
            color: '#333',
            fontWeight: '700'
          }}>
            📝 Qeydiyyat
          </h1>
          <p style={{ 
            color: '#666',
            fontSize: '1.1rem'
          }}>
            Yeni hesab yaradın
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit}>
          {/* Name Fields */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500'
              }}>
                Ad *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Adınız"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errors.firstName ? '2px solid #e74c3c' : '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                  backgroundColor: '#fff'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = errors.firstName ? '#e74c3c' : '#e1e8ed'}
              />
              {errors.firstName && (
                <p style={{ color: '#e74c3c', fontSize: '14px', marginTop: '4px' }}>
                  {errors.firstName}
                </p>
              )}
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500'
              }}>
                Soyad *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Soyadınız"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errors.lastName ? '2px solid #e74c3c' : '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                  backgroundColor: '#fff'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = errors.lastName ? '#e74c3c' : '#e1e8ed'}
              />
              {errors.lastName && (
                <p style={{ color: '#e74c3c', fontSize: '14px', marginTop: '4px' }}>
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#333',
              fontWeight: '500'
            }}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: errors.email ? '2px solid #e74c3c' : '2px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.2s',
                backgroundColor: '#fff'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = errors.email ? '#e74c3c' : '#e1e8ed'}
            />
            {errors.email && (
              <p style={{ color: '#e74c3c', fontSize: '14px', marginTop: '4px' }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#333',
              fontWeight: '500'
            }}>
              Telefon
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+994 XX XXX XX XX"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: errors.phone ? '2px solid #e74c3c' : '2px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'border-color 0.2s',
                backgroundColor: '#fff'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = errors.phone ? '#e74c3c' : '#e1e8ed'}
            />
            {errors.phone && (
              <p style={{ color: '#e74c3c', fontSize: '14px', marginTop: '4px' }}>
                {errors.phone}
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#333',
              fontWeight: '500'
            }}>
              Hesab növü
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#fff'
              }}
            >
              <option value="customer">Müştəri</option>
              <option value="vendor">Satıcı</option>
            </select>
          </div>

          {/* Password Fields */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500'
              }}>
                Şifrə *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Şifrəniz (A-z, 0-9)"
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 16px',
                    border: errors.password ? '2px solid #e74c3c' : '2px solid #e1e8ed',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.2s',
                    backgroundColor: '#fff'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = errors.password ? '#e74c3c' : '#e1e8ed'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px'
                  }}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: '#e74c3c', fontSize: '14px', marginTop: '4px' }}>
                  {errors.password}
                </p>
              )}
              <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                Ən azı 6 simvol, 1 böyük hərf, 1 kiçik hərf, 1 rəqəm
              </p>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500'
              }}>
                Şifrə təkrarı *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Şifrəni təkrarlayın"
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 16px',
                    border: errors.confirmPassword ? '2px solid #e74c3c' : '2px solid #e1e8ed',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.2s',
                    backgroundColor: '#fff'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = errors.confirmPassword ? '#e74c3c' : '#e1e8ed'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px'
                  }}
                >
                  {showConfirmPassword ? '👁️' : '🙈'}
                </button>
              </div>
              {errors.confirmPassword && (
                <p style={{ color: '#e74c3c', fontSize: '14px', marginTop: '4px' }}>
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666'
            }}>
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                style={{ marginRight: '8px' }}
              />
              <span>
                <Link to="/terms" style={{ color: '#667eea', textDecoration: 'none' }}>
                  İstifadə şərtlərini
                </Link> və <Link to="/privacy" style={{ color: '#667eea', textDecoration: 'none' }}>
                  məxfilik siyasətini
                </Link> qəbul edirəm
              </span>
            </label>
            {errors.agreeToTerms && (
              <p style={{ color: '#e74c3c', fontSize: '14px', marginTop: '4px' }}>
                {errors.agreeToTerms}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: isLoading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              marginBottom: '1rem'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.target.style.backgroundColor = '#5a67d8';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.target.style.backgroundColor = '#667eea';
            }}
          >
            {isLoading ? '⏳ Qeydiyyat edilir...' : '📝 Qeydiyyatdan keç'}
          </button>
        </form>

        {/* Login Link */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Artıq hesabınız var?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: '#667eea', 
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Daxil olun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;