import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LANGUAGES from '../constants/languages';

export function LanguageSelector({ variant = 'both' }) {
  const { i18n, t } = useTranslation();

  const currentLanguage = i18n.language || 'en';

  const handleLanguageChange = (newLangCode) => {
    // Emit language change event to i18n provider
    i18n.changeLanguage(newLangCode);
    
    // Explicitly persist selection to localStorage
    try {
      localStorage.setItem('app_language', newLangCode);
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
  };

  useEffect(() => {
    // Ensure localStorage stays synced with initial detected language
    const saved = localStorage.getItem('app_language');
    if (saved && saved !== i18n.language && LANGUAGES.some(l => l.code === saved)) {
      i18n.changeLanguage(saved);
    }
  }, [i18n]);

  return (
    <div className="language-selector-wrapper" data-testid="language-selector">
      {/* Segmented Control Mode */}
      {(variant === 'segmented' || variant === 'both') && (
        <div className="language-segmented-control" role="radiogroup" aria-label="Language selector">
          {LANGUAGES.map((lang) => {
            const isActive = currentLanguage.startsWith(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`segmented-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
                title={`Switch language to ${lang.name}`}
              >
                <span className="lang-flag">{lang.flag}</span>
                <span className="lang-native">{lang.nativeName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Dropdown Select Mode */}
      {(variant === 'dropdown' || variant === 'both') && (
        <div className="language-dropdown-container">
          <label htmlFor="language-select" className="sr-only">
            {t('header.languageLabel', 'Language:')}
          </label>
          <div className="select-box-wrapper">
            <span className="globe-icon">🌐</span>
            <select
              id="language-select"
              className="language-select-dropdown"
              value={currentLanguage.slice(0, 2)}
              onChange={(e) => handleLanguageChange(e.target.value)}
              aria-label="Select Language"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
            <span className="arrow-icon">▼</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
