import React, { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import './i18n';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Suspense fallback={<div className="i18n-loading">Loading translations...</div>}>
        <App />
      </Suspense>
    </AuthProvider>
  </StrictMode>
);
