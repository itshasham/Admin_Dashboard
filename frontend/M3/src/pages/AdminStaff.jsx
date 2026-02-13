import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminStaff.css';
import { API_BASE_URL } from '../config/api';

const AdminStaff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'Admin',
    image: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    
    if (!token) {
      navigate('/admin/login');
      return;
    }

    // Check user role for access control
    if (adminData) {
      try {
        const userData = JSON.parse(adminData);
        setCurrentUser(userData);
        
        // Only Manager and CEO can access staff management (per RBAC rules).
        if (userData.role !== 'Manager' && userData.role !== 'CEO') {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error parsing admin data:', error);
        navigate('/admin/login');
        return;
      }
    }

    fetchStaff();
  }, [navigate]);

  // Check if user can edit/delete staff
  const canEditStaff = (targetRole) => {
    if (!currentUser) return false;
    if (currentUser.role === 'CEO') return true;
    // Manager can only manage Admin-level users.
    return currentUser.role === 'Manager' && targetRole === 'Admin';
  };

  // Check if user can add new staff
  const canAddStaff = () => {
    if (!currentUser) return false;
    return ['Manager', 'CEO'].includes(currentUser.role);
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Staff data received:', data);
        
        // Ensure staff is always an array
        if (Array.isArray(data)) {
          setStaff(data);
        } else if (data && Array.isArray(data.data)) {
          setStaff(data.data);
        } else if (data && Array.isArray(data.staff)) {
          setStaff(data.staff);
        } else {
          console.warn('Unexpected data format:', data);
          setStaff([]);
        }
      } else if (response.status === 403) {
        setAccessDenied(true);
      } else {
        console.error('Failed to fetch staff, status:', response.status);
        setStaff([]);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = editingStaff 
        ? `${API_BASE_URL}/admin/update-stuff/${editingStaff._id}`
        : `${API_BASE_URL}/admin/add`;
      
      const method = editingStaff ? 'PATCH' : 'POST';
      const bodyData = editingStaff 
        ? { ...formData, password: undefined } // Don't send password for updates
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      if (response.ok) {
        setShowAddForm(false);
        setEditingStaff(null);
        setFormData({
          name: '',
          email: '',
          password: '',
          phone: '',
          role: 'Admin',
          image: ''
        });
        fetchStaff();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('An error occurred while saving staff member');
    }
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name || '',
      email: staffMember.email || '',
      password: '',
      phone: staffMember.phone || '',
      role: staffMember.role || 'Admin',
      image: staffMember.image || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/admin/${staffId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchStaff();
      } else {
        alert('Failed to delete staff member');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('An error occurred while deleting staff member');
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'Admin',
      image: ''
    });
  };

  // Show access denied message
  if (accessDenied) {
    return (
      <div className="admin-staff">
        <div className="access-denied">
          <h1>Access Denied</h1>
          <p>You don't have permission to access Staff Management.</p>
          <p>Only Managers and CEOs can access this page.</p>
          <button onClick={() => navigate('/admin/dashboard')} className="back-btn">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-staff">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-staff">
      <div className="staff-header">
        <h1>Staff Management</h1>
        <div className="header-info">
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="back-dashboard-btn"
          >
            ← Back
          </button>
          <span className="user-role">Logged in as: {currentUser?.role || 'Unknown'}</span>
          {canAddStaff() && (
            <button 
              onClick={() => setShowAddForm(true)} 
              className="add-staff-btn"
            >
              Add New Staff
            </button>
          )}
        </div>
      </div>

      {/* Show role-based info */}
      <div className="role-permissions-info">
        <div className="permission-badge">
          {currentUser?.role === 'Manager' && (
            <span className="permission-text">Managers: can manage Admin users only</span>
          )}
          {currentUser?.role === 'CEO' && (
            <span className="permission-text">✏️ Full Access - Can Edit & Delete</span>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="staff-form-overlay">
          <div className="staff-form">
            <h2>{editingStaff ? 'Edit Staff Member' : 'Add New Staff'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {!editingStaff && (
                <div className="form-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingStaff}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Phone:</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Role:</label>
                {currentUser?.role === "CEO" ? (
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="CEO">CEO</option>
                  </select>
                ) : (
                  <select
                    name="role"
                    value={"Admin"}
                    onChange={() => {}}
                    disabled
                  >
                    <option value="Admin">Admin</option>
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Image URL:</label>
                <input
                  type="url"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn">
                  {editingStaff ? 'Update Staff' : 'Add Staff'}
                </button>
                <button type="button" onClick={cancelForm} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="staff-list">
        {!Array.isArray(staff) || staff.length === 0 ? (
          <div className="no-staff">
            <p>No staff members found.</p>
            {canAddStaff() && (
              <p>Click "Add New Staff" to add your first staff member.</p>
            )}
          </div>
        ) : (
          <div className="staff-grid">
            {staff.map((staffMember) => (
              <div key={staffMember._id} className="staff-card">
                <div className="staff-avatar">
                  {staffMember.image ? (
                    <img src={staffMember.image} alt={staffMember.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {staffMember.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="staff-info">
                  <h3>{staffMember.name}</h3>
                  <p className="staff-email">{staffMember.email}</p>
                  <p className="staff-role">{staffMember.role}</p>
                  {staffMember.phone && (
                    <p className="staff-phone">{staffMember.phone}</p>
                  )}
                </div>
                {canEditStaff(staffMember.role) && (
                  <div className="staff-actions">
                    <button 
                      onClick={() => handleEdit(staffMember)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(staffMember._id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                )}
                {!canEditStaff(staffMember.role) && (
                  <div className="staff-actions">
                    <div className="read-only-badge">
                      No Access
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="staff-footer">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="back-dashboard-btn"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default AdminStaff;
