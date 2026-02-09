import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AdminResetPassword.css';

const AdminResetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Validate token on component mount
    if (token) {
      validateToken();
    } else {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const validateToken = async () => {
    try {
      // For now, we'll assume the token is valid if it exists
      // You might want to add a token validation endpoint later
      if (token && token.length > 10) {
        setTokenValid(true);
      } else {
        setError('Invalid or expired reset token. Please request a new password reset.');
        setTokenValid(false);
      }
    } catch (error) {
      setError('Invalid or expired reset token. Please request a new password reset.');
      setTokenValid(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Invalid reset token. Please request a new password reset.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(' http://localhost:7001/api/admin/confirm-forget-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          password: formData.password
        })
      });

      console.log('Reset password response status:', response.status);

      if (response.ok) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setFormData({
          password: '',
          confirmPassword: ''
        });
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/admin/login');
        }, 2000);
      } else if (response.status === 401) {
        setError('Authentication required. This is a backend configuration issue. Please contact your administrator.');
      } else if (response.status === 403) {
        setError('Access denied. This is a backend configuration issue. Please contact your administrator.');
      } else if (response.status === 500) {
        setError('Server error (500). This indicates a backend issue. Please check your backend logs and ensure the /admin/confirm-forget-password endpoint is properly configured without authentication requirements.');
      } else {
        try {
          const data = await response.json();
          setError(data.message || data.error || 'Failed to reset password. Please try again.');
        } catch (parseError) {
          setError('An unexpected error occurred. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="admin-reset-password">
        <div className="reset-password-container">
          <div className="error-message">
            Invalid reset link. Please request a new password reset.
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="admin-reset-password">
        <div className="reset-password-container">
          <div className="error-message">
            {error || 'Validating reset token...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-reset-password">
      <div className="reset-password-container">
        <div className="reset-password-header">
          <h1>Reset Password</h1>
          <p>Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="reset-password-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your new password"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              placeholder="Confirm your new password"
              minLength="6"
            />
          </div>

          <button 
            type="submit" 
            className="reset-btn"
            disabled={loading}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminResetPassword;
