import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './AdminForgotPassword.css';

const AdminForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(' http://localhost:7001/api/admin/forget-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      // Handle different response scenarios
      if (response.ok) {
        setSuccess('Password reset email has been sent to your email address. Please check your inbox.');
        setEmail('');
      } else if (response.status === 403) {
        setError('This feature requires authentication. Please contact your administrator for password reset.');
      } else if (response.status === 500) {
        setError('Server error occurred. Please try again later or contact support.');
      } else {
        // Try to parse response, but handle cases where response might be malformed
        try {
          const data = await response.json();
          setError(data.message || 'Failed to send reset email. Please try again.');
        } catch (parseError) {
          setError('An unexpected error occurred. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-forgot-password">
      <div className="forgot-password-container">
        <div className="forgot-password-header">
          <h1>Forgot Password</h1>
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <form onSubmit={handleSubmit} className="forgot-password-form">
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
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email address"
            />
          </div>

          <button 
            type="submit" 
            className="reset-btn"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="forgot-password-footer">
          <Link to="/admin/login" className="back-to-login">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
