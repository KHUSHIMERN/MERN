import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

export default function AuthPage({ initialMode = 'login', onLoginSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [registeredEmail, setRegisteredEmail] = useState(() => new URLSearchParams(window.location.search).get('email') || '');

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  return (
    <div className="auth-card auth-unified-card">
      {/* Unified Tab Switcher */}
      <div className="auth-tabs-wrapper">
        <button
          type="button"
          className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => setMode('login')}
        >
          🔑 Log In
        </button>
        <button
          type="button"
          className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
          onClick={() => setMode('register')}
        >
          ✨ Create Account
        </button>
      </div>

      {/* Render Login or Register Form inside unified card */}
      {mode === 'login' ? (
        <LoginForm
          hideCardWrapper={true}
          onSwitchToRegister={() => setMode('register')}
          onLoginSuccess={onLoginSuccess}
          initialEmail={registeredEmail}
        />
      ) : (
        <RegisterForm
          hideCardWrapper={true}
          onSwitchToLogin={(email = '') => {
            if (email) setRegisteredEmail(email);
            setMode('login');
          }}
        />
      )}
    </div>
  );
}
