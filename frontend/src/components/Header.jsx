import React from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';

export function Header({ activeTab, setActiveTab, onOpenRegisterModal, user, logout, view, setView }) {
  const { t } = useTranslation();

  return (
    <header className="global-header">
      <div className="header-container">
        {/* Brand Logo & Title */}
        <div
          className="header-brand"
          onClick={() => {
            if (setView) setView('events');
            if (setActiveTab) setActiveTab('events');
          }}
          role="button"
          tabIndex={0}
        >
          <div className="brand-logo-icon">✨</div>
          <div className="brand-titles">
            <h1 className="brand-title">CommunityConnect</h1>
            <span className="brand-subtitle">{t('header.subtitle', 'Community Hub')}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="header-nav">
          <button
            type="button"
            className={`nav-link ${view === 'events' && activeTab === 'events' ? 'active' : ''}`}
            onClick={() => {
              if (setView) setView('events');
              if (setActiveTab) setActiveTab('events');
            }}
          >
            {t('header.nav.events', 'Events')}
          </button>
          <button
            type="button"
            className="nav-link nav-link-highlight"
            onClick={onOpenRegisterModal}
          >
            + {t('header.nav.register', 'Register Event')}
          </button>
          <button
            type="button"
            className={`nav-link ${view === 'events' && activeTab === 'fallbackDemo' ? 'active' : ''}`}
            onClick={() => {
              if (setView) setView('events');
              if (setActiveTab) setActiveTab('fallbackDemo');
            }}
          >
            🧪 {t('header.nav.fallbackDemo', 'Fallback Demo')}
          </button>
        </nav>

        {/* Global Controls: Auth & Language Selector */}
        <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Signed in as <strong>{user.name}</strong> ({user.role})
              </span>
              {user.role === 'admin' && (
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => setView && setView('admin-requests')}
                  style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)', color: '#fff', padding: '6px 12px', borderRadius: '6px' }}
                >
                  Admin Requests
                </button>
              )}
              <button
                type="button"
                className={`nav-link ${view === 'profile' ? 'active' : ''}`}
                onClick={() => setView && setView('profile')}
              >
                Profile
              </button>
              <button
                type="button"
                className="nav-link"
                onClick={() => {
                  if (logout) logout();
                  if (setView) setView('login');
                }}
                style={{ color: '#f87171' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className={`nav-link ${view === 'login' ? 'active' : ''}`}
                onClick={() => setView && setView('login')}
              >
                Log In
              </button>
              <button
                type="button"
                className="nav-link nav-link-highlight"
                onClick={() => setView && setView('register')}
              >
                Register
              </button>
            </div>
          )}
          <LanguageSelector variant="both" />
        </div>
      </div>
    </header>
  );
}

export default Header;
