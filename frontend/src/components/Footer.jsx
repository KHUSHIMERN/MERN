import React from 'react';
import { useTranslation } from 'react-i18next';

export function Footer({ setActiveTab }) {
  const { t } = useTranslation();

  return (
    <footer className="global-footer">
      <div className="footer-container">
        <div className="footer-col about-col">
          <div className="footer-brand">
            <span className="brand-logo-icon">✨</span>
            <span className="brand-title">{t('header.brand', 'EventPulse')}</span>
          </div>
          <p className="footer-text">
            {t('footer.aboutText', 'EventPulse is a community-driven platform empowering individuals to host and discover vibrant local events across Karnataka and India.')}
          </p>
        </div>

        <div className="footer-col links-col">
          <h4 className="footer-heading">{t('footer.quickLinksTitle', 'Quick Links')}</h4>
          <ul className="footer-links-list">
            <li>
              <button type="button" onClick={() => setActiveTab('events')}>
                {t('header.nav.events', 'Events')}
              </button>
            </li>
            <li>
              <button type="button" onClick={() => setActiveTab('fallbackDemo')}>
                {t('header.nav.fallbackDemo', 'Fallback Demo')}
              </button>
            </li>
          </ul>
        </div>

        <div className="footer-col contact-col">
          <h4 className="footer-heading">{t('footer.contactTitle', 'Contact Us')}</h4>
          <ul className="footer-contact-list">
            <li>
              <strong>{t('footer.emailLabel', 'Support Email:')}</strong> support@eventpulse.org
            </li>
            <li>
              <strong>{t('footer.phoneLabel', 'Helpline:')}</strong> +91 80 2345 6789
            </li>
            <li>
              <strong>{t('footer.addressLabel', 'Address:')}</strong> {t('footer.addressText', 'MG Road, Bengaluru, Karnataka 560001')}
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="copyright-text">{t('footer.copyright', '© 2026 EventPulse. All rights reserved.')}</p>
      </div>
    </footer>
  );
}

export default Footer;
