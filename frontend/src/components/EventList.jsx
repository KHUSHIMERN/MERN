import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Calendar,
  MapPin,
  Ticket,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Filter,
  X,
  SlidersHorizontal,
  Compass
} from 'lucide-react';

const POPULAR_TAGS = ['Tech', 'AI', 'Jobs', 'Health', 'Workshop', 'Cultural', 'Community', 'Youth'];

const RADIUS_OPTIONS = [
  { label: 'Any Distance', value: '' },
  { label: 'Within 5 km', value: '5' },
  { label: 'Within 10 km', value: '10' },
  { label: 'Within 25 km', value: '25' },
  { label: 'Within 50 km', value: '50' }
];

export function EventList({ onRegisterEvent, onSelectEvent }) {
  const { t } = useTranslation();
  const { user, fetchProfile } = useAuth();

  // Helper to parse query parameters from URL on initialization
  const getInitialParams = () => {
    if (typeof window === 'undefined') {
      return { category: 'all', search: '', tags: [], startDate: '', endDate: '', radius: '' };
    }
    const params = new URLSearchParams(window.location.search);
    const tagsParam = params.get('tags');
    return {
      category: params.get('category') || 'all',
      search: params.get('search') || params.get('q') || '',
      tags: tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [],
      startDate: params.get('startDate') || '',
      endDate: params.get('endDate') || '',
      radius: params.get('radius') || ''
    };
  };

  const initial = getInitialParams();

  const [events, setEvents] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recSource, setRecSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState(initial.search);
  const [selectedCategory, setSelectedCategory] = useState(initial.category);
  const [selectedTags, setSelectedTags] = useState(initial.tags);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [locationRadius, setLocationRadius] = useState(initial.radius);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    Boolean(initial.tags.length || initial.startDate || initial.endDate || initial.radius)
  );

  const [rsvpLoadingId, setRsvpLoadingId] = useState(null);

  const categories = [
    { key: 'all', label: t('events.filterAll', 'All Events') },
    { key: 'Career & Jobs', label: 'Career & Jobs' },
    { key: 'Skill Workshops', label: 'Skill Workshops' },
    { key: 'Health & Wellness', label: 'Health & Wellness' },
    { key: 'Cultural Festivals', label: 'Cultural Festivals' },
    { key: 'Civic & Community', label: 'Civic & Community' }
  ];

  // Synchronize state to URL query string for bookmarkable/shareable links (AC 4)
  const syncUrlParams = useCallback(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();

    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory);
    }
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    }
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    }
    if (startDate) {
      params.set('startDate', startDate);
    }
    if (endDate) {
      params.set('endDate', endDate);
    }
    if (locationRadius) {
      params.set('radius', locationRadius);
    }

    const newQuery = params.toString();
    const newRelativePathQuery = window.location.pathname + (newQuery ? `?${newQuery}` : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [selectedCategory, searchTerm, selectedTags, startDate, endDate, locationRadius]);

  useEffect(() => {
    syncUrlParams();
    fetchEventsAndRecommendations();
  }, [selectedCategory, searchTerm, selectedTags, startDate, endDate, locationRadius, syncUrlParams]);

  const fetchEventsAndRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params with all active filters
      const params = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (selectedTags.length > 0) {
        params.tags = selectedTags.join(',');
      }
      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }
      if (locationRadius) {
        params.radius = locationRadius;
        // Default center point coordinates for Tier-2 location matching
        params.lat = 26.9124;
        params.lng = 75.7873;
      }

      const eventsRes = await axios.get('/api/events', { params });
      const fetchedEvents =
        eventsRes.data.events ||
        eventsRes.data.data ||
        (Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setEvents(fetchedEvents);

      // Fetch AI Recommendations
      try {
        const recRes = await axios.get('/api/recommendations');
        setRecommendations(recRes.data.recommendations || []);
        setRecSource(recRes.data.source || '');
      } catch (recErr) {
        console.warn('Recommendations fetch error:', recErr);
      }
    } catch (err) {
      console.error('Fetch events error:', err);
      setError('Failed to load events from backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClearAllFilters = () => {
    setSelectedCategory('all');
    setSearchTerm('');
    setSelectedTags([]);
    setStartDate('');
    setEndDate('');
    setLocationRadius('');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    searchTerm.trim() !== '' ||
    selectedTags.length > 0 ||
    startDate !== '' ||
    endDate !== '' ||
    locationRadius !== '';

  const handleToggleRsvp = async (evt) => {
    if (!user) {
      if (onRegisterEvent) onRegisterEvent(evt);
      return;
    }

    const eventId = evt._id || evt.id;
    const isAlreadyRsvped = isUserRsvped(evt);

    try {
      setRsvpLoadingId(eventId);
      if (isAlreadyRsvped) {
        await axios.delete(`/api/events/${eventId}/rsvp`);
      } else {
        await axios.post(`/api/events/${eventId}/rsvp`);
      }
      await fetchProfile();
      await fetchEventsAndRecommendations();
    } catch (err) {
      alert(err.response?.data?.message || 'RSVP operation failed.');
    } finally {
      setRsvpLoadingId(null);
    }
  };

  const isUserRsvped = (evt) => {
    if (!user) return false;
    const eventId = (evt._id || evt.id)?.toString();
    const userRsvps = (user.rsvpedEvents || []).map((id) =>
      typeof id === 'object' ? id._id?.toString() : id?.toString()
    );
    const attendeeUsers = (evt.attendees || []).map((a) =>
      typeof a.user === 'object' ? a.user?._id?.toString() : a.user?.toString()
    );
    return userRsvps.includes(eventId) || attendeeUsers.includes(user._id?.toString());
  };

  return (
    <section className="events-section" id="events">
      <div className="section-header">
        <h2 className="section-title">{t('events.sectionTitle', 'Upcoming Community Events')}</h2>
        <p className="section-subtitle">
          {t(
            'events.sectionSubtitle',
            'Find events tailored to your interests and connect with like-minded people in your city.'
          )}
        </p>
      </div>

      {/* AI / Rule Recommendations Highlight Banner */}
      {recommendations.length > 0 && !searchTerm && selectedCategory === 'all' && (
        <div
          className="recommendations-banner animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.15))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '32px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#818cf8',
              fontWeight: '700',
              marginBottom: '12px'
            }}
          >
            <Sparkles size={20} color="#a78bfa" />
            <span>
              {recSource === 'openai' ? '🤖 AI Recommended for You' : '🎯 Tailored Hyperlocal Recommendations'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {recommendations.slice(0, 3).map((rec, index) => {
              const recEvt = rec.event;
              if (!recEvt) return null;
              return (
                <div
                  key={recEvt._id || index}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>
                        {recEvt.category} • {recEvt.city}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          background: 'rgba(168, 85, 247, 0.2)',
                          color: '#c084fc',
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}
                      >
                        {rec.matchScore}% Match
                      </span>
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                      {recEvt.title}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '10px' }}>
                      "{rec.reason}"
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleToggleRsvp(recEvt)}
                    style={{ fontSize: '12px', padding: '6px 12px', width: '100%', justifyContent: 'center' }}
                  >
                    {isUserRsvped(recEvt) ? '✓ Registered' : 'Quick RSVP'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls Bar: Search + Category Filters */}
      <div className="events-controls">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={t('events.searchPlaceholder', 'Search events by title, keyword, city...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchTerm('')}>
              ✕
            </button>
          )}
        </div>

        <div className="category-filter-tabs" style={{ flexWrap: 'wrap' }}>
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
          <button
            type="button"
            className={`category-tab ${showAdvancedFilters ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderStyle: 'dashed'
            }}
          >
            <SlidersHorizontal size={14} /> Advanced Filters
          </button>
        </div>
      </div>

      {/* Advanced Multi-Criteria Filter Panel */}
      {showAdvancedFilters && (
        <div
          className="advanced-filters-panel animate-fade-in"
          style={{
            background: 'rgba(30, 41, 59, 0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '14px' }}>
            {/* Start Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                From Date:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                To Date:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Location Radius */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Location Distance:
              </label>
              <select
                value={locationRadius}
                onChange={(e) => setLocationRadius(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                {RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Select Tag Matching Chips */}
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
              Filter by Tags (Multi-Select):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {POPULAR_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag.toLowerCase())}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isSelected ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#a5b4fc' : '#94a3b8',
                      border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`
                    }}
                  >
                    #{tag}
                    {isSelected && <X size={12} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Bar with Reset Option */}
      {hasActiveFilters && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            padding: '10px 14px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: '10px',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 700 }}>Active Filters:</span>
          {selectedCategory !== 'all' && (
            <span style={{ fontSize: '0.75rem', background: '#1e293b', color: '#f8fafc', padding: '3px 8px', borderRadius: '6px' }}>
              Category: {selectedCategory}
            </span>
          )}
          {searchTerm && (
            <span style={{ fontSize: '0.75rem', background: '#1e293b', color: '#f8fafc', padding: '3px 8px', borderRadius: '6px' }}>
              Keyword: "{searchTerm}"
            </span>
          )}
          {selectedTags.map((t) => (
            <span key={t} style={{ fontSize: '0.75rem', background: '#1e293b', color: '#a5b4fc', padding: '3px 8px', borderRadius: '6px' }}>
              #{t}
            </span>
          ))}
          {startDate && (
            <span style={{ fontSize: '0.75rem', background: '#1e293b', color: '#f8fafc', padding: '3px 8px', borderRadius: '6px' }}>
              From: {startDate}
            </span>
          )}
          {endDate && (
            <span style={{ fontSize: '0.75rem', background: '#1e293b', color: '#f8fafc', padding: '3px 8px', borderRadius: '6px' }}>
              To: {endDate}
            </span>
          )}
          {locationRadius && (
            <span style={{ fontSize: '0.75rem', background: '#1e293b', color: '#f8fafc', padding: '3px 8px', borderRadius: '6px' }}>
              Radius: {locationRadius} km
            </span>
          )}

          <button
            type="button"
            onClick={handleClearAllFilters}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ✕ Clear All Filters
          </button>
        </div>
      )}

      {/* Loading & Error States */}
      {loading ? (
        <div className="no-events-box" style={{ padding: '60px', textAlign: 'center' }}>
          <RefreshCw size={28} className="animate-spin" style={{ marginBottom: '12px', color: '#6366f1' }} />
          <p>Connecting to backend API & loading events...</p>
        </div>
      ) : error ? (
        <div className="no-events-box" style={{ borderColor: '#ef4444', color: '#f87171' }}>
          <AlertCircle size={24} style={{ marginBottom: '8px' }} />
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={fetchEventsAndRecommendations} style={{ marginTop: '12px' }}>
            Retry Loading
          </button>
        </div>
      ) : events.length === 0 ? (
        /* Empty State Screen with one-click Clear Filters */
        <div className="no-events-box animate-fade-in" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Compass size={40} style={{ color: '#64748b', marginBottom: '12px' }} />
          <h3 style={{ color: '#f8fafc', marginBottom: '6px', fontSize: '1.2rem' }}>
            {t('events.noResults', 'No events found matching your filter combination')}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '18px' }}>
            Try broadening your search keyword, adjusting the date range, or removing selected tags.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleClearAllFilters}
              style={{ padding: '8px 20px', fontSize: '0.88rem' }}
            >
              Reset / Clear All Filters
            </button>
          )}
        </div>
      ) : (
        /* Event Cards Grid */
        <div className="events-grid">
          {events.map((evt) => {
            const seatsRemaining = Math.max(0, (evt.capacity || 100) - (evt.attendees?.length || 0));
            const isRsvped = isUserRsvped(evt);

            const displayPlace =
              typeof evt.location === 'object' && evt.location !== null
                ? evt.location.placeName || evt.city || 'Community Hall'
                : evt.location || evt.city || 'Community Hall';

            return (
              <div className="event-card animate-fade-in" key={evt._id || evt.id}>
                <div className="card-image-wrapper">
                  <img
                    src={
                      evt.image ||
                      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80'
                    }
                    alt={evt.title}
                    className="card-image"
                  />
                  <span className="category-badge">{evt.category}</span>
                  {evt.tier && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        color: '#38bdf8',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      {evt.tier} • {evt.city}
                    </span>
                  )}
                </div>
                <div className="card-body">
                  <h3 className="card-title">{evt.title}</h3>
                  <p className="card-description">{evt.description}</p>

                  {/* Tag Chips list on Card (Story 3 AC 3) */}
                  {Array.isArray(evt.tags) && evt.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '8px 0 12px' }}>
                      {evt.tags.slice(0, 4).map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '10px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#a5b4fc',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 600
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="card-meta">
                    <div className="meta-item">
                      <span className="meta-label">📅 Date:</span>
                      <span className="meta-value">
                        {evt.date || (evt.startDate ? new Date(evt.startDate).toLocaleDateString() : 'Upcoming')}{' '}
                        {evt.time ? `(${evt.time})` : ''}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">📍 Location:</span>
                      <span className="meta-value">
                        {displayPlace} {evt.city ? `(${evt.city})` : ''}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">🎟️</span>
                      <span className="meta-value highlight-seats">{seatsRemaining} seats remaining</span>
                    </div>
                    {evt.organizerName && (
                      <div className="meta-item">
                        <span className="meta-label">👤 Organizer:</span>
                        <span className="meta-value">{evt.organizerName}</span>
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    <button
                      type="button"
                      className={`card-btn ${isRsvped ? 'btn-secondary' : 'btn-primary'}`}
                      disabled={rsvpLoadingId === (evt._id || evt.id)}
                      onClick={() => handleToggleRsvp(evt)}
                      style={{
                        background: isRsvped ? 'rgba(16, 185, 129, 0.2)' : undefined,
                        color: isRsvped ? '#34d399' : undefined,
                        border: isRsvped ? '1px solid #10b981' : undefined
                      }}
                    >
                      {rsvpLoadingId === (evt._id || evt.id)
                        ? 'Updating...'
                        : isRsvped
                        ? '✓ RSVPed (Cancel)'
                        : user
                        ? 'Register / RSVP'
                        : 'Register Now'}
                    </button>

                    <button
                      type="button"
                      className="btn-secondary card-btn"
                      onClick={() => onSelectEvent && onSelectEvent(evt)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default EventList;