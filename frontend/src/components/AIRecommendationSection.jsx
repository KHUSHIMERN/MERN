import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Grid,
  Button, Skeleton, Alert,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useLanguage } from '../context/LanguageContext';
import { useTimezone } from '../context/TimezoneContext';
import { useAuth } from '../context/AuthContext';
import { formatEventDateTime } from '../utils/dateUtils';
import { fetchRecommendations, recordInteraction } from '../utils/recommendationApi';

// ─── Source badge label ────────────────────────────────────────────────────
function sourceBadge(source) {
  if (source === 'ai-embedding') return '✨ AI-Personalized for You';
  if (source === 'popularity-locality') return '📍 Popular in Your City';
  return '🎯 Recommended Events';
}

// ─── Skeleton placeholder while loading ───────────────────────────────────
function RecSkeleton() {
  return (
    <Grid container spacing={2}>
      {[0, 1, 2].map((i) => (
        <Grid item key={i} xs={12} md={4}>
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.07)' }} />
        </Grid>
      ))}
    </Grid>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
/**
 * AIRecommendationSection
 * Renders a visually prominent recommendation banner above the events list.
 *
 * Props:
 *  - onSelectEvent(event) — opens the event detail modal
 *  - onRSVP(event)        — triggers the RSVP flow
 *  - refreshSignal        — increment this number to trigger a re-fetch
 *                           (pass it from parent after an RSVP action)
 */
export default function AIRecommendationSection({ onSelectEvent, onRSVP, refreshSignal = 0 }) {
  const { t, lang } = useLanguage();
  const { activeTimezone, userLocale } = useTimezone();
  const { user } = useAuth();

  const [recommendations, setRecommendations] = useState([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Derive user context from profile
  const userCity = user?.city || '';
  const userLang = user?.preferredLanguage || user?.language || lang || 'en';

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRecommendations({
        city: userCity,
        language: userLang,
        limit: 4,
      });
      setRecommendations(data.recommendations || []);
      setSource(data.source || '');
    } catch (err) {
      console.warn('[AIRecommendationSection] fetch error:', err?.message);
      setError('Could not load recommendations right now.');
    } finally {
      setLoading(false);
    }
  }, [userCity, userLang]);

  // Re-fetch when user logs in/out, changes city, or parent signals refresh
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations, refreshSignal]);

  // Track that the user viewed this section (fires once per mount when authenticated)
  useEffect(() => {
    if (user?._id) {
      recordInteraction({
        userId: user._id,
        interactionType: 'view',
        city: userCity,
        language: userLang,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const handleViewDetails = (event) => {
    // Record click interaction
    if (user?._id) {
      recordInteraction({
        userId: user._id,
        eventId: event._id,
        interactionType: 'click',
        category: event.category || '',
        city: event.city || userCity,
        language: event.language || userLang,
      });
    }
    onSelectEvent?.(event);
  };

  const handleRSVP = (event) => {
    // Record RSVP interaction
    if (user?._id) {
      recordInteraction({
        userId: user._id,
        eventId: event._id,
        interactionType: 'rsvp',
        category: event.category || '',
        city: event.city || userCity,
        language: event.language || userLang,
        metadata: { source: 'ai-recommendation-section' },
      });
    }
    onRSVP?.(event);
  };

  // Don't render if no results and not loading
  if (!loading && !error && recommendations.length === 0) return null;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        mb: 4,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        color: '#fff',
        boxShadow: 4,
      }}
    >
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AutoAwesomeIcon sx={{ color: '#fbbf24', fontSize: '1.75rem' }} aria-hidden="true" />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {t('aiRecommendationsTitle', 'AI Recommendations')}
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadRecommendations}
          disabled={loading}
          sx={{ color: '#dde4ff', textTransform: 'none', fontSize: '0.75rem' }}
          aria-label="Refresh recommendations"
        >
          Refresh
        </Button>
      </Box>

      {/* Subtitle */}
      <Typography variant="body2" sx={{ color: '#dde4ff', mb: 2 }}>
        {source ? sourceBadge(source) : t('aiSubtitle', 'Personalized to your interests')}
        {userCity ? <> · <strong>{userCity}</strong></> : null}
      </Typography>

      {/* Error state */}
      {error && (
        <Alert severity="warning" sx={{ mb: 2, bgcolor: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
          {error}
        </Alert>
      )}

      {/* Loading skeletons */}
      {loading && <RecSkeleton />}

      {/* Recommendation cards */}
      {!loading && !error && (
        <Grid container spacing={2}>
          {recommendations.map(({ event, matchScore, reason, similarityScore }) => {
            if (!event) return null;
            const titleText = lang === 'hi' && event.title_hi ? event.title_hi : event.title;
            const locationText =
              typeof event.location === 'object' && event.location !== null
                ? event.location.placeName || 'Online'
                : event.location || 'Online';

            const { formattedDate, formattedTime, timezoneLabel } = formatEventDateTime(
              event.startDate || event.date,
              event.timezone,
              activeTimezone,
              userLocale,
            );

            return (
              <Grid item key={event._id || event.title} xs={12} md={4}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 8 },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    {/* Match score + category chips */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip
                        icon={<AutoAwesomeIcon style={{ fontSize: '0.875rem', color: '#4f46e5' }} aria-hidden="true" />}
                        label={`${matchScore}% Match`}
                        size="small"
                        sx={{ fontWeight: 800, bgcolor: '#e0e7ff', color: '#3730a3' }}
                      />
                      {event.category && (
                        <Chip
                          label={event.category.toUpperCase()}
                          size="small"
                          color="primary"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>

                    {/* Event title */}
                    <Typography
                      variant="subtitle1"
                      component="h2"
                      sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.25, mb: 1 }}
                    >
                      {titleText}
                    </Typography>

                    {/* Location */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#475569', mb: 0.75 }}>
                      <LocationOnIcon fontSize="small" aria-hidden="true" />
                      <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>
                        {locationText}
                        {event.city ? ` · ${event.city}` : ''}
                      </Typography>
                    </Box>

                    {/* Date/time */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#1e293b', mb: 1.5 }}>
                      <AccessTimeIcon fontSize="small" color="primary" aria-hidden="true" />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {formattedDate} · {formattedTime}
                        {timezoneLabel ? ` (${timezoneLabel})` : ''}
                      </Typography>
                    </Box>

                    {/* Why recommended */}
                    <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                      <Typography variant="caption" sx={{ color: '#3730a3', fontWeight: 700, display: 'block' }}>
                        Why Recommended:
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#475569' }}>
                        {reason || 'Personalized match based on your activity'}
                      </Typography>
                    </Box>
                  </CardContent>

                  {/* Action buttons */}
                  <Box sx={{ p: 1.5, pt: 0, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      onClick={() => handleViewDetails(event)}
                    >
                      {t('detailsBtn', 'Details')}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      fullWidth
                      onClick={() => handleRSVP(event)}
                    >
                      {t('rsvpBtn', 'RSVP')}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
