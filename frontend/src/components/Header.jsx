import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Button, IconButton, Menu, MenuItem } from '@mui/material';
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
              <MenuItem onClick={() => handleLangSelect('hi')}>हिंदी</MenuItem>
              <MenuItem onClick={() => handleLangSelect('kn')}>ಕನ್ನಡ</MenuItem>
            </Menu>

            {/* Timezone Switcher */}
            <Button
              onClick={() => setTzModalOpen(true)}
              startIcon={<PublicIcon />}
              sx={{ color: '#f8fafc', textTransform: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2 }}
            >
              {isOverridden ? offsetLabel : t('header.timezone', 'Timezone')}
            </Button>

            {user ? (
              <>
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
                {/* #cbd5e1 on dark bg = 5.53:1 — WCAG AA ✅ */}
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
            // Trigger a page reload or notify event list to refresh
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

export default Header;
