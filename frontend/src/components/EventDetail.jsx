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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockIcon from '@mui/icons-material/Lock';
import { formatEventDateTime, getTimezoneOffsetLabel } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

/**
 * WCAG 1.4.1 — getCapacityStatus (mirrors EventCard implementation)
 * Icon + text label, never color alone.
 */
function getCapacityStatus(attendeesCount, capacity, t) {
  const spotsLeft = capacity - attendeesCount;
  const fillRatio = capacity > 0 ? attendeesCount / capacity : 1;
  if (fillRatio >= 1) {
    return {
      level: 'full',
      icon: <LockIcon sx={{ fontSize: '0.875rem' }} aria-hidden="true" />,
      label: t('statusFull'),
      ariaLabel: t('statusFullAriaLabel'),
      sx: { bgcolor: '#fef2f2', color: '#991b1b', borderColor: '#fecaca', fontWeight: 700 }
    };
  }
  if (fillRatio >= 0.8) {
    return {
      level: 'almostFull',
      icon: <WarningAmberIcon sx={{ fontSize: '0.875rem' }} aria-hidden="true" />,
      label: `${t('statusAlmostFull')} · ${spotsLeft} ${t('spotsLeft')}`,
      ariaLabel: t('statusAlmostFullAriaLabel'),
      sx: { bgcolor: '#fffbeb', color: '#92400e', borderColor: '#fde68a', fontWeight: 700 }
    };
  }
  return {
    level: 'open',
    icon: <CheckCircleIcon sx={{ fontSize: '0.875rem' }} aria-hidden="true" />,
    label: `${t('statusOpen')} · ${spotsLeft} ${t('spotsLeft')}`,
    ariaLabel: t('statusOpenAriaLabel'),
    sx: { bgcolor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', fontWeight: 700 }
  };
}

export default function EventDetail({ event, activeTimezone, userLocale, open, onClose, onRSVP }) {
  const { t, lang } = useLanguage();
  if (!event) return null;

  const capacityStatus = getCapacityStatus(event.attendeesCount ?? 0, event.capacity ?? 100, t);
  const isFull = capacityStatus.level === 'full';

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
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={t(event.category || 'general')} color="primary" size="small" sx={{ fontWeight: 700 }} />
          {/* WCAG 1.4.1: Capacity status — icon + text, not color alone */}
          <Chip
            icon={capacityStatus.icon}
            label={capacityStatus.label}
            size="small"
            variant="outlined"
            aria-label={capacityStatus.ariaLabel}
            sx={{ fontSize: '0.75rem', ...capacityStatus.sx }}
          />
          {startFormatted.isCrossTimezone && (
            <Chip label={t('convertedTimeLabel')} color="info" size="small" variant="outlined" />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {event.imageUrl && (
            <Box sx={{ borderRadius: 2, overflow: 'hidden', mb: 1 }}>
              <Box
                component="img"
                src={event.imageUrl}
                alt={event.imageUrlAlt || `${displayTitle} event banner`}
                sx={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }}
              />
              <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ color: '#475569', fontStyle: 'italic', display: 'block' }}>
                  <strong>Image Alt Text (Screen Reader Description):</strong> "{event.imageUrlAlt || `${displayTitle} banner`}"
                </Typography>
              </Box>
            </Box>
          )}

          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {displayDescription}
          </Typography>

          <Divider />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LocationOnIcon color="primary" aria-hidden="true" />
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
            <AccessTimeIcon color="primary" aria-hidden="true" />
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
            <PublicIcon color="action" aria-hidden="true" />
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
            <PeopleIcon color="action" aria-hidden="true" />
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
        {/* WCAG 1.4.1: Fully Booked text label — not just a greyed-out button */}
        <Button
          variant="contained"
          disabled={isFull}
          aria-disabled={isFull}
          aria-label={isFull ? t('statusFullAriaLabel') : t('rsvpBtn')}
          onClick={() => {
            if (!isFull) {
              onClose();
              onRSVP(event);
            }
          }}
          sx={{ borderRadius: 2 }}
        >
          {isFull ? t('rsvpDisabledFull') : t('rsvpBtn')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
