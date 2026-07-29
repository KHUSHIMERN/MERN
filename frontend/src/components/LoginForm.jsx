import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginForm({ onSwitchToRegister, onLoginSuccess }) {
  const { setAuthData } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationLink, setVerificationLink] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setApiError('');
    setIsUnverified(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setApiSuccess('');
    setIsUnverified(false);
    setVerificationLink('');

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

      if (!response.ok) {
        setApiError(data.message || 'Login failed.');
        if (response.status === 403 || data.isVerified === false) {
          setIsUnverified(true);
        }
      } else {
        setApiSuccess(`Welcome back, ${data.user.name}! Access granted. Opening dashboard...`);
        setUserProfile(data.user);
        if (setAuthData) {
          setAuthData(data.token, data.user);
        }
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess();
          }
        }, 600);
      }
    } catch (err) {
      console.error('[Login submit error]:', err);
      setApiError('Unable to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setApiError('');
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setApiSuccess(data.message || 'Verification email sent!');
        if (data.verificationLink || data.backendVerifyLink) {
          setVerificationLink(data.verificationLink || data.backendVerifyLink);
        }
      } else {
        setApiError(data.message || 'Failed to resend verification email.');
      }
    } catch (err) {
      setApiError('Error connecting to server to resend verification.');
    } finally {
      setResending(false);
    }
  };

  const handleQuickVerify = async () => {
    setResending(true);
    setApiError('');
    try {
      const resendRes = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      const resendData = await resendRes.json();
      if (!resendRes.ok || !resendData.verificationToken) {
        setApiError(resendData.message || 'Could not retrieve verification token.');
        return;
      }

      const verifyRes = await fetch(`/api/auth/verify?token=${resendData.verificationToken}`);
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setApiError(verifyData.message || 'Verification failed.');
        return;
      }

      setIsUnverified(false);

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok && loginData.user) {
        setApiSuccess(`Email verified! Welcome back, ${loginData.user.name}! Opening dashboard...`);
        setUserProfile(loginData.user);
        if (setAuthData) {
          setAuthData(loginData.token, loginData.user);
        }
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess();
          }
        }, 600);
      } else {
        setApiError(loginData.message || 'Login failed after verification.');
      }
    } catch (err) {
      setApiError('Error completing auto-verification.');
    } finally {
      setResending(false);
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
          <div>
            <div>{apiError}</div>
            {isUnverified && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={{
                    fontSize: '0.825rem',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                  }}
                  onClick={handleQuickVerify}
                  disabled={resending}
                >
                  {resending ? 'Verifying...' : '⚡ Quick Verify & Sign In'}
                </button>
                <button
                  type="button"
                  style={{
                    fontSize: '0.825rem',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: '#374151',
                    color: '#fff',
                    border: 'none',
                  }}
                  onClick={handleResendVerification}
                  disabled={resending}
                >
                  Resend Verification Email
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {apiSuccess && (
        <div className="alert-box success">
          <CheckCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <p>{apiSuccess}</p>
            {verificationLink && (
              <div className="verify-link-preview" style={{ marginTop: '8px' }}>
                <strong>Simulated Dev Verification Link:</strong><br />
                <a href={verificationLink} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                  Click here to verify email
                </a>
              </div>
            )}
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
