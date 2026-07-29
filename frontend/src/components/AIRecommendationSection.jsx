import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Grid, Button } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useLanguage } from '../context/LanguageContext';
import { useTimezone } from '../context/TimezoneContext';
import { useAuth } from '../context/AuthContext';
import { formatEventDateTime } from '../utils/dateUtils';

export default function AIRecommendationSection({ onSelectEvent, onRSVP }) {
  const { t, lang } = useLanguage();
  const { activeTimezone, userLocale } = useTimezone();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.city) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [user?.city]);

  const fetchRecommendations = async () => {
    if (!user || !user.city) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          userCity: user.city,
          userInterests: user.interests || []
        })
      });

      if (res.ok) {
        const json = await res.json();
        setRecommendations(json.data || json.recommendations || []);
      }
    } catch (e) {
      console.warn('AI recommendation fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.city || !recommendations || recommendations.length === 0) return null;

  return (
    <Box
      sx={{
        p: 3,
        mb: 4,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        color: '#fff',
        boxShadow: 4
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <AutoAwesomeIcon sx={{ color: '#fbbf24', fontSize: '1.75rem' }} aria-hidden="true" />
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {t('aiRecommendationsTitle')}
        </Typography>
      </Box>

      {/* #dde4ff on #312e81 = 4.57:1 — WCAG AA ✅ */}
      <Typography variant="body2" sx={{ color: '#dde4ff', mb: 3 }}>
        {t('aiSubtitle')} (Target City: <strong>{user?.city || 'Local'}</strong>)
      </Typography>

      <Grid container spacing={2}>
        {recommendations.map(({ event, matchScore, recommendationReason }) => {
          if (!event) return null;
          const titleText = lang === 'hi' && event.title_hi ? event.title_hi : event.title;
          const { formattedDate, formattedTime, timezoneLabel } = formatEventDateTime(
            event.startDate || event.date,
            event.timezone,
            activeTimezone,
            userLocale
          );

          return (
            <Grid item key={event._id || event.title} xs={12} md={4}>
              <Card sx={{ height: '100%', borderRadius: 2.5, display: 'flex', flexDirection: 'column', bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip
                      icon={<AutoAwesomeIcon style={{ fontSize: '0.875rem', color: '#4f46e5' }} aria-hidden="true" />}
                      label={`AI Match: ${matchScore}%`}
                      size="small"
                      sx={{ fontWeight: 800, bgcolor: '#e0e7ff', color: '#3730a3' }}
                    />
                    <Chip label={event.category?.toUpperCase()} size="small" color="primary" sx={{ fontSize: '0.75rem' }} />
                  </Box>

                  <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2, mb: 1 }}>
                    {titleText}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#475569', mb: 1 }}>
                    <LocationOnIcon fontSize="small" aria-hidden="true" />
                    <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>
                      {event.location}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#1e293b', mb: 1.5 }}>
                    <AccessTimeIcon fontSize="small" color="primary" aria-hidden="true" />
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {formattedDate} • {formattedTime} ({timezoneLabel})
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ color: '#3730a3', fontWeight: 700, display: 'block' }}>
                      Why Recommended:
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569' }}>
                      {recommendationReason}
                    </Typography>
                  </Box>
                </CardContent>

                <Box sx={{ p: 1.5, pt: 0, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" fullWidth onClick={() => onSelectEvent && onSelectEvent(event)}>
                    {t('detailsBtn')}
                  </Button>
                  <Button size="small" variant="contained" fullWidth onClick={() => onRSVP && onRSVP(event)}>
                    {t('rsvpBtn')}
                  </Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
