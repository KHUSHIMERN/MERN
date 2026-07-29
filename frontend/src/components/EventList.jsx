import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import SearchBar from './SearchBar';

const INITIAL_EVENTS = [
  {
    id: 'evt-1',
    itemKey: 'evt1',
    category: 'tech',
    tags: ['ai', 'cloud', 'bengaluru', 'developers'],
    date: '2026-08-15',
    seatsLeft: 35,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'evt-2',
    itemKey: 'evt2',
    category: 'culture',
    tags: ['culture', 'folk', 'mysuru', 'music', 'food'],
    date: '2026-08-22',
    seatsLeft: 120,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'evt-3',
    itemKey: 'evt3',
    category: 'workshop',
    tags: ['react', 'node', 'mongodb', 'workshop', 'javascript'],
    date: '2026-09-02',
    seatsLeft: 14,
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'evt-4',
    itemKey: 'evt4',
    category: 'charity',
    tags: ['environment', 'charity', 'volunteer', 'cubbon-park'],
    date: '2026-09-10',
    seatsLeft: 80,
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&auto=format&fit=crop&q=80',
  }
];

export function EventList({ onRegisterEvent, onSelectEvent }) {
  const { t } = useTranslation();

  // Read initial query parameter ?q= or ?search= from window URL
  const getInitialQuery = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || params.get('search') || '';
  };

  const [searchTerm, setSearchTerm] = useState(getInitialQuery);
  const [activeQuery, setActiveQuery] = useState(getInitialQuery);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [apiEvents, setApiEvents] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { key: 'all', label: t('events.filterAll', 'All Events') },
    { key: 'tech', label: t('events.filterTech', 'Technology') },
    { key: 'culture', label: t('events.filterCulture', 'Cultural') },
    { key: 'workshop', label: t('events.filterWorkshop', 'Workshops') },
    { key: 'charity', label: t('events.filterCharity', 'Charity') },
  ];

  // Helper to sync window URL parameter ?q=<query>
  const updateUrlParam = (query) => {
    const url = new URL(window.location.href);
    if (query && query.trim()) {
      url.searchParams.set('q', query.trim());
    } else {
      url.searchParams.delete('q');
      url.searchParams.delete('search');
    }
    window.history.pushState({}, '', url.toString());
  };

  // Fetch search results from backend REST API
  const fetchSearchResults = useCallback(async (query) => {
    setIsLoading(true);
    try {
      const endpoint = query && query.trim()
        ? `/api/events/search?q=${encodeURIComponent(query.trim())}`
        : '/api/events';
      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setApiEvents(json.data);
        }
      }
    } catch (err) {
      console.warn('Backend search API fetch fallback to local list:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialQ = getInitialQuery();
    if (initialQ) {
      fetchSearchResults(initialQ);
    }
  }, [fetchSearchResults]);

  const handleSearchSubmit = (query) => {
    const term = query !== undefined ? query : searchTerm;
    setActiveQuery(term);
    updateUrlParam(term);
    fetchSearchResults(term);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveQuery('');
    updateUrlParam('');
    setApiEvents(null);
  };

  // Determine list source (backend API response or fallback INITIAL_EVENTS)
  const sourceEvents = apiEvents !== null ? apiEvents : INITIAL_EVENTS;

  // Filter events by active search term and category
  const filteredEvents = sourceEvents.filter((evt) => {
    const title = evt.title || t(`events.items.${evt.itemKey}.title`, '');
    const location = typeof evt.location === 'object' ? evt.location.placeName : evt.location || t(`events.items.${evt.itemKey}.location`, '');
    const description = evt.description || t(`events.items.${evt.itemKey}.description`, '');
    const tagsStr = Array.isArray(evt.tags) ? evt.tags.join(' ') : '';

    const matchesCategory = selectedCategory === 'all' || evt.category === selectedCategory;

    const query = activeQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      title.toLowerCase().includes(query) ||
      location.toLowerCase().includes(query) ||
      description.toLowerCase().includes(query) ||
      tagsStr.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <section className="events-section" id="events">
      <div className="section-header">
        <h2 className="section-title">{t('events.sectionTitle', 'Upcoming Community Events')}</h2>
        <p className="section-subtitle">
          {t('events.sectionSubtitle', 'Find events tailored to your interests and connect with like-minded people.')}
        </p>
      </div>

      {/* Controls Bar: Reusable SearchBar + Category Filters */}
      <div className="events-controls">
        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSearch={handleSearchSubmit}
          onClear={handleClearSearch}
          placeholder={t('events.searchPlaceholder', 'Search events by title, city, or category...')}
        />

        <div className="category-filter-tabs">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className={`category-tab ${selectedCategory === cat.key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Summary Counter */}
      <div className="search-results-counter" role="status" aria-live="polite">
        {isLoading ? (
          <span className="counter-loading">🔍 Searching events...</span>
        ) : (
          <span className="counter-text">
            {t('events.resultsCount', 'Showing {{count}} event(s)', { count: filteredEvents.length })}
            {activeQuery && (
              <span className="active-query-badge">
                {' '}matching "<strong>{activeQuery}</strong>"
              </span>
            )}
          </span>
        )}
      </div>

      {/* Event Cards Grid */}
      {filteredEvents.length === 0 ? (
        <div className="no-events-box">
          <p>{t('events.noResults', 'No events found matching your search or category filter.')}</p>
          {activeQuery && (
            <button type="button" className="btn-secondary clear-filter-btn" onClick={handleClearSearch}>
              Reset Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="events-grid">
          {filteredEvents.map((evt) => {
            const title = evt.title || t(`events.items.${evt.itemKey}.title`);
            const location = typeof evt.location === 'object' ? evt.location.placeName : evt.location || t(`events.items.${evt.itemKey}.location`);
            const description = evt.description || t(`events.items.${evt.itemKey}.description`);

            return (
              <div className="event-card" key={evt.id || evt._id}>
                <div className="card-image-wrapper">
                  <img src={evt.image} alt={title} className="card-image" />
                  <span className="category-badge">
                    {t(`events.filter${evt.category.charAt(0).toUpperCase() + evt.category.slice(1)}`, evt.category)}
                  </span>
                </div>
                <div className="card-body">
                  <h3 className="card-title">{title}</h3>
                  <p className="card-description">{description}</p>

                  {Array.isArray(evt.tags) && evt.tags.length > 0 && (
                    <div className="card-tags-list">
                      {evt.tags.map((tag) => (
                        <span key={tag} className="event-tag-pill">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="card-meta">
                    <div className="meta-item">
                      <span className="meta-label">📅 {t('events.card.dateLabel', 'Date:')}</span>
                      <span className="meta-value">{evt.date || (evt.startDate ? new Date(evt.startDate).toISOString().split('T')[0] : '')}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">📍 {t('events.card.locationLabel', 'Location:')}</span>
                      <span className="meta-value">{location}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">🎟️</span>
                      <span className="meta-value highlight-seats">{evt.seatsLeft || 50} {t('events.card.seatsLeft', 'seats remaining')}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn-primary card-btn"
                      onClick={() => onRegisterEvent({ ...evt, title, location })}
                    >
                      {t('events.card.registerBtn', 'Register Now')}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary card-btn"
                      onClick={() => onSelectEvent({ ...evt, title, location })}
                    >
                      {t('events.card.viewDetails', 'View Details')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
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
    if (!e) return false;
    if (category !== 'all' && e.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (e.title || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q)
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
