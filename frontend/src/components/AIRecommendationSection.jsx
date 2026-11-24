import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Grid,
  Button, Skeleton, Alert, Stack,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import InterestsIcon from '@mui/icons-material/Interests';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLanguage } from '../context/LanguageContext';
import { useTimezone } from '../context/TimezoneContext';
import { useAuth } from '../context/AuthContext';
import { formatEventDateTime } from '../utils/dateUtils';
import { fetchRecommendations, recordInteraction } from '../utils/recommendationApi';

// ─── Source badge label ────────────────────────────────────────────────────
function sourceBadge(source, t) {
  if (source === 'ai-embedding') return t('aiPersonalizedBadge', '✨ AI-Personalized for You');
  if (source === 'popularity-locality') return t('popularLocalBadge', '📍 Popular in Your City');
  return t('tailoredRecommendationsBadge', '🎯 Recommended Events');
}

// ─── Skeleton placeholder while loading ───────────────────────────────────
function RecSkeleton() {
  return (
    <Grid container spacing={2}>
      {[0, 1, 2].map((i) => (
        <Grid item key={i} xs={12} md={4}>
          <Skeleton
            variant="rounded"
            height={240}
            sx={{ borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.08)' }}
          />
        </Grid>
      ))}
    </Grid>
  );
}

/**
 * AIRecommendationSection
 * Personalized "Recommended for You" section based on:
 *  1. User's interests
 *  2. Preferred categories
 *  3. User's location / city
 *  4. Previous registrations & RSVPs
 */
export default function AIRecommendationSection({ onSelectEvent, onRSVP, refreshSignal = 0 }) {
  const { t, lang } = useLanguage();
  const { activeTimezone, userLocale } = useTimezone();
  const { user } = useAuth();

  const [recommendations, setRecommendations] = useState([]);
  const [source, setSource] = useState('');
  const [userContext, setUserContext] = useState(null);
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
      setUserContext(data.userContext || null);
    } catch (err) {
      console.warn('[AIRecommendationSection] fetch error:', err?.message);
      setError(t('recommendationFetchError', 'Could not load personalized recommendations right now.'));
    } finally {
      setLoading(false);
    }
  }, [userCity, userLang, t]);

  // Re-fetch when user logs in/out, changes city, or parent signals refresh
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations, refreshSignal, user?._id]);

  // Track that the user viewed this section (fires once per mount when authenticated)
  useEffect(() => {
    if (user?._id) {
      recordInteraction({
        userId: user._id,
        interactionType: 'view',
        city: userCity,
        language: userLang,
        metadata: { source: 'recommended-for-you-section' },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const handleViewDetails = (event) => {
    if (user?._id) {
      recordInteraction({
        userId: user._id,
        eventId: event._id || event.id,
        interactionType: 'click',
        category: event.category || '',
        city: event.city || userCity,
        language: event.language || userLang,
        metadata: { source: 'recommended-for-you-card' },
      });
    }
    onSelectEvent?.(event);
  };

  const handleRSVP = (event) => {
    if (user?._id) {
      recordInteraction({
        userId: user._id,
        eventId: event._id || event.id,
        interactionType: 'rsvp',
        category: event.category || '',
        city: event.city || userCity,
        language: event.language || userLang,
        metadata: { source: 'recommended-for-you-rsvp' },
      });
    }
    onRSVP?.(event);
  };

  // Active criteria derived from user context or user state
  const activeInterests = user?.interests || userContext?.interests || [];
  const activePreferredCategories = user?.preferredCategories || userContext?.preferredCategories || [];
  const activeCity = userContext?.city || userCity || 'Jaipur';
  const pastRegCount = userContext?.previousRegistrationsCount ?? (user?.rsvpedEvents?.length || 0);

  return (
    <Box
      component="section"
      aria-label="Recommended for You"
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        mb: 4,
        borderRadius: 3.5,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 50%, #1e293b 100%)',
        color: '#fff',
        boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.4), 0 4px 12px -2px rgba(99, 102, 241, 0.15)',
        border: '1px solid rgba(167, 139, 250, 0.25)',
      }}
    >
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.45)',
            }}
          >
            <AutoAwesomeIcon sx={{ color: '#ffffff', fontSize: '1.5rem' }} aria-hidden="true" />
          </Box>
          <Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              {t('recommendedForYou', 'Recommended for You')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#c7d2fe', fontSize: '0.85rem' }}>
              {t('recommendedForYouSubtitle', 'Personalized recommendations based on your interests, preferred categories, location, and past registrations.')}
            </Typography>
          </Box>
        </Box>

        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadRecommendations}
          disabled={loading}
          sx={{
            color: '#e0e7ff',
            bgcolor: 'rgba(255, 255, 255, 0.08)',
            textTransform: 'none',
            fontSize: '0.8rem',
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.16)' },
          }}
          aria-label="Refresh recommendations"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {/* User Personalization Context Tags / Guest Banner */}
      {user ? (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ my: 1.5, p: 1.25, bgcolor: 'rgba(15, 23, 42, 0.45)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Chip
            size="small"
            icon={<LocationOnIcon sx={{ '&&': { color: '#38bdf8', fontSize: '0.9rem' } }} />}
            label={`Location: ${activeCity}`}
            sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#bae6fd', fontWeight: 600, fontSize: '0.75rem' }}
          />

          {activePreferredCategories.length > 0 && (
            <Chip
              size="small"
              icon={<LocalOfferIcon sx={{ '&&': { color: '#a78bfa', fontSize: '0.9rem' } }} />}
              label={`Categories: ${activePreferredCategories.slice(0, 3).join(', ')}`}
              sx={{ bgcolor: 'rgba(167, 139, 250, 0.18)', color: '#e9d5ff', fontWeight: 600, fontSize: '0.75rem' }}
            />
          )}

          {activeInterests.length > 0 && (
            <Chip
              size="small"
              icon={<InterestsIcon sx={{ '&&': { color: '#34d399', fontSize: '0.9rem' } }} />}
              label={`Interests: ${activeInterests.slice(0, 3).join(', ')}`}
              sx={{ bgcolor: 'rgba(52, 211, 153, 0.15)', color: '#a7f3d0', fontWeight: 600, fontSize: '0.75rem' }}
            />
          )}

          {pastRegCount > 0 && (
            <Chip
              size="small"
              icon={<ConfirmationNumberIcon sx={{ '&&': { color: '#fbbf24', fontSize: '0.9rem' } }} />}
              label={`${pastRegCount} Past Registrations`}
              sx={{ bgcolor: 'rgba(251, 191, 36, 0.15)', color: '#fde68a', fontWeight: 600, fontSize: '0.75rem' }}
            />
          )}

          <Chip
            size="small"
            label={sourceBadge(source, t)}
            sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '0.75rem', ml: 'auto' }}
          />
        </Stack>
      ) : (
        <Box
          sx={{
            my: 1.5,
            p: 1.25,
            bgcolor: 'rgba(30, 41, 59, 0.6)',
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
            {t('guestRecommendationNote', 'Showing popular events in your city. Log in to get personalized recommendations based on your interests, preferred categories, and previous registrations.')}
          </Typography>
          <Chip
            size="small"
            label={sourceBadge(source, t)}
            sx={{ bgcolor: 'rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: '0.72rem' }}
          />
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={loadRecommendations}>
              Retry
            </Button>
          }
          sx={{ mb: 2, bgcolor: 'rgba(251, 191, 36, 0.15)', color: '#fef08a' }}
        >
          {error}
        </Alert>
      )}

      {/* Loading skeletons */}
      {loading && <RecSkeleton />}

      {/* Empty state */}
      {!loading && !error && recommendations.length === 0 && (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 2.5,
            border: '1px dashed rgba(255, 255, 255, 0.15)',
          }}
        >
          <Typography variant="body1" sx={{ color: '#cbd5e1', mb: 1 }}>
            {t('noRecommendationsFound', 'No personalized recommendations found yet. Update your interests and preferred categories in your profile to discover matching events!')}
          </Typography>
        </Box>
      )}

      {/* Recommendation cards */}
      {!loading && !error && recommendations.length > 0 && (
        <Grid container spacing={2}>
          {recommendations.map(({ event, matchScore, reason, isRsvped }) => {
            if (!event) return null;
            const titleText = (lang === 'hi' && event.title_hi) ? event.title_hi : event.title;
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
              <Grid item key={event._id || event.id || event.title} xs={12} sm={6} md={recommendations.length <= 3 ? 4 : 3}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: '#ffffff',
                    color: '#0f172a',
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    {/* Top Chips Row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                      <Chip
                        icon={<AutoAwesomeIcon sx={{ '&&': { fontSize: '0.85rem', color: '#4338ca' } }} aria-hidden="true" />}
                        label={`${matchScore}% Match`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: '#e0e7ff',
                          color: '#3730a3',
                          fontSize: '0.75rem',
                        }}
                      />
                      {event.category && (
                        <Chip
                          label={event.category}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            bgcolor: '#f1f5f9',
                            color: '#475569',
                          }}
                        />
                      )}
                    </Box>

                    {/* Event title */}
                    <Typography
                      variant="subtitle1"
                      component="h3"
                      sx={{
                        fontWeight: 800,
                        color: '#0f172a',
                        lineHeight: 1.3,
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '2.6em',
                      }}
                    >
                      {titleText}
                    </Typography>

                    {/* Location */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#475569', mb: 0.75 }}>
                      <LocationOnIcon sx={{ fontSize: '0.95rem', color: '#64748b' }} aria-hidden="true" />
                      <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>
                        {locationText}
                        {event.city ? ` · ${event.city}` : ''}
                      </Typography>
                    </Box>

                    {/* Date/Time */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#1e293b', mb: 1.5 }}>
                      <AccessTimeIcon sx={{ fontSize: '0.95rem', color: '#6366f1' }} aria-hidden="true" />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {formattedDate} · {formattedTime}
                        {timezoneLabel ? ` (${timezoneLabel})` : ''}
                      </Typography>
                    </Box>

                    {/* Why Recommended Section */}
                    <Box
                      sx={{
                        p: 1.2,
                        bgcolor: '#f8fafc',
                        borderRadius: 1.5,
                        border: '1px solid #e2e8f0',
                        minHeight: '52px',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#4338ca',
                          fontWeight: 800,
                          display: 'block',
                          textTransform: 'uppercase',
                          fontSize: '0.68rem',
                          letterSpacing: '0.04em',
                          mb: 0.25,
                        }}
                      >
                        {t('whyRecommended', 'Why Recommended:')}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#334155',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {reason || 'Personalized match based on your preferences'}
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
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        borderColor: '#cbd5e1',
                        color: '#334155',
                        '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                      }}
                    >
                      {t('detailsBtn', 'Details')}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      fullWidth
                      onClick={() => handleRSVP(event)}
                      startIcon={isRsvped ? <CheckCircleIcon sx={{ fontSize: '0.9rem' }} /> : undefined}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        bgcolor: isRsvped ? '#059669' : '#4f46e5',
                        '&:hover': {
                          bgcolor: isRsvped ? '#047857' : '#4338ca',
                        },
                      }}
                    >
                      {isRsvped ? 'Registered' : t('rsvpBtn', 'RSVP')}
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
