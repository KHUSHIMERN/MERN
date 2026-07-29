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
            className="nav-link"
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
        <div className="header-controls">
          {user ? (
            <div className="header-user-actions">
              <span className="user-signed-in-info">
                Signed in as <strong>{user.name}</strong> ({user.role})
              </span>
              {user.role === 'admin' && (
                <button
                  type="button"
                  className="nav-link nav-link-admin"
                  onClick={() => setView && setView('admin-requests')}
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
                className="nav-link nav-link-logout"
                onClick={() => {
                  if (logout) logout();
                  if (setView) setView('login');
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="header-auth-actions">
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
          <LanguageSelector variant="dropdown" />
        </div>
      </div>
    </header>
  );
}

export default Header;
