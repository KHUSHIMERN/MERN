import React, { useState } from 'react';
import { User, Mail, Lock, Shield, UserCheck, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function RegisterForm({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'resident',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [verificationLink, setVerificationLink] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setApiSuccess('');
    setVerificationLink('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setApiError(data.message || 'Registration failed. Please try again.');
      } else {
        setApiSuccess(data.message);
        if (data.data && data.data.verificationLink) {
          setVerificationLink(data.data.verificationLink);
        }
        // Reset sensitive form fields
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'resident',
        });
      }
    } catch (err) {
      console.error('[Registration submit error]:', err);
      setApiError('Unable to connect to the backend server. Please check server status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <span className="auth-badge">
          <UserCheck size={14} /> Tier 2-4 Community Hub
        </span>
        <h1 className="auth-title">Create an Account</h1>
        <p className="auth-subtitle">Join thousands discovering local events & career opportunities in your city.</p>
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
            <strong>Registration Received!</strong>
            <p style={{ marginTop: '4px' }}>{apiSuccess}</p>
            {verificationLink && (
              <div className="verify-link-preview">
                <strong>Simulated Dev Email Link:</strong>
                <a href={verificationLink} target="_blank" rel="noreferrer">
                  Click here to verify email
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Name Input */}
        <div className="form-group">
          <label className="form-label">
            Full Name <span className="req">*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <User size={18} />
            </span>
            <input
              type="text"
              name="name"
              className="form-input"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        {/* Email Input */}
        <div className="form-group">
          <label className="form-label">
            Email Address <span className="req">*</span>
          </label>
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
            />
          </div>
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        {/* Password Input */}
        <div className="form-group">
          <label className="form-label">
            Password <span className="req">*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Lock size={18} />
            </span>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        {/* Confirm Password Input */}
        <div className="form-group">
          <label className="form-label">
            Confirm Password <span className="req">*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Lock size={18} />
            </span>
            <input
              type="password"
              name="confirmPassword"
              className="form-input"
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
          {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
        </div>

        {/* Role Selection Dropdown */}
        <div className="form-group">
          <label className="form-label">Account Role (Default: Resident)</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Shield size={18} />
            </span>
            <select
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="resident">Resident (Discover & RSVP Events)</option>
              <option value="organizer">Event Organizer (Post & Track Events)</option>
              <option value="admin" disabled>
                Administrator (System Restricted)
              </option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="toggle-auth">
        Already have an account?{' '}
        <button type="button" className="toggle-btn" onClick={onSwitchToLogin}>
          Sign In
        </button>
      </div>
    </div>
  );
}
