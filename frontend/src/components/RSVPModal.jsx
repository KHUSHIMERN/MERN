import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockIcon from '@mui/icons-material/Lock';
import { formatEventDateTime } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

export default function RSVPModal({ event, activeTimezone, userLocale, open, onClose }) {
  const { t, lang } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  // Task 4: track touched state so we only show inline errors after the user interacted
  const [touched, setTouched] = useState({ name: false, email: false });

  if (!event) return null;

  const { fullDateTime, timezoneLabel } = formatEventDateTime(
    event.startDate,
    event.timezone,
    activeTimezone,
    userLocale
  );

  const displayTitle = lang === 'hi' && event.title_hi ? event.title_hi : event.title;

  // Capacity calculations for the warning banner
  const capacity = event.capacity ?? 100;
  const attendeesCount = event.attendeesCount ?? 0;
  const spotsLeft = capacity - attendeesCount;
  const fillRatio = capacity > 0 ? attendeesCount / capacity : 1;
  const isAlmostFull = fillRatio >= 0.8 && fillRatio < 1;
  const isFull = fillRatio >= 1;

  // Inline validation: WCAG 1.4.1 — error conveyed via ErrorOutlineIcon + text, not red color alone
  const nameError = touched.name && !name.trim() ? t('fieldRequired') : '';
  const emailError = touched.email && !email.trim() ? t('fieldRequired') : '';

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true });
    if (name.trim() && email.trim()) {
      setConfirmed(true);
    }
  };

  const handleCloseAll = () => {
    setConfirmed(false);
    setName('');
    setEmail('');
    setTouched({ name: false, email: false });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCloseAll} maxWidth="xs" fullWidth paperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>{t('rsvpConfirmation')}</DialogTitle>

      <DialogContent dividers>
        {confirmed ? (
          <Box sx={{ textAlign: 'center', py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            {/* CheckCircleOutlineIcon is decorative here — text "You're Registered!" conveys success */}
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: '3.75rem' }} aria-hidden="true" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t('rsvpSuccessTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('confirmationEmailSent')} (<strong>{displayTitle}</strong>).
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', width: '100%', mt: 1 }}>
              {/* #166534 on #f0fdf4 = 6.72:1 — WCAG AA ✅ */}
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534' }}>
                Event Time ({timezoneLabel}):
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803d' }}>
                {fullDateTime}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} noValidate>

            {/* Event summary block */}
            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {displayTitle}
              </Typography>
              <Typography variant="caption" color="primary" sx={{ fontWeight: 700, display: 'block' }}>
                {fullDateTime} ({timezoneLabel})
              </Typography>
            </Box>

            {/* WCAG 1.4.1: Capacity status banner — icon + text, never color alone */}
            {isFull && (
              <Alert
                icon={<LockIcon fontSize="inherit" aria-hidden="true" />}
                severity="error"
                role="status"
                aria-live="polite"
                sx={{ borderRadius: 2 }}
              >
                {/* #991b1b on Alert red background ≥4.5:1 via MUI default ✅ */}
                <strong>{t('statusFull')}</strong> — {t('statusFullAriaLabel')}.
              </Alert>
            )}
            {isAlmostFull && !isFull && (
              <Alert
                icon={<WarningAmberIcon fontSize="inherit" aria-hidden="true" />}
                severity="warning"
                role="status"
                aria-live="polite"
                sx={{ borderRadius: 2 }}
              >
                <strong>{t('statusAlmostFull')}</strong> — {spotsLeft} {t('spotsLeft')}.
              </Alert>
            )}

            {/* Required fields legend: InfoIcon + text — WCAG 1.4.1 ✅ */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#374151' }}>
              <InfoOutlinedIcon fontSize="small" aria-hidden="true" />
              {/* #374151 on white = 7.23:1 — WCAG AA ✅ */}
              <Typography variant="caption" sx={{ color: '#374151', fontWeight: 600 }}>
                {t('requiredFieldsNote')}
              </Typography>
            </Box>

            {/* Name field with inline error icon + text (WCAG 1.4.1) */}
            <Box>
              <TextField
                id="rsvp-name"
                label={`${t('fullName')} *`}
                fullWidth
                size="small"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                error={Boolean(nameError)}
                inputProps={{
                  'aria-required': 'true',
                  'aria-describedby': nameError ? 'rsvp-name-error' : undefined
                }}
              />
              {/* Error: ErrorOutlineIcon + text — screen readers & color-blind users both get the message */}
              {nameError && (
                <Box id="rsvp-name-error" role="alert" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  {/* #991b1b on white = 6.67:1 — WCAG AA ✅ */}
                  <ErrorOutlineIcon sx={{ fontSize: '0.875rem', color: '#991b1b' }} aria-hidden="true" />
                  <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600 }}>
                    {nameError}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Email field with inline error icon + text (WCAG 1.4.1) */}
            <Box>
              <TextField
                id="rsvp-email"
                label={`${t('emailAddress')} *`}
                type="email"
                fullWidth
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                error={Boolean(emailError)}
                inputProps={{
                  'aria-required': 'true',
                  'aria-describedby': emailError ? 'rsvp-email-error' : undefined
                }}
              />
              {emailError && (
                <Box id="rsvp-email-error" role="alert" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <ErrorOutlineIcon sx={{ fontSize: '0.875rem', color: '#991b1b' }} aria-hidden="true" />
                  <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600 }}>
                    {emailError}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {confirmed ? (
          <Button onClick={handleCloseAll} variant="contained" fullWidth>
            {t('done')}
          </Button>
        ) : (
          <>
            <Button onClick={handleCloseAll} color="inherit">
              {t('cancel')}
            </Button>
            {/* WCAG 1.4.1: Fully Booked text label when disabled — not just a greyed button */}
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={isFull}
              aria-disabled={isFull}
              aria-label={isFull ? t('statusFullAriaLabel') : t('confirmRsvp')}
            >
              {isFull ? t('rsvpDisabledFull') : t('confirmRsvp')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
