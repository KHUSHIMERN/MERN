import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PublicIcon from '@mui/icons-material/Public';
import PeopleIcon from '@mui/icons-material/People';
import { formatEventDateTime, getTimezoneOffsetLabel } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

export default function EventDetail({ event, activeTimezone, userLocale, open, onClose, onRSVP }) {
  const { t, lang } = useLanguage();
  if (!event) return null;

  const startFormatted = formatEventDateTime(event.startDate, event.timezone, activeTimezone, userLocale);
  const endFormatted = event.endDate
    ? formatEventDateTime(event.endDate, event.timezone, activeTimezone, userLocale)
    : null;

  const originTzLabel = getTimezoneOffsetLabel(event.timezone, new Date(event.startDate));

  const displayTitle = lang === 'hi' && event.title_hi ? event.title_hi : event.title;
  const displayDescription = lang === 'hi' && event.description_hi ? event.description_hi : event.description;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth paperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        {displayTitle}
        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
          <Chip label={t(event.category || 'general')} color="primary" size="small" sx={{ fontWeight: 700 }} />
          {startFormatted.isCrossTimezone && (
            <Chip label={t('convertedTimeLabel')} color="info" size="small" variant="outlined" />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {displayDescription}
          </Typography>

          <Divider />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LocationOnIcon color="primary" />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('locationLabel')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {event.location}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AccessTimeIcon color="primary" />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Date & Time
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                {startFormatted.fullDateTime}
                {endFormatted ? ` — ${endFormatted.formattedTime}` : ''}
              </Typography>
              {/* #0369a1 on white = 4.53:1 — WCAG AA ✅ (was #0288d1 = 3.03:1 ❌) */}
              <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700 }}>
                {startFormatted.timezoneLabel}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PublicIcon color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('originTzLabel')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {event.timezone} ({originTzLabel})
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PeopleIcon color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('organizerLabel')} & {t('capacity')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {event.organizer} • {event.attendeesCount} / {event.capacity} {t('registeredCount')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          {t('close')}
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            onClose();
            onRSVP(event);
          }}
          sx={{ borderRadius: 2 }}
        >
          {t('rsvpBtn')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
