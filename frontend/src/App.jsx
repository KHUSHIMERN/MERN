import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { TimezoneProvider } from './context/TimezoneContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import AuthPage from './components/AuthPage';
import ProfilePage from './components/ProfilePage';
import AdminRoleRequests from './components/AdminRoleRequests';
import I18nProvider from './components/I18nProvider';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import EventList from './components/EventList';
import AIRecommendationSection from './components/AIRecommendationSection';
import OrganizerCheckIn from './components/OrganizerCheckIn';
import OrganizerDashboard from './components/OrganizerDashboard';
import EventRegistrationForm from './components/EventRegistrationForm';
import SmartCalendar from './components/SmartCalendar';
import NearbyEventsMap from './components/NearbyEventsMap';
import VoiceAssistantModal from './components/VoiceAssistantModal';
import VolunteerMatchingSection from './components/VolunteerMatchingSection';
import FallbackTestDemo from './components/FallbackTestDemo';
import Footer from './components/Footer';
import './App.css';

// MUI Theme — rem-based typography so all sizes scale with browser zoom (WCAG 1.4.4)
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
  const { user, loading: authLoading, logout } = useAuth();
  const [view, setView] = useState(() => new URLSearchParams(window.location.search).get('verified') === 'true' ? 'login' : 'events');
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'checkin' | 'fallbackDemo'
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setView('login');
      params.delete('verified');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && (view === 'login' || view === 'register')) {
      setView('events');
      setActiveTab('events');
    }
  }, [authLoading, user, view]);

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
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
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
          <ProfilePage
            onNavigateHome={() => setView('events')}
            onNavigateCalendar={() => {
              setView('events');
              setActiveTab('calendar');
            }}
            onRsvpChanged={() => setEventsRefreshKey((key) => key + 1)}
          />
        )}

        {view === 'admin-requests' && (
          <AdminRoleRequests onNavigateHome={() => setView('events')} />
        )}

        {view === 'events' && (
          <>
            {activeTab === 'events' && (
              <>
                <HeroSection
                  onExplore={handleExploreClick}
                  onExploreMap={() => setActiveTab('map')}
                  onRegister={() => handleOpenRegisterModal()}
                />

                {/* AI Recommendations — shown above the events list, visible to all users.
                    Authenticated users get personalised results; guests get popular local events. */}
                <AIRecommendationSection
                  refreshSignal={eventsRefreshKey}
                  onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
                  onRSVP={(evt) => handleOpenRegisterModal(evt)}
                />

                {/* Feature 10: Volunteer and Skill Matching */}
                <VolunteerMatchingSection
                  onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
                  onRegisterSuccess={() => setEventsRefreshKey((key) => key + 1)}
                />

                <EventList
                  refreshKey={eventsRefreshKey}
                  onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
                  onRequireLogin={() => setView('login')}
                />
              </>
            )}

            {activeTab === 'volunteer' && (
              <VolunteerMatchingSection
                onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
                onRegisterSuccess={() => setEventsRefreshKey((key) => key + 1)}
              />
            )}

            {activeTab === 'checkin' && (
              <OrganizerCheckIn />
            )}

            {activeTab === 'calendar' && (
              <SmartCalendar
                onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
                onRsvpChanged={() => setEventsRefreshKey((key) => key + 1)}
              />
            )}

            {activeTab === 'map' && (
              <NearbyEventsMap
                onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
                onRsvpChanged={() => setEventsRefreshKey((key) => key + 1)}
              />
            )}

            {activeTab === 'organizer-dashboard' && (
              <OrganizerDashboard
                onNavigateHome={() => setActiveTab('events')}
                onNavigateCheckIn={() => setActiveTab('checkin')}
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
          onRequireLogin={() => {
            handleCloseRegisterModal();
            setView('login');
          }}
        />
      )}

      {/* Voice AI Assistant Modal */}
      <VoiceAssistantModal
        open={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
        onRsvpSuccess={() => setEventsRefreshKey((key) => key + 1)}
      />

      {/* Floating Voice Assistant Trigger (Accessible anywhere) */}
      <button
        type="button"
        className="floating-voice-ai-btn"
        onClick={() => setIsVoiceModalOpen(true)}
        aria-label="Open Voice AI Assistant"
        title="Voice AI Assistant"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1050,
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: '#6366f1',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: '24px' }}>🎙️</span>
      </button>

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
