import React from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';

export function Header({ activeTab, setActiveTab, onOpenRegisterModal }) {
  const { t } = useTranslation();

  return (
    <header className="global-header">
      <div className="header-container">
        {/* Brand Logo & Title */}
        <div
          className="header-brand"
          onClick={() => setActiveTab('events')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('events');
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="brand-logo-icon">✨</div>
          <div className="brand-titles">
            <h1 className="brand-title">{t('header.brand', 'EventPulse')}</h1>
            <span className="brand-subtitle">{t('header.subtitle', 'Community Hub')}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="header-nav" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-link ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            {t('header.nav.events', 'Events')}
          </button>
          
          <button
            type="button"
            className={`nav-link nav-link-checkin ${activeTab === 'checkin' ? 'active' : ''}`}
            onClick={() => setActiveTab('checkin')}
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
            className={`nav-link ${activeTab === 'fallbackDemo' ? 'active' : ''}`}
            onClick={() => setActiveTab('fallbackDemo')}
          >
            🧪 {t('header.nav.fallbackDemo', 'Fallback Demo')}
          </button>
        </nav>

        {/* Global Language Selector */}
        <div className="header-language-control">
          <LanguageSelector variant="both" />
        </div>
      </div>
    </header>
  );
}

export default Header;
