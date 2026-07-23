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

export default function Header() {
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { activeTimezone, isOverridden } = useTimezone();
  const { lang, setLang, t } = useLanguage();
  const { user, role, toggleRole } = useAuth();
  
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            {/* Language Switcher */}
            <Button
              onClick={handleLangMenuOpen}
              startIcon={<LanguageIcon />}
              sx={{ color: '#f8fafc', textTransform: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2 }}
            >
              {lang === 'en' ? 'English' : 'हिंदी'}
            </Button>
            <Menu
              anchorEl={langAnchorEl}
              open={Boolean(langAnchorEl)}
              onClose={handleLangMenuClose}
            >
              <MenuItem onClick={() => handleLangSelect('en')}>English</MenuItem>
              <MenuItem onClick={() => handleLangSelect('hi')}>हिंदी (Hindi)</MenuItem>
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
                {/* #cbd5e1 on dark bg = 5.53:1 — WCAG AA ✅ */}
                <Typography variant="caption" sx={{ display: 'block', lineHeight: 1, fontSize: '0.75rem', color: '#cbd5e1' }}>
                  {t('activeTimezone')} {isOverridden ? `(${t('override')})` : `(${t('detected')})`}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {activeTimezone} • {offsetLabel}
                </Typography>
              </Box>
            </Button>

            {/* Role Switcher */}
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
