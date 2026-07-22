import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Box,
  Alert
} from '@mui/material';
import { useLanguage } from '../context/LanguageContext';

const IANA_TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'Europe/London',
  'Asia/Dubai',
  'Asia/Tokyo',
  'UTC'
];

export default function CreateEventModal({ open, onClose, onEventCreated }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    title_hi: '',
    description: '',
    description_hi: '',
    category: 'career',
    city: 'Jaipur',
    location: '',
    startDate: '',
    endDate: '',
    timezone: 'Asia/Kolkata',
    organizer: 'Local Skill Mission',
    capacity: 100
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        capacity: Number(formData.capacity)
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        onEventCreated(json.data);
        onClose();
      } else {
        const json = await res.json();
        setError(json.message || 'Failed to create event');
      }
    } catch (err) {
      setError(err.message || 'Error creating event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth paperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>{t('createModalTitle')}</DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('createTitleLabel')}
                name="title"
                required
                fullWidth
                size="small"
                value={formData.title}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('createTitleHiLabel')}
                name="title_hi"
                fullWidth
                size="small"
                value={formData.title_hi}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label={t('createDescLabel')}
                name="description"
                required
                multiline
                rows={3}
                fullWidth
                size="small"
                value={formData.description}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('createDescHiLabel')}
                name="description_hi"
                multiline
                rows={3}
                fullWidth
                size="small"
                value={formData.description_hi}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label={t('createCategoryLabel')}
                name="category"
                fullWidth
                size="small"
                value={formData.category}
                onChange={handleChange}
              >
                <MenuItem value="career">{t('career')}</MenuItem>
                <MenuItem value="health">{t('health')}</MenuItem>
                <MenuItem value="culture">{t('culture')}</MenuItem>
                <MenuItem value="workshop">{t('workshop')}</MenuItem>
                <MenuItem value="general">{t('general')}</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label={t('createCityLabel')}
                name="city"
                required
                fullWidth
                size="small"
                value={formData.city}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label={t('createLocationLabel')}
                name="location"
                required
                fullWidth
                size="small"
                value={formData.location}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label={t('createStartDateLabel')}
                name="startDate"
                type="datetime-local"
                required
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formData.startDate}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label={t('createEndDateLabel')}
                name="endDate"
                type="datetime-local"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formData.endDate}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label={t('createTimezoneLabel')}
                name="timezone"
                required
                fullWidth
                size="small"
                value={formData.timezone}
                onChange={handleChange}
              >
                {IANA_TIMEZONES.map(tz => (
                  <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label={t('organizerLabel')}
                name="organizer"
                required
                fullWidth
                size="small"
                value={formData.organizer}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label={t('createCapacityLabel')}
                name="capacity"
                type="number"
                required
                fullWidth
                size="small"
                value={formData.capacity}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit">{t('cancel')}</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {t('submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
