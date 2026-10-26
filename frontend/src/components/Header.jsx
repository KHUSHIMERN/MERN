import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronDown, ClipboardCheck, LogOut, Menu, Plus, Shield, User, X } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import TimezoneSelectorModal from './TimezoneSelectorModal';
import NotificationPanel from './NotificationPanel';
import { useTimezone } from '../context/TimezoneContext';
import { useNotifications } from '../context/NotificationContext';
import { getTimezoneOffsetLabel } from '../utils/dateUtils';

export function Header({ activeTab, setActiveTab, onOpenRegisterModal, onOpenNotificationEvent, user, logout, view, setView }) {
  const { t } = useTranslation();
  const { activeTimezone } = useTimezone();
  const { unreadCount } = useNotifications();
  const [isTzModalOpen, setIsTzModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef(null);

  const canOrganize = user && ['organizer', 'admin'].includes(user.role);
  const city = activeTimezone.split('/')[1]?.replace('_', ' ') || activeTimezone;
  const offsetLabel = getTimezoneOffsetLabel(activeTimezone);

  useEffect(() => {
    const closeMenus = (event) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        setMobileOpen(false);
      }
      if (event.type === 'mousedown' && accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenus);
    document.addEventListener('keydown', closeMenus);
    return () => {
      document.removeEventListener('mousedown', closeMenus);
      document.removeEventListener('keydown', closeMenus);
    };
  }, []);

  const navigate = (nextView, nextTab) => {
    setView?.(nextView);
    if (nextTab) setActiveTab?.(nextTab);
    setMobileOpen(false);
    setAccountOpen(false);
  };

  const handleLogout = async () => {
    await logout?.();
    navigate('login');
  };

  return (
    <>
      <header className="global-header">
        <div className="header-container compact-header">
          <button type="button" className="header-brand" onClick={() => navigate('events', 'events')}>
            <span className="brand-logo-icon" aria-hidden="true">✨</span>
            <span className="brand-titles">
              <span className="brand-title">CommunityConnect</span>
              <span className="brand-subtitle">{t('header.subtitle', 'Community Hub')}</span>
            </span>
          </button>

          <nav className="header-nav desktop-primary-nav" aria-label="Primary navigation">
            <button type="button" className={`nav-link ${view === 'events' && activeTab === 'events' ? 'active' : ''}`} onClick={() => navigate('events', 'events')}>
              {t('header.nav.events', 'Events')}
            </button>
            {canOrganize && (
              <button type="button" className={`nav-link ${view === 'events' && activeTab === 'checkin' ? 'active' : ''}`} onClick={() => navigate('events', 'checkin')}>
                <ClipboardCheck size={17} /> {t('header.nav.checkin', 'Organizer Workspace')}
              </button>
            )}
          </nav>

          <div className="header-controls desktop-header-controls">
            {canOrganize && (
              <button type="button" className="nav-link nav-link-highlight create-event-header-btn" onClick={onOpenRegisterModal}>
                <Plus size={17} /> Create Event
              </button>
            )}
            <button type="button" className="timezone-pill-btn compact-timezone" onClick={() => setIsTzModalOpen(true)} title={`Timezone: ${activeTimezone} (${offsetLabel})`}>
              <span aria-hidden="true">🌐</span><span className="tz-city-name">{city}</span><span className="tz-offset-badge">{offsetLabel}</span>
            </button>
            <div className="header-language-desktop"><LanguageSelector id="desktop-language-select" /></div>

            {user ? (
              <>
                <button type="button" className="notification-bell" onClick={() => setNotificationsOpen((open) => !open)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={notificationsOpen}>
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </button>
                <div className="account-menu-wrapper" ref={accountRef}>
                  <button type="button" className="account-menu-trigger" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen} aria-haspopup="menu">
                    <span className="account-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                    <span className="account-trigger-copy"><strong>{user.name}</strong><small>{user.role}</small></span>
                    <ChevronDown size={16} />
                  </button>
                  {accountOpen && (
                    <div className="account-dropdown" role="menu">
                      <button type="button" role="menuitem" onClick={() => navigate('profile')}><User size={17} /> Profile & Settings</button>
                      {user.role === 'admin' && <button type="button" role="menuitem" onClick={() => navigate('admin-requests')}><Shield size={17} /> Admin Requests</button>}
                      <button type="button" role="menuitem" className="account-logout" onClick={handleLogout}><LogOut size={17} /> Logout</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button type="button" className={`nav-link auth-header-btn ${(view === 'login' || view === 'register') ? 'active' : ''}`} onClick={() => navigate('login')}>
                Log In / Register
              </button>
            )}
          </div>

          <div className="mobile-header-actions">
            {user && (
              <button type="button" className="notification-bell" onClick={() => setNotificationsOpen((open) => !open)} aria-label={`Notifications, ${unreadCount} unread`}>
                <Bell size={20} />{unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
            )}
            <button type="button" className="mobile-menu-toggle" onClick={() => setMobileOpen((open) => !open)} aria-label="Open navigation menu" aria-expanded={mobileOpen}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="mobile-navigation-drawer" aria-label="Mobile navigation">
            <button type="button" onClick={() => navigate('events', 'events')}>Events</button>
            {canOrganize && <button type="button" onClick={() => navigate('events', 'checkin')}>Organizer Workspace</button>}
            {canOrganize && <button type="button" onClick={() => { onOpenRegisterModal?.(); setMobileOpen(false); }}>Create Event</button>}
            {user ? (
              <>
                <button type="button" onClick={() => navigate('profile')}>Profile & Settings</button>
                {user.role === 'admin' && <button type="button" onClick={() => navigate('admin-requests')}>Admin Requests</button>}
              </>
            ) : <button type="button" onClick={() => navigate('login')}>Log In / Register</button>}
            <button type="button" onClick={() => setIsTzModalOpen(true)}>Timezone: {city} ({offsetLabel})</button>
            <div className="mobile-language-control"><LanguageSelector id="mobile-language-select" /></div>
            {user && <button type="button" className="mobile-logout" onClick={handleLogout}>Logout</button>}
          </nav>
        )}
      </header>

      <TimezoneSelectorModal open={isTzModalOpen} onClose={() => setIsTzModalOpen(false)} />
      {user && <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} onOpenEvent={onOpenNotificationEvent} />}
    </>
  );
}

export default Header;
