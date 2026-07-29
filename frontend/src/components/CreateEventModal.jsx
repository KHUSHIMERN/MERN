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
  Alert,
  Typography
} from '@mui/material';
import { useLanguage } from '../context/LanguageContext';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

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
    capacity: 100,
    imageUrl: '',
    imageUrlAlt: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Task 4: track whether a submit attempt was made for inline field-level error display
  const [submitted, setSubmitted] = useState(false);

  // Compute which required fields are missing (only shown after first submit attempt)
  const requiredFields = [
    { key: 'title',     label: t('createTitleLabel') },
    { key: 'description', label: t('createDescLabel') },
    { key: 'city',      label: t('createCityLabel') },
    { key: 'location',  label: t('createLocationLabel') },
    { key: 'startDate', label: t('createStartDateLabel') },
    { key: 'organizer', label: t('organizerLabel') },
    { key: 'capacity',  label: t('createCapacityLabel') }
  ];
  const fieldErrors = submitted
    ? Object.fromEntries(requiredFields.map(f => [f.key, !formData[f.key] ? t('fieldRequired') : '']))
    : {};

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    // Client-side gate: check all required fields before hitting API
    const hasClientErrors = requiredFields.some(f => !formData[f.key]);
    if (hasClientErrors) {
      setError(t('validationErrorSummary'));
      return;
    }
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
        {/* WCAG 1.4.1: Error summary with ErrorOutlineIcon + text — not red color alone */}
          {error && (
            <Alert
              icon={<ErrorOutlineIcon fontSize="inherit" aria-hidden="true" />}
              severity="error"
              role="alert"
              aria-live="assertive"
              sx={{ mb: 2, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          {/* WCAG 1.4.1: Required fields note with InfoIcon + text — not asterisk color alone */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5, color: '#374151' }}>
            <InfoOutlinedIcon fontSize="small" aria-hidden="true" />
            {/* #374151 on white = 7.23:1 — WCAG AA ✅ */}
            <Typography variant="caption" sx={{ color: '#374151', fontWeight: 600 }}>
              {t('requiredFieldsNote')}
            </Typography>
          </Box>

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
                error={Boolean(fieldErrors.title)}
                helperText={
                  fieldErrors.title ? (
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ErrorOutlineIcon sx={{ fontSize: '0.875rem', color: '#991b1b' }} aria-hidden="true" />
                      <span>{fieldErrors.title}</span>
                    </Box>
                  ) : ''
                }
                inputProps={{ 'aria-required': 'true' }}
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
                error={Boolean(fieldErrors.description)}
                helperText={
                  fieldErrors.description ? (
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ErrorOutlineIcon sx={{ fontSize: '0.875rem', color: '#991b1b' }} aria-hidden="true" />
                      <span>{fieldErrors.description}</span>
                    </Box>
                  ) : ''
                }
                inputProps={{ 'aria-required': 'true' }}
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
                error={Boolean(fieldErrors.city)}
                helperText={
                  fieldErrors.city ? (
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ErrorOutlineIcon sx={{ fontSize: '0.875rem', color: '#991b1b' }} aria-hidden="true" />
                      <span>{fieldErrors.city}</span>
                    </Box>
                  ) : ''
                }
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
                error={Boolean(fieldErrors.location)}
                helperText={
                  fieldErrors.location ? (
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ErrorOutlineIcon sx={{ fontSize: '0.875rem', color: '#991b1b' }} aria-hidden="true" />
                      <span>{fieldErrors.location}</span>
                    </Box>
                  ) : ''
                }
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

            {/* Event Image URL & Alt Text (WCAG 1.1.1 Accessibility requirement) */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Event Image URL"
                name="imageUrl"
                placeholder="https://example.com/banner.jpg"
                fullWidth
                size="small"
                value={formData.imageUrl}
                onChange={handleChange}
                helperText="Direct URL for the event banner/poster image"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Image Alt Text / Description *"
                name="imageUrlAlt"
                placeholder="Describe key visual details in 1-2 sentences for screen readers"
                fullWidth
                size="small"
                required={Boolean(formData.imageUrl)}
                value={formData.imageUrlAlt}
                onChange={handleChange}
                helperText="WCAG 1.1.1: Describe what is visible in the image (avoid 'image of')"
              />
            </Grid>

            {/* Image & Alt Text Live Preview */}
            {formData.imageUrl && (
              <Grid item xs={12}>
                <Box sx={{ p: 1.5, border: '1px solid #cbd5e1', borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: '#334155' }}>
                    📷 Image Accessibility Preview
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box
                      component="img"
                      src={formData.imageUrl}
                      alt={formData.imageUrlAlt || 'Event image preview'}
                      sx={{ width: 120, height: 75, objectFit: 'cover', borderRadius: 1.5, border: '1px solid #e2e8f0' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
                        <strong>Active Alt Text:</strong> {formData.imageUrlAlt || '(No alt text provided yet)'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            )}
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
