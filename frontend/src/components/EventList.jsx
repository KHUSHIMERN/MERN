import React, { useState, useEffect } from 'react';
import { Container, Grid, Typography, Box, Tabs, Tab, TextField, InputAdornment, Alert, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EventCard from './EventCard';
import EventDetail from './EventDetail';
import RSVPModal from './RSVPModal';
import AttendanceMetrics from './AttendanceMetrics';
import { useTimezone } from '../context/TimezoneContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import AIRecommendationSection from './AIRecommendationSection';

const mockFallbackEvents = [
  {
    _id: '1',
    title: 'Tier-2 Youth Job Fair & Skill Expo',
    description: 'Connect with over 40 leading regional employers, startups, and vocational training partners in Rajasthan.',
    category: 'career',
    location: 'Jaipur Exhibition Centre, Jaipur, Rajasthan',
    startDate: '2026-08-15T10:00:00+05:30',
    endDate: '2026-08-15T17:00:00+05:30',
    timezone: 'Asia/Kolkata',
    organizer: 'Rajasthan Skill Development Mission',
    capacity: 500,
    attendeesCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
    imageUrlAlt: 'Crowd of young job seekers interacting with recruiters at Rajasthan youth job fair booths'
  },
  {
    _id: '2',
    title: 'Global Tech & AI Workshop (Live Virtual)',
    description: 'Learn modern Web Dev & AI integration fundamentals with global guest speakers.',
    category: 'workshop',
    location: 'Online / Zoom Live Stream',
    startDate: '2026-08-20T14:00:00-04:00',
    endDate: '2026-08-20T17:00:00-04:00',
    timezone: 'America/New_York',
    organizer: 'OpenSource Community Global',
    capacity: 1000,
    attendeesCount: 680,
    imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600',
    imageUrlAlt: 'Developer presenting AI integration code on a large screen to virtual workshop attendees'
  },
  {
    _id: '3',
    title: 'Community Health & Blood Donation Drive',
    description: 'Annual health checkup camp and blood donor registration organized by local health volunteers.',
    category: 'health',
    location: 'Nehru Park Community Centre, Indore, MP',
    startDate: '2026-09-01T09:00:00+05:30',
    endDate: '2026-09-01T15:00:00+05:30',
    timezone: 'Asia/Kolkata',
    organizer: 'Indore Youth Welfare Forum',
    capacity: 300,
    attendeesCount: 95,
    imageUrl: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=600',
    imageUrlAlt: 'Medical volunteers assisting donors at community health and blood donation registration desk'
  },
  {
    _id: '4',
    title: 'European Micro-Entrepreneurship Conference',
    description: 'Keynotes on sustainable small-town entrepreneurship, local funding, and modern digital tools.',
    category: 'career',
    location: 'Hybrid / Europe Hub',
    startDate: '2026-09-10T16:00:00+01:00',
    endDate: '2026-09-10T19:30:00+01:00',
    timezone: 'Europe/London',
    organizer: 'Global Small Business Forum',
    capacity: 250,
    attendeesCount: 110,
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600',
    imageUrlAlt: 'Keynote speaker addressing an audience at European micro-entrepreneurship conference'
  },
  {
    _id: '5',
    title: 'Regional Folk Art & Music Festival',
    description: 'Celebrating local handicraft artisans, traditional dance performances, and street food stalls.',
    category: 'culture',
    location: 'Gandhi Maidan, Patna, Bihar',
    startDate: '2026-09-25T17:30:00+05:30',
    endDate: '2026-09-25T22:00:00+05:30',
    timezone: 'Asia/Kolkata',
    organizer: 'Bihar Cultural Academy',
    capacity: 800,
    attendeesCount: 420,
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
    imageUrlAlt: 'Folk dancers performing in traditional colorful attire on stage at Patna cultural festival'
  }
];

/**
 * EventList — displays filterable event cards with full API + fallback support.
 *
 * Props (QA App.jsx integration):
 *   onRegisterEvent {function} — opens EventRegistrationForm modal with selected event
 *   onSelectEvent   {function} — opens EventRegistrationForm modal for event detail view
 */
export function EventList({ onRegisterEvent, onSelectEvent }) {
  const { activeTimezone, userLocale, isOverridden } = useTimezone();
  const { t } = useLanguage();
  const { role, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rsvpEvent, setRsvpEvent] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [category, search]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = `/api/events?category=${category}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events || json.data || []);
      } else {
        setEvents(mockFallbackEvents);
      }
    } catch (e) {
      setEvents(mockFallbackEvents);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(e => {
    if (category !== 'all' && e.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.location && e.location.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSelectEvent = (evt) => {
    if (onSelectEvent) {
      onSelectEvent(evt);
    } else {
      setSelectedEvent(evt);
    }
  };

  const handleRSVP = (evt) => {
    if (onRegisterEvent) {
      onRegisterEvent(evt);
    } else {
      setRsvpEvent(evt);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} id="events">
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 800, color: '#f8fafc', mb: 1 }}>
          {t('appTitle')}
        </Typography>
        <Typography variant="subtitle1" component="p" color="text.secondary">
          {t('appSubtitle')}
        </Typography>

        {isOverridden && (
          <Alert severity="info" sx={{ mt: 2, maxWidth: 600, mx: 'auto', borderRadius: 2 }}>
            Displayed times are automatically converted to your manual timezone override: <strong>{activeTimezone}</strong>.
          </Alert>
        )}
      </Box>

      {/* Attendance Metrics & Trend Table for Event Organizers */}
      {role === 'organizer' && (
        <AttendanceMetrics organizerId={user?._id || 'organizer_1'} initialLimit={5} />
      )}

      {/* AI Personalized Recommendation Section */}
      <AIRecommendationSection
        onSelectEvent={handleSelectEvent}
        onRSVP={handleRSVP}
      />

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 4, gap: 2 }}>
        <Tabs
          value={category}
          onChange={(e, val) => setCategory(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={t('allCategories')} value="all" sx={{ fontWeight: 700 }} />
          <Tab label={t('career')} value="career" sx={{ fontWeight: 700 }} />
          <Tab label={t('health')} value="health" sx={{ fontWeight: 700 }} />
          <Tab label={t('culture')} value="culture" sx={{ fontWeight: 700 }} />
          <Tab label={t('workshop')} value="workshop" sx={{ fontWeight: 700 }} />
        </Tabs>

        <TextField
          placeholder={t('searchPlaceholder')}
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 260 }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredEvents.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" component="p" color="text.secondary">
            No events found matching your filter criteria.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredEvents.map(event => (
            <Grid item key={event._id || event.title} xs={12} sm={6} md={4}>
              <EventCard
                event={event}
                activeTimezone={activeTimezone}
                userLocale={userLocale}
                onSelectEvent={handleSelectEvent}
                onRSVP={handleRSVP}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Internal EventDetail modal — used when onSelectEvent prop is not provided */}
      {selectedEvent && (
        <EventDetail
          open={Boolean(selectedEvent)}
          event={selectedEvent}
          activeTimezone={activeTimezone}
          userLocale={userLocale}
          onClose={() => setSelectedEvent(null)}
          onRSVP={handleRSVP}
        />
      )}

      {/* Internal RSVPModal — used when onRegisterEvent prop is not provided */}
      {rsvpEvent && (
        <RSVPModal
          open={Boolean(rsvpEvent)}
          event={rsvpEvent}
          activeTimezone={activeTimezone}
          userLocale={userLocale}
          onClose={() => setRsvpEvent(null)}
        />
      )}
    </Container>
  );
}

export default EventList;
