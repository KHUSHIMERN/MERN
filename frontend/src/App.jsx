import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';
import ProfilePage from './components/ProfilePage';

export default function App() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('register'); // 'register' | 'login' | 'profile'

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-main, #0f172a)', color: 'var(--text-main, #f8fafc)' }}>
      {/* Top Header Navbar */}
      <header
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '16px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: '800', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} onClick={() => setView(user ? 'profile' : 'register')}>
          CommunityConnect
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {user ? (
            <>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                Signed in as <strong>{user.name}</strong> ({user.role})
              </span>
              <button
                className="btn-secondary"
                onClick={() => setView('profile')}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Profile & Settings
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  logout();
                  setView('login');
                }}
                style={{ padding: '8px 16px', fontSize: '13px', color: '#f87171' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-secondary"
                onClick={() => setView('login')}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Log In
              </button>
              <button
                className="btn-primary"
                onClick={() => setView('register')}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Register
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Body View */}
      <div style={{ padding: '20px' }}>
        {view === 'profile' && <ProfilePage onNavigateHome={() => setView(user ? 'profile' : 'login')} />}
        {view === 'register' && <RegisterForm onSwitchToLogin={() => setView('login')} />}
        {view === 'login' && <LoginForm onSwitchToRegister={() => setView('register')} />}
      </div>
    </main>
  );
}
