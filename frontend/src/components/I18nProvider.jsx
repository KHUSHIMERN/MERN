import React, { Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

/**
 * Loading fallback component displayed while translation bundles are being loaded lazy.
 */
function TranslationLoader() {
  return (
    <div className="i18n-loader-overlay">
      <div className="i18n-spinner"></div>
      <p className="i18n-loader-text">Loading language resources...</p>
    </div>
  );
}

/**
 * I18nProvider component wrapping the app with i18next instance and React Suspense fallback.
 */
export function I18nProvider({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<TranslationLoader />}>
        {children}
      </Suspense>
    </I18nextProvider>
  );
}

export default I18nProvider;
