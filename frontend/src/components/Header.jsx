import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import TimezoneSelectorModal from './TimezoneSelectorModal';
import { useTimezone } from '../context/TimezoneContext';
import { getTimezoneOffsetLabel } from '../utils/dateUtils';

/**
 * Header — sticky global navigation bar.
 */
export function Header({ activeTab, setActiveTab, onOpenRegisterModal, user, logout, view, setView }) {
  const { t } = useTranslation();
  const { activeTimezone, isOverridden } = useTimezone();
  const [isTzModalOpen, setIsTzModalOpen] = useState(false);

  const offsetLabel = getTimezoneOffsetLabel(activeTimezone);

  return (
    <>
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
              className={`nav-link ${view === 'events' && activeTab === 'checkin' ? 'active' : ''}`}
              onClick={() => {
                if (setView) setView('events');
                if (setActiveTab) setActiveTab('checkin');
              }}
            >
              📋 {t('header.nav.checkin', 'Check-in Desk')}
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

          {/* Global Controls: Timezone, Auth & Language Selector */}
          <div className="header-controls">
            {/* Active Timezone Pill Button */}
            <button
              type="button"
              className={`timezone-pill-btn ${isOverridden ? 'is-override' : ''}`}
              onClick={() => setIsTzModalOpen(true)}
              title={`Active Timezone: ${activeTimezone} (${offsetLabel}). Click to change.`}
            >
              <span className="tz-globe-icon">🌐</span>
              <span className="tz-city-name">
                {activeTimezone.split('/')[1]?.replace('_', ' ') || activeTimezone}
              </span>
              <span className="tz-offset-badge">{offsetLabel}</span>
              {isOverridden && <span className="tz-override-dot" title="Timezone Override Active">⚡</span>}
            </button>

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
                  className={`nav-link ${(view === 'login' || view === 'register') ? 'active' : ''}`}
                  onClick={() => setView && setView('login')}
                >
                  🔑 Log In / Register
                </button>
              </div>
            )}
            <LanguageSelector variant="dropdown" />
          </div>
        </div>
      </header>

      {/* Timezone Selector Modal */}
      <TimezoneSelectorModal open={isTzModalOpen} onClose={() => setIsTzModalOpen(false)} />
    </>
  );
}

export default Header;
