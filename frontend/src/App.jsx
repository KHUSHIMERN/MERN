import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import RegisterForm from './components/RegisterForm';
import LoginForm from './components/LoginForm';
import ProfilePage from './components/ProfilePage';
import AdminRoleRequests from './components/AdminRoleRequests';
import I18nProvider from './components/I18nProvider';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import EventList from './components/EventList';
import EventRegistrationForm from './components/EventRegistrationForm';
import FallbackTestDemo from './components/FallbackTestDemo';
import Footer from './components/Footer';
import './App.css';

function AppContent() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('events'); // 'events' | 'register' | 'login' | 'profile' | 'admin-requests'
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'fallbackDemo'
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedEventForModal, setSelectedEventForModal] = useState(null);

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

  return (
    <div className="app-layout">
      {/* Global Header with Brand, Auth & Language Controls */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRegisterModal={() => handleOpenRegisterModal()}
        user={user}
        logout={logout}
        view={view}
        setView={setView}
      />

      {/* Main View Area */}
      <main className="main-content">
        {view === 'register' && (
          <div className="auth-container-wrapper">
            <RegisterForm onSwitchToLogin={() => setView('login')} />
          </div>
        )}

        {view === 'login' && (
          <div className="auth-container-wrapper">
            <LoginForm onSwitchToRegister={() => setView('register')} />
          </div>
        )}

        {view === 'profile' && (
          <ProfilePage onNavigateHome={() => setView(user ? 'profile' : 'login')} />
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
                onRegisterEvent={(evt) => handleOpenRegisterModal(evt)}
                onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
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
      <AppContent />
    </I18nProvider>
  );
}

export default App;
