import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginForm({ onSwitchToRegister }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setApiSuccess('');

    if (!formData.email || !formData.password) {
      setApiError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setApiError(data.message || 'Login failed.');
      } else {
        setApiSuccess(`Welcome back, ${data.user.name}! Access granted.`);
        setUserProfile(data.user);
      }
    } catch (err) {
      console.error('[Login submit error]:', err);
      setApiError('Unable to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your Community Portal account</p>
      </div>

      {apiError && (
        <div className="alert-box error">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>{apiError}</div>
        </div>
      )}

      {apiSuccess && (
        <div className="alert-box success">
          <CheckCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Authenticated!</strong>
            <p>{apiSuccess}</p>
            {userProfile && (
              <p style={{ fontSize: '0.85rem', marginTop: '6px', color: '#a7f3d0' }}>
                Role: <strong>{userProfile.role}</strong> | Status: Verified ✓
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Mail size={18} />
            </span>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="rahul@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Lock size={18} />
            </span>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Authenticating...' : 'Sign In'}
          {!loading && <LogIn size={18} />}
        </button>
      </form>

      <div className="toggle-auth">
        Don't have an account?{' '}
        <button type="button" className="toggle-btn" onClick={onSwitchToRegister}>
          Register Now
        </button>
      </div>
    </div>
  );
}
