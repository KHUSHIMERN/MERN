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
import FallbackTestDemo from './components/FallbackTestDemo';
import Footer from './components/Footer';
import Typeahead from './components/Typeahead';
import { Globe } from 'lucide-react';
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
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);

  // Search & Typeahead Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  // Typeahead Suggestion Handlers
  const handleSelectSuggestion = (suggestion) => {
    if (suggestion.type === 'title') {
      setSearchQuery(suggestion.text);
      setActiveTagFilter(null);
      if (suggestion.eventId) {
        handleOpenRegisterModal({ _id: suggestion.eventId, id: suggestion.eventId, title: suggestion.text });
      }
    } else if (suggestion.type === 'tag') {
      setActiveTagFilter(suggestion.text.toLowerCase());
      setSearchQuery(suggestion.text);
    }
  };

  const handleSearchSubmit = (term) => {
    setSearchQuery(term);
    if (!term) {
      setActiveTagFilter(null);
    }
  };

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
                  onRegister={() => handleOpenRegisterModal()}
                />

                {/* AI Recommendations — shown above the events list, visible to all users.
                    Authenticated users get personalised results; guests get popular local events. */}
                <AIRecommendationSection
                  refreshSignal={eventsRefreshKey}
                  onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
                  onRSVP={(evt) => handleOpenRegisterModal(evt)}
                />

                {/* Typeahead Search Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', margin: '1.5rem 0 1rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '320px', maxWidth: '700px' }}>
                    <Typeahead
                      apiBaseUrl="/api"
                      placeholder="Search events by title or tags (e.g. react, design)..."
                      debounceMs={200}
                      language={preferredLanguage}
                      onSelect={handleSelectSuggestion}
                      onSearch={handleSearchSubmit}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Prioritize suggestions in your preferred language">
                      <Globe size={16} color="var(--text-secondary, #94a3b8)" />
                      <select
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        aria-label="Filter language preference"
                        style={{
                          background: 'rgba(18, 16, 32, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '10px 10px',
                          color: '#f3f4f6',
                          fontSize: '0.85rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="en" style={{ background: '#121020' }}>EN</option>
                        <option value="hi" style={{ background: '#121020' }}>HI</option>
                        <option value="es" style={{ background: '#121020' }}>ES</option>
                        <option value="fr" style={{ background: '#121020' }}>FR</option>
                        <option value="de" style={{ background: '#121020' }}>DE</option>
                      </select>
                    </div>
                  </div>
                  {(searchQuery || activeTagFilter) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)' }}>
                      <span>Active filter: <strong style={{ color: '#a78bfa' }}>{searchQuery || activeTagFilter}</strong></span>
                      <button
                        onClick={() => { setSearchQuery(''); setActiveTagFilter(null); }}
                        style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#f3f4f6', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
                      >
                        Clear filter
                      </button>
                    </div>
                  )}
                </div>

                <EventList
                  refreshKey={eventsRefreshKey}
                  onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
                  onRequireLogin={() => setView('login')}
                  searchFilter={searchQuery}
                />
              </>
            )}

            {activeTab === 'checkin' && (
              <OrganizerCheckIn />
            )}

            {activeTab === 'organizer-dashboard' && (
              <OrganizerDashboard
                onNavigateHome={() => setActiveTab('events')}
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
