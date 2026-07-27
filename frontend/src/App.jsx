import React, { useState } from 'react';
import I18nProvider from './components/I18nProvider';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import EventList from './components/EventList';
import OrganizerCheckIn from './components/OrganizerCheckIn';
import EventRegistrationForm from './components/EventRegistrationForm';
import FallbackTestDemo from './components/FallbackTestDemo';
import Footer from './components/Footer';
import './App.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'checkin' | 'fallbackDemo'
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
    setActiveTab('events');
    const el = document.getElementById('events');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-layout">
      {/* Global Header with Brand & Language Selector */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRegisterModal={() => handleOpenRegisterModal()}
      />

      {/* Main View Area */}
      <main className="main-content">
        {activeTab === 'events' && (
          <>
            <HeroSection
              onExplore={handleExploreClick}
              onRegister={() => handleOpenRegisterModal()}
            />

            <EventList
              onRegisterEvent={(evt) => handleOpenRegisterModal(evt)}
              onSelectEvent={(evt) => handleOpenRegisterModal(evt)}
            />
          </>
        )}

        {activeTab === 'checkin' && (
          <OrganizerCheckIn
            onSelectEventForRegister={(evt) => handleOpenRegisterModal(evt)}
          />
        )}

        {activeTab === 'fallbackDemo' && <FallbackTestDemo />}
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
