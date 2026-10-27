import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

/**
 * i18n Configuration with lazy loading (i18next-http-backend),
 * browser language detection, localStorage persistence, and English fallback.
 */
i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'hi', 'kn'],
    fallbackLng: 'en',
    load: 'languageOnly',
    debug: false,
    
    // Detection options: persistent setting in localStorage under 'app_language'
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'app_language',
      caches: ['localStorage'],
    },

    // Lazy loading backend configuration
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false, // Prevents blank screen freezes during translation bundle fetching
    },
  });

// Keep html lang attribute in sync with active language
if (typeof document !== 'undefined' && i18n.language) {
  document.documentElement.lang = i18n.language.slice(0, 2);
}

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng ? lng.slice(0, 2) : 'en';
  }
});

export default i18n;
