import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';
import i18n from '../i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('app_language');
      if (saved) return saved.slice(0, 2);
    }
    return (i18n.language || 'en').slice(0, 2);
  });

  useEffect(() => {
    // Keep local state in sync when i18n language changes externally (e.g. via LanguageSelector)
    const handleLanguageChanged = (newLng) => {
      const normalized = (newLng || 'en').slice(0, 2);
      setLangState(normalized);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = normalized;
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);

    // Initial sync if i18n language differs from lang state
    const currentI18nLang = (i18n.language || 'en').slice(0, 2);
    if (currentI18nLang !== lang) {
      i18n.changeLanguage(lang);
    }

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const toggleLanguage = (newLang) => {
    const normalized = (newLang || 'en').slice(0, 2);
    setLangState(normalized);
    
    // Sync with i18next
    if (i18n.language !== normalized) {
      i18n.changeLanguage(normalized);
    }

    // Persist to localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('app_language', normalized);
      }
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }

    // Update document attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalized;
    }
  };

  const t = (key, fallback) => {
    // Try i18next first if key exists
    if (i18n && typeof i18n.exists === 'function' && i18n.exists(key)) {
      return i18n.t(key);
    }
    // Fall back to translations dictionary or fallback argument or key itself
    return translations[lang]?.[key] || translations['en']?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

