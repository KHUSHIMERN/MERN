import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { useFocusTrap } from '../hooks/useFocusTrap';

export function Header({ activeTab, setActiveTab, onOpenRegisterModal }) {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mobileNavRef = useFocusTrap(isMobileMenuOpen, () => setIsMobileMenuOpen(false));

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleRegisterClick = () => {
    onOpenRegisterModal();
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="global-header">
      <div className="header-container">
        {/* Brand Logo & Title */}
        <button
          type="button"
          className="header-brand"
          onClick={() => handleNavClick('events')}
        >
          <div className="brand-logo-icon">✨</div>
          <div className="brand-titles">
            <h1 className="brand-title">{t('header.brand', 'EventPulse')}</h1>
            <span className="brand-subtitle">{t('header.subtitle', 'Community Hub')}</span>
          </div>
        </button>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Navigation Links & Mobile Nav with Focus Trap */}
        <nav
          className={`header-nav ${isMobileMenuOpen ? 'mobile-nav-open' : ''}`}
          aria-label="Main Navigation"
          ref={mobileNavRef}
        >
          <button
            type="button"
            className={`nav-link ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => handleNavClick('events')}
          >
            {t('header.nav.events', 'Events')}
          </button>
          
          <button
            type="button"
            className={`nav-link nav-link-checkin ${activeTab === 'checkin' ? 'active' : ''}`}
            onClick={() => handleNavClick('checkin')}
          >
            📋 {t('header.nav.checkin', 'Check-in Desk')}
          </button>

          <button
            type="button"
            className="nav-link nav-link-highlight"
            onClick={handleRegisterClick}
          >
            + {t('header.nav.register', 'Register Event')}
          </button>
          
          <button
            type="button"
            className={`nav-link ${activeTab === 'fallbackDemo' ? 'active' : ''}`}
            onClick={() => handleNavClick('fallbackDemo')}
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
