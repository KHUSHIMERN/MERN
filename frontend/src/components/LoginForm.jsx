import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginForm({ onSwitchToRegister, onLoginSuccess, hideCardWrapper = false, initialEmail = '' }) {
  const { login, resendVerification, verifyEmail } = useAuth();
  const [formData, setFormData] = useState({
    email: initialEmail,
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [verificationLink, setVerificationLink] = useState('');
  const [verificationToken, setVerificationToken] = useState('');

  React.useEffect(() => {
    if (initialEmail) setFormData((current) => ({ ...current, email: initialEmail }));
  }, [initialEmail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setApiError('');
    setIsUnverified(false);
    setResendStatus('');
    setVerificationLink('');
    setVerificationToken('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setApiSuccess('');
    setIsUnverified(false);
    setResendStatus('');

    if (!formData.email || !formData.password) {
      setApiError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(formData.email.trim(), formData.password);

      if (!result.success) {
        setApiError(result.message || 'Login failed.');
        if (result.isUnverified) {
          setIsUnverified(true);
        }
      } else {
        setApiSuccess(`Welcome back, ${result.user.name}! Access granted.`);
        setUserProfile(result.user);
        if (onLoginSuccess) {
          setTimeout(() => onLoginSuccess(result.user), 1000);
        }
      }
    } catch (err) {
      console.error('[Login submit error]:', err);
      setApiError('Unable to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!formData.email) return;
    setResendStatus('Sending...');
    const res = await resendVerification(formData.email.trim());
    if (res.success) {
      setResendStatus('Verification email sent! Check your inbox or use the development link below.');
      const data = res.data || {};
      setVerificationLink(data.backendVerifyLink || data.verificationLink || '');
      setVerificationToken(data.verificationToken || '');
    } else {
      setResendStatus(res.message || 'Failed to resend verification.');
    }
  };

  const handleVerifyNow = async () => {
    if (!verificationToken) return;
    setResendStatus('Verifying account...');
    const result = await verifyEmail(verificationToken);
    if (result.success) {
      setIsUnverified(false);
      setApiError('');
      setVerificationLink('');
      setVerificationToken('');
      setApiSuccess('Email verified. You can sign in now.');
      setResendStatus('');
    } else {
      setResendStatus(result.message);
    }
  };

  const content = (
    <>
      <div className="auth-header">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your Community Portal account</p>
      </div>

      {apiError && (
        <div className="alert-box error" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>{apiError}</div>
          </div>
          {isUnverified && (
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResend}
                style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
              >
                <Send size={12} /> Resend Verification Link
              </button>
              {resendStatus && <div style={{ fontSize: '0.8rem', marginTop: '6px', color: '#f87171' }}>{resendStatus}</div>}
              {verificationLink && (
                <a href={verificationLink} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '8px', color: '#fca5a5', fontWeight: 700 }}>
                  Open verification link
                </a>
              )}
              {verificationToken && (
                <button type="button" className="btn-secondary" onClick={handleVerifyNow} style={{ marginTop: '8px', fontSize: '0.8rem', padding: '5px 10px' }}>
                  <CheckCircle size={13} /> Verify Account Now
                </button>
              )}
            </div>
          )}
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
              placeholder="resident@indore.org"
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
    </>
  );

  if (hideCardWrapper) {
    return <div className="auth-form-inner">{content}</div>;
  }

  return <div className="auth-card">{content}</div>;
}
