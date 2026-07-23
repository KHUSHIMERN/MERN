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
  Alert,
  Snackbar
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { formatEventDateTime } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

export default function RSVPModal({ event, activeTimezone, userLocale, open, onClose }) {
  const { t, lang } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  if (!event) return null;

  const { fullDateTime, timezoneLabel } = formatEventDateTime(
    event.startDate,
    event.timezone,
    activeTimezone,
    userLocale
  );

  const displayTitle = lang === 'hi' && event.title_hi ? event.title_hi : event.title;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && email) {
      setConfirmed(true);
    }
  };

  const handleCloseAll = () => {
    setConfirmed(false);
    setName('');
    setEmail('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCloseAll} maxWidth="xs" fullWidth paperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>{t('rsvpConfirmation')}</DialogTitle>
      
      <DialogContent dividers>
        {confirmed ? (
          <Box sx={{ textAlign: 'center', py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: '3.75rem' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t('rsvpSuccessTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('confirmationEmailSent')} (<strong>{displayTitle}</strong>).
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', width: '100%', mt: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534' }}>
                Event Time ({timezoneLabel}):
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803d' }}>
                {fullDateTime}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {displayTitle}
              </Typography>
              <Typography variant="caption" color="primary" sx={{ fontWeight: 700, display: 'block' }}>
                {fullDateTime} ({timezoneLabel})
              </Typography>
            </Box>

            <TextField
              label={t('fullName')}
              required
              fullWidth
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label={t('emailAddress')}
              type="email"
              required
              fullWidth
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
            <Button variant="contained" onClick={handleSubmit} disabled={!name || !email}>
              {t('confirmRsvp')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
