import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Chip } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PublicIcon from '@mui/icons-material/Public';
import TimezoneSelectorModal from './TimezoneSelectorModal';
import { useTimezone } from '../context/TimezoneContext';
import { getTimezoneOffsetLabel } from '../utils/dateUtils';

export default function Header() {
  const [modalOpen, setModalOpen] = useState(false);
  const { activeTimezone, isOverridden } = useTimezone();

  const offsetLabel = getTimezoneOffsetLabel(activeTimezone);

  return (
    <>
      <AppBar position="sticky" elevation={1} sx={{ backgroundColor: '#0f172a' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EventIcon sx={{ color: '#38bdf8', fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
                Tier 2-4 Local Events
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                Community Engagement & Discovery Portal
              </Typography>
            </Box>
          </Box>

          <Button
            onClick={() => setModalOpen(true)}
            sx={{
              backgroundColor: isOverridden ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
              border: `1px solid ${isOverridden ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
              borderRadius: 2,
              px: 2,
              py: 0.8,
              color: isOverridden ? '#fbbf24' : '#38bdf8',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: isOverridden ? 'rgba(245, 158, 11, 0.25)' : 'rgba(56, 189, 248, 0.25)'
              }
            }}
            startIcon={<PublicIcon />}
          >
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="caption" sx={{ display: 'block', lineHeight: 1, fontSize: '0.65rem', color: '#94a3b8' }}>
                Active Timezone {isOverridden ? '(Override)' : '(Detected)'}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {activeTimezone} • {offsetLabel}
              </Typography>
            </Box>
          </Button>
        </Toolbar>
      </AppBar>

      <TimezoneSelectorModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
