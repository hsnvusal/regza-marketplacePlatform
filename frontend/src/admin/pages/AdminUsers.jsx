// src/admin/pages/AdminUsers.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../services/adminService';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await adminService.getUsers(filters);
      
      if (result.success) {
        setUsers(result.users);
        setPagination(result.pagination);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Users loading error:', error);
      setError('İstifadəçilər yüklənərkən xəta baş verdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleUserStatusUpdate = async (userId, newStatus) => {
    const statusText = newStatus === 'active' ? 'aktiv' : 'deaktiv';
    if (!window.confirm(`Bu istifadəçini ${statusText} etmək istəyirsiniz?`)) {
      return;
    }

    try {
      const result = await adminService.updateUserStatus(userId, {
        isActive: newStatus === 'active'
      });
      
      if (result.success) {
        loadUsers();
        alert(`İstifadəçi ${statusText} edildi!`);
      } else {
        alert('Xəta: ' + result.error);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Status yeniləmə xətası');
    }
  };

  const handleUserRoleUpdate = async (userId, newRole) => {
    if (!window.confirm(`Bu istifadəçinin rolunu "${newRole}" olaraq dəyişmək istəyirsiniz?`)) {
      return;
    }

    try {
      const result = await adminService.updateUserRole(userId, {
        role: newRole
      });
      
      if (result.success) {
        loadUsers();
        alert('İstifadəçi rolu yeniləndi!');
      } else {
        alert('Xəta: ' + result.error);
      }
    } catch (error) {
      console.error('Role update error:', error);
      alert('Rol yeniləmə xətası');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bu istifadəçini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.')) {
      return;
    }

    try {
      const result = await adminService.deleteUser(userId);
      
      if (result.success) {
        loadUsers();
        alert('İstifadəçi silindi!');
      } else {
        alert('Xəta: ' + result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silinmə xətası');
    }
  };

  const getStatusBadge = (isActive) => {
    return (
      <span 
        className="status-badge"
        style={{ 
          backgroundColor: isActive ? '#10b981' : '#ef4444', 
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: '500'
        }}
      >
        {isActive ? 'Aktiv' : 'Deaktiv'}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const config = {
      'admin': { bg: '#8b5cf6', text: 'Admin' },
      'vendor': { bg: '#3b82f6', text: 'Satıcı' },
      'customer': { bg: '#10b981', text: 'Müştəri' }
    };
    
    const style = config[role] || config.customer;
    
    return (
      <span 
        className="role-badge"
        style={{ 
          backgroundColor: style.bg,
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: '500'
        }}
      >
        {style.text}
      </span>
    );
  };

  const formatDate = (date) => {
    return adminService.formatDate(date, {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>İstifadəçilər yüklənir...</p>
      </div>
    );
  }

  return (
    <div className="admin-users">
      {/* Header & Stats */}
      <div className="users-header">
        <div className="header-left">
          <h2>👥 İstifadəçi İdarəetməsi</h2>
          <div className="users-stats">
            <span className="stat-item">
              Ümumi: {pagination.totalUsers || 0}
            </span>
            <span className="stat-item">
              Aktiv: {users.filter(u => u.isActive).length}
            </span>
            <span className="stat-item">
              Səhifə: {pagination.currentPage || 1} / {pagination.totalPages || 1}
            </span>
          </div>
        </div>
        
        <div className="header-actions">
          <button onClick={loadUsers} className="refresh-btn">
            🔄 Yenilə
          </button>
          <Link to="/admin/users/new" className="add-user-btn">
            ➕ Yeni İstifadəçi
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="users-filters">
        <div className="filter-row">
          <select 
            value={filters.role} 
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="filter-select"
          >
            <option value="all">Bütün rollar</option>
            <option value="admin">Admin</option>
            <option value="vendor">Satıcı</option>
            <option value="customer">Müştəri</option>
          </select>
          
          <select 
            value={filters.status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="all">Bütün statuslar</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Deaktiv</option>
          </select>
          
          <input
            type="text"
            placeholder="Ad, soyad və ya email..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-search"
          />

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="filter-date"
            title="Başlanğıc tarix"
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="filter-date"
            title="Son tarix"
          />
          
          <select 
            value={`${filters.sortBy}-${filters.sortOrder}`} 
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
            }}
            className="filter-select"
          >
            <option value="createdAt-desc">Ən yeni</option>
            <option value="createdAt-asc">Ən köhnə</option>
            <option value="firstName-asc">Ad (A-Z)</option>
            <option value="firstName-desc">Ad (Z-A)</option>
            <option value="lastLogin-desc">Son giriş</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={loadUsers} className="retry-btn">
            Yenidən cəhd edin
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>İstifadəçi</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Status</th>
              <th>Son giriş</th>
              <th>Qeydiyyat</th>
              <th>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="user-details">
                        <Link to={`/admin/users/${user._id}`} className="user-name">
                          {user.firstName} {user.lastName}
                        </Link>
                        <div className="user-meta">
                          {user.phone && <span>📞 {user.phone}</span>}
                          {user.address?.city && <span>📍 {user.address.city}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="user-email">{user.email}</td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td>{getStatusBadge(user.isActive)}</td>
                  <td className="last-login">
                    {user.lastLogin ? formatDate(user.lastLogin) : 'Heç vaxt'}
                  </td>
                  <td className="registration-date">{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/admin/users/${user._id}`} className="view-btn">
                        👁️ Bax
                      </Link>
                      
                      <Link to={`/admin/users/${user._id}/edit`} className="edit-btn">
                        ✏️ Redaktə
                      </Link>
                      
                      {/* Role Change */}
                      <select 
                        value={user.role}
                        onChange={(e) => handleUserRoleUpdate(user._id, e.target.value)}
                        className="role-select"
                        disabled={user.role === 'admin'}
                      >
                        <option value="customer">Müştəri</option>
                        <option value="vendor">Satıcı</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      {/* Status Toggle */}
                      <button 
                        onClick={() => handleUserStatusUpdate(user._id, user.isActive ? 'inactive' : 'active')}
                        className={`status-toggle-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                        title={user.isActive ? 'Deaktiv et' : 'Aktiv et'}
                      >
                        {user.isActive ? '🔴' : '🟢'}
                      </button>
                      
                      {/* Delete (only for non-admin users) */}
                      {user.role !== 'admin' && (
                        <button 
                          onClick={() => handleDeleteUser(user._id)}
                          className="delete-btn"
                          title="Sil"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-data">
                  {filters.search || filters.role !== 'all' || filters.status !== 'all' ? 
                    'Axtarış kriteriyalarına uyğun istifadəçi tapılmadı' : 
                    'Hələ istifadəçi yoxdur'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="pagination-btn"
          >
            ← Əvvəlki
          </button>
          
          <div className="pagination-info">
            Səhifə {pagination.currentPage} / {pagination.totalPages}
          </div>
          
          <button 
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="pagination-btn"
          >
            Sonrakı →
          </button>
        </div>
      )}

      {/* Users Summary */}
      <div className="users-summary">
        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-label">Ümumi istifadəçilər:</span>
            <span className="summary-value">{pagination.totalUsers || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Bu səhifədə:</span>
            <span className="summary-value">{users.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Aktiv istifadəçilər:</span>
            <span className="summary-value">
              {users.filter(u => u.isActive).length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Admin sayı:</span>
            <span className="summary-value">
              {users.filter(u => u.role === 'admin').length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Satıcı sayı:</span>
            <span className="summary-value">
              {users.filter(u => u.role === 'vendor').length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Müştəri sayı:</span>
            <span className="summary-value">
              {users.filter(u => u.role === 'customer').length}
            </span>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bulk-actions">
        <h4>Toplu əməliyyatlar:</h4>
        <div className="bulk-buttons">
          <button className="bulk-btn export">
            📊 Excel-ə export et
          </button>
          <button className="bulk-btn email">
            📧 Toplu email göndər
          </button>
          <button className="bulk-btn inactive">
            🔴 Seçilmiş istifadəçiləri deaktiv et
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;