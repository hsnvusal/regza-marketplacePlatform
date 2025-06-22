const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class AdminAuthService {
  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          token: data.token,
          admin: data.admin
        };
      }
      
      return {
        success: false,
        error: data.message || 'Giriş uğursuz oldu'
      };
    } catch (error) {
      console.error('Admin login error:', error);
      return {
        success: false,
        error: 'Server ilə əlaqə xətası'
      };
    }
  }

  async verifyToken() {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        return { success: false, error: 'Token yoxdur' };
      }

      const response = await fetch(`${API_BASE_URL}/admin/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        return {
          success: true,
          admin: data.admin
        };
      }
      
      return {
        success: false,
        error: data.message || 'Token yoxlanması uğursuz'
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        success: false,
        error: 'Token yoxlanması xətası'
      };
    }
  }

  async logout() {
    try {
      const token = localStorage.getItem('adminToken');
      if (token) {
        await fetch(`${API_BASE_URL}/admin/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminToken');
    }
  }

  getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
}

export default new AdminAuthService();
