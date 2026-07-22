import React from 'react';
import { useTranslation } from 'react-i18next';
import LANGUAGES from '../constants/languages';

export function FallbackTestDemo() {
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language || 'en';
  const savedLocalStorage = typeof localStorage !== 'undefined' ? localStorage.getItem('app_language') : 'N/A';

  // Test missing key: fallbackDemo.keyMissingMessage exists in en.json, omitted in hi.json and kn.json
  const untranslatedResult = t('fallbackDemo.keyMissingMessage');
  const isFallbackUsed = currentLang !== 'en' && untranslatedResult.includes('English (en.json)');

  return (
    <section className="fallback-demo-section" id="fallbackDemo">
      <div className="demo-card">
        <div className="demo-card-header">
          <span className="demo-badge">⚙️ i18n Architecture Inspector</span>
          <h2 className="demo-title">{t('fallbackDemo.title', 'i18n Lazy Loading & Missing Key Fallback Test')}</h2>
          <p className="demo-description">
            {t('fallbackDemo.description', 'This test demonstrates how missing translation keys in non-English locales automatically fall back to English.')}
          </p>
        </div>

        <div className="demo-status-grid">
          <div className="status-item">
            <span className="status-title">{t('fallbackDemo.activeLanguage', 'Active Language:')}</span>
            <div className="status-pill active-pill">
              <span className="pill-code">{currentLang.toUpperCase()}</span>
              <span className="pill-name">
                {LANGUAGES.find((l) => l.code === currentLang.slice(0, 2))?.nativeName || currentLang}
              </span>
            </div>
          </div>

          <div className="status-item">
            <span className="status-title">{t('fallbackDemo.storageKey', 'LocalStorage Key (app_language):')}</span>
            <div className="status-pill">
              <code>app_language: "{savedLocalStorage}"</code>
            </div>
          </div>

          <div className="status-item">
            <span className="status-title">{t('fallbackDemo.loadedNotice', 'Bundle Status:')}</span>
            <div className="status-pill success-pill">
              ⚡ {t('fallbackDemo.bundleLoaded', 'Loaded via HTTP Backend (/locales/{{lng}}.json)')}
            </div>
          </div>
        </div>

        <div className="fallback-test-box">
          <h3 className="test-box-title">
            🛡️ {t('fallbackDemo.fallbackSectionTitle', 'Missing Key Fallback Verification')}
          </h3>
          <p className="test-box-info">
            {t('fallbackDemo.fallbackNotice', "The key 'fallbackDemo.keyMissingMessage' is intentionally defined ONLY in en.json and omitted from hi.json and kn.json.")}
          </p>

          <div className="key-inspection-card">
            <div className="inspection-header">
              <span className="key-name">Key: <code>fallbackDemo.keyMissingMessage</code></span>
              {isFallbackUsed ? (
                <span className="fallback-tag warning">
                  ⚠️ Fallback Active: Evaluated to English default!
                </span>
              ) : (
                <span className="fallback-tag success">
                  ✓ Native Locale String
                </span>
              )}
            </div>

            <div className="inspection-content">
              <span className="output-label">{t('fallbackDemo.untranslatedLabel', 'Key Output in Current Language:')}</span>
              <blockquote className="output-quote">{untranslatedResult}</blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FallbackTestDemo;
