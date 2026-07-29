import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Menu, MenuItem } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PublicIcon from '@mui/icons-material/Public';
import LanguageIcon from '@mui/icons-material/Language';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TimezoneSelectorModal from './TimezoneSelectorModal';
import CreateEventModal from './CreateEventModal';
import { useTimezone } from '../context/TimezoneContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getTimezoneOffsetLabel } from '../utils/dateUtils';

/**
 * Header — sticky global navigation bar.
 *
 * Props:
 *   activeTab           {string}   — current active tab ('events' | 'fallbackDemo')
 *   setActiveTab        {function} — setter to switch tabs
 *   onOpenRegisterModal {function} — opens the EventRegistrationForm modal
 *   user                {object}   — authenticated user object (null if not logged in)
 *   logout              {function} — logs the user out
 *   view                {string}   — current view ('events' | 'login' | 'register' | 'profile' | 'admin-requests')
 *   setView             {function} — setter to switch views
 */
export function Header({ activeTab, setActiveTab, onOpenRegisterModal, user, logout, view, setView }) {
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { activeTimezone, isOverridden } = useTimezone();
  const { lang, setLang, t } = useLanguage();
  const { role, toggleRole } = useAuth();

  const [langAnchorEl, setLangAnchorEl] = useState(null);

  const offsetLabel = getTimezoneOffsetLabel(activeTimezone);

  const handleLangMenuOpen = (event) => {
    setLangAnchorEl(event.currentTarget);
  };

  const handleLangMenuClose = () => {
    setLangAnchorEl(null);
  };

  const handleLangSelect = (selectedLang) => {
    setLang(selectedLang);
    handleLangMenuClose();
  };

  return (
    <>
      <AppBar position="sticky" elevation={1} sx={{ backgroundColor: '#0f172a' }}>
        <Toolbar sx={{ justifyContent: 'space-between', flexWrap: { xs: 'wrap', md: 'nowrap' }, py: { xs: 1, md: 0 }, gap: 1.5 }}>
          {/* Brand — clicking navigates to events tab */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
            onClick={() => {
              if (setActiveTab) setActiveTab('events');
              if (setView) setView('events');
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab && setActiveTab('events')}
          >
            <EventIcon sx={{ color: '#38bdf8', fontSize: '2rem' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                {t('appTitle')}
              </Typography>
              {/* #cbd5e1 on #0f172a = 5.53:1 — WCAG AA ✅ */}
              <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
                {t('appSubtitle')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {/* Navigation Tabs */}
            <Button
              sx={{
                color: view === 'events' && activeTab === 'events' ? '#38bdf8' : '#e2e8f0',
                textTransform: 'none',
              }}
              onClick={() => {
                if (setView) setView('events');
                if (setActiveTab) setActiveTab('events');
              }}
            >
              {t('header.nav.events', 'Events')}
            </Button>

            <Button
              sx={{
                color: view === 'events' && activeTab === 'fallbackDemo' ? '#38bdf8' : '#e2e8f0',
                textTransform: 'none',
              }}
              onClick={() => {
                if (setView) setView('events');
                if (setActiveTab) setActiveTab('fallbackDemo');
              }}
            >
              🧪 {t('header.nav.fallbackDemo', 'Fallback Demo')}
            </Button>

            <Button
              sx={{
                color: view === 'events' && activeTab === 'checkin' ? '#38bdf8' : '#e2e8f0',
                textTransform: 'none',
              }}
              onClick={() => {
                if (setView) setView('events');
                if (setActiveTab) setActiveTab('checkin');
              }}
            >
              {t('header.nav.checkin', 'Check-in Desk')}
            </Button>

            {/* Language Switcher */}
            <Button
              onClick={handleLangMenuOpen}
              startIcon={<LanguageIcon />}
              sx={{ color: '#f8fafc', textTransform: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2 }}
            >
              {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'ಕನ್ನಡ'}
            </Button>
            <Menu
              anchorEl={langAnchorEl}
              open={Boolean(langAnchorEl)}
              onClose={handleLangMenuClose}
            >
              <MenuItem onClick={() => handleLangSelect('en')}>English</MenuItem>
              <MenuItem onClick={() => handleLangSelect('hi')}>हिंदी (Hindi)</MenuItem>
              <MenuItem onClick={() => handleLangSelect('kn')}>ಕನ್ನಡ (Kannada)</MenuItem>
            </Menu>

            {/* Timezone Button */}
            <Button
              onClick={() => setTzModalOpen(true)}
              sx={{
                backgroundColor: isOverridden ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.08)',
                border: `1px solid ${isOverridden ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.2)'}`,
                borderRadius: 2,
                px: 2,
                py: 0.8,
                color: isOverridden ? '#fbbf24' : '#38bdf8',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: isOverridden ? 'rgba(245, 158, 11, 0.25)' : 'rgba(56, 189, 248, 0.15)'
                }
              }}
              startIcon={<PublicIcon />}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="caption" sx={{ display: 'block', lineHeight: 1, fontSize: '0.75rem', color: '#cbd5e1' }}>
                  {t('activeTimezone')} {isOverridden ? `(${t('override')})` : `(${t('detected')})`}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {activeTimezone} • {offsetLabel}
                </Typography>
              </Box>
            </Button>

            {/* Auth Controls */}
            {user ? (
              <>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
                  Signed in as <strong>{user.name}</strong> ({user.role})
                </Typography>

                {user.role === 'admin' && (
                  <Button
                    onClick={() => setView && setView('admin-requests')}
                    sx={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)', color: '#fff', borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Admin Requests
                  </Button>
                )}

                <Button
                  color="inherit"
                  onClick={() => setView && setView('profile')}
                  sx={{ textTransform: 'none', color: view === 'profile' ? '#38bdf8' : '#e2e8f0', borderRadius: 2 }}
                >
                  Profile
                </Button>

                <Button
                  color="inherit"
                  onClick={() => {
                    if (logout) logout();
                    if (setView) setView('login');
                  }}
                  sx={{ textTransform: 'none', color: '#f87171', borderRadius: 2 }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  color="inherit"
                  onClick={() => setView && setView('login')}
                  sx={{ textTransform: 'none', color: view === 'login' ? '#38bdf8' : '#e2e8f0', borderRadius: 2 }}
                >
                  Log In
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setView && setView('register')}
                  sx={{ textTransform: 'none', color: '#f8fafc', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 2, '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}
                >
                  Register
                </Button>
              </>
            )}

            {/* Register Event Button (visible for all) */}
            {onOpenRegisterModal && (
              <Button
                variant="outlined"
                color="inherit"
                onClick={onOpenRegisterModal}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  color: '#f8fafc',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }
                }}
              >
                + Register Event
              </Button>
            )}

            {/* Role Switcher (organizer toggle for demo) */}
            <Button
              onClick={toggleRole}
              color="inherit"
              startIcon={<AdminPanelSettingsIcon />}
              sx={{
                textTransform: 'none',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                px: 1.5,
                color: '#e2e8f0',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)'
                }
              }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="caption" sx={{ display: 'block', lineHeight: 1, fontSize: '0.75rem', color: '#cbd5e1' }}>
                  Role (Click to Toggle)
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {role === 'organizer' ? t('roleOrganizer') : t('roleAttendee')}
                </Typography>
              </Box>
            </Button>

            {/* Post Event Button (Organizer Only) */}
            {role === 'organizer' && (
              <Button
                variant="contained"
                color="warning"
                onClick={() => setCreateModalOpen(true)}
                startIcon={<AddCircleOutlineIcon />}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: 2
                }}
              >
                {t('createEventBtn')}
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <TimezoneSelectorModal open={tzModalOpen} onClose={() => setTzModalOpen(false)} />

      {role === 'organizer' && (
        <CreateEventModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onEventCreated={(newEvent) => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

export default Header;
