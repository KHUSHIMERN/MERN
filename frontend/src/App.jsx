import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { TimezoneProvider } from './context/TimezoneContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';
import AuthPage from './components/AuthPage';
import ProfilePage from './components/ProfilePage';
import AdminRoleRequests from './components/AdminRoleRequests';
import I18nProvider from './components/I18nProvider';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import EventList from './components/EventList';
import OrganizerCheckIn from './components/OrganizerCheckIn';
import EventRegistrationForm from './components/EventRegistrationForm';
import FallbackTestDemo from './components/FallbackTestDemo';
import Footer from './components/Footer';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1'
    },
    secondary: {
      main: '#8b5cf6'
    },
    background: {
      default: '#0b0f19',
      paper: '#1e293b'
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8'
    }
  },
  typography: {
    htmlFontSize: 16,
    fontFamily: '"Plus Jakarta Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: 'var(--font-size-4xl, 2.25rem)' },
    h2: { fontSize: 'var(--font-size-3xl, 1.75rem)' },
    h3: { fontSize: 'var(--font-size-2xl, 1.5rem)' },
    h4: { fontSize: 'var(--font-size-xl, 1.25rem)' },
    h5: { fontSize: 'var(--font-size-lg, 1.125rem)' },
    h6: { fontSize: 'var(--font-size-base, 1rem)' },
    subtitle1: { fontSize: 'var(--font-size-base, 1rem)' },
    subtitle2: { fontSize: 'var(--font-size-sm, 0.875rem)' },
    body1: { fontSize: 'var(--font-size-base, 1rem)' },
    body2: { fontSize: 'var(--font-size-sm, 0.875rem)' },
    caption: { fontSize: 'var(--font-size-xs, 0.75rem)' },
    button: { fontSize: 'var(--font-size-sm, 0.875rem)' }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          fontSize: '100%'
        },
        body: {
          backgroundColor: '#0b0f19',
          color: '#f8fafc'
        }
      }
    }
  }
});

function AppContent() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [view, setView] = useState('register'); // 'register' | 'login' | 'events' | 'profile' | 'admin-requests'
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'checkin' | 'fallbackDemo'
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);

  const handleOpenRegisterModal = (evt = null) => {
    setSelectedEventForModal(evt);
    setIsRegisterModalOpen(true);
  };

  const handleCloseRegisterModal = () => {
    setIsRegisterModalOpen(false);
    setSelectedEventForModal(null);
  };

  const handleExploreClick = () => {
    setView('events');
    setActiveTab('events');
    const el = document.getElementById('events');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNotificationEvent = (event) => {
    setView('events');
    setActiveTab('events');
    handleOpenRegisterModal(event);
  };

  return (
    <div className="app-layout">
      {/* Skip-to-Content Link for Keyboard Accessibility */}
      <a href="#main-content" className="skip-to-content-link">
        {t('app.skipToContent', 'Skip to main content')}
      </a>

      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRegisterModal={() => handleOpenRegisterModal()}
        onOpenNotificationEvent={handleNotificationEvent}
        user={user}
        logout={logout}
        view={view}
        setView={setView}
      />

      {/* Main View Area */}
      <main id="main-content" tabIndex={-1} className="main-content">
        {(view === 'register' || view === 'login') && (
          <div className="auth-container-wrapper">
            <AuthPage
              initialMode={view === 'register' ? 'register' : 'login'}
              onLoginSuccess={() => setView('events')}
            />
          </div>
        )}

        {view === 'profile' && (
          <ProfilePage onNavigateHome={() => setView('events')} />
        )}

        {view === 'admin-requests' && (
          <AdminRoleRequests onNavigateHome={() => setView('profile')} />
        )}

        {view === 'events' && (
          <>
            <HeroSection
              onExplore={handleExploreClick}
              onRegister={() => handleOpenRegisterModal()}
            />

            {activeTab === 'events' && (
              <EventList
                refreshKey={eventsRefreshKey}
                onRegisterEvent={(evt) => handleOpenRegisterModal(evt)}
                onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
              />
            )}

            {activeTab === 'checkin' && (
              <OrganizerCheckIn
                onSelectEventForRegister={(evt) => handleOpenRegisterModal(evt)}
              />
            )}

            {activeTab === 'fallbackDemo' && <FallbackTestDemo />}
          </>
        )}
      </main>

      {/* Event Registration Modal Form */}
      {isRegisterModalOpen && (
        <EventRegistrationForm
          selectedEvent={selectedEventForModal}
          onClose={handleCloseRegisterModal}
          onNavigateProfile={() => setView('profile')}
          onRsvpChanged={() => setEventsRefreshKey((key) => key + 1)}
        />
      )}

      {/* Footer */}
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}

export function App() {
  return (
    <I18nProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <ToastProvider>
                <TimezoneProvider>
                  <AppContent />
                </TimezoneProvider>
              </ToastProvider>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
