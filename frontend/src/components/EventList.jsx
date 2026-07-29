import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Calendar, MapPin, Ticket, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

export function EventList({ onRegisterEvent, onSelectEvent }) {
  const { t } = useTranslation();
  const { user, fetchProfile } = useAuth();

  const [events, setEvents] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recSource, setRecSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [rsvpLoadingId, setRsvpLoadingId] = useState(null);

  const categories = [
    { key: 'all', label: t('events.filterAll', 'All Events') },
    { key: 'Career & Jobs', label: 'Career & Jobs' },
    { key: 'Skill Workshops', label: 'Skill Workshops' },
    { key: 'Health & Wellness', label: 'Health & Wellness' },
    { key: 'Cultural Festivals', label: 'Cultural Festivals' },
    { key: 'Civic & Community', label: 'Civic & Community' },
  ];

  useEffect(() => {
    fetchEventsAndRecommendations();
  }, [selectedCategory, searchTerm]);

  const fetchEventsAndRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Events
      const params = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const eventsRes = await axios.get('/api/events', { params });
      const fetchedEvents = eventsRes.data.events || eventsRes.data.data || (Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setEvents(fetchedEvents);

      // 2. Fetch AI Recommendations
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
    const userRsvps = (user.rsvpedEvents || []).map((id) => (typeof id === 'object' ? id._id?.toString() : id?.toString()));
    const attendeeUsers = (evt.attendees || []).map((a) => (typeof a.user === 'object' ? a.user?._id?.toString() : a.user?.toString()));
    return userRsvps.includes(eventId) || attendeeUsers.includes(user._id?.toString());
  };

  return (
    <section className="events-section" id="events">
      <div className="section-header">
        <h2 className="section-title">{t('events.sectionTitle', 'Upcoming Community Events')}</h2>
        <p className="section-subtitle">
          {t('events.sectionSubtitle', 'Find events tailored to your interests and connect with like-minded people in your city.')}
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
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: '700', marginBottom: '12px' }}>
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
                    justify: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>
                        {recEvt.category} • {recEvt.city}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '2px 8px', borderRadius: '10px' }}>
                        {rec.matchScore}% Match
                      </span>
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{recEvt.title}</h4>
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
            placeholder={t('events.searchPlaceholder', 'Search events by title, city, or category...')}
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
        </div>
      </div>

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
        <div className="no-events-box">
          <p>{t('events.noResults', 'No events found matching your search or category filter.')}</p>
        </div>
      ) : (
        /* Event Cards Grid */
        <div className="events-grid">
          {events.map((evt) => {
            const seatsRemaining = Math.max(0, (evt.capacity || 100) - (evt.attendees?.length || 0));
            const isRsvped = isUserRsvped(evt);

            return (
              <div className="event-card animate-fade-in" key={evt._id || evt.id}>
                <div className="card-image-wrapper">
                  <img
                    src={evt.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80'}
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
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {evt.tier} • {evt.city}
                    </span>
                  )}
                </div>
                <div className="card-body">
                  <h3 className="card-title">{evt.title}</h3>
                  <p className="card-description">{evt.description}</p>

                  <div className="card-meta">
                    <div className="meta-item">
                      <span className="meta-label">📅 Date:</span>
                      <span className="meta-value">
                        {evt.date || (evt.startDate ? new Date(evt.startDate).toLocaleDateString() : 'Upcoming')} {evt.time ? `(${evt.time})` : ''}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">📍 Location:</span>
                      <span className="meta-value">
                        {typeof evt.location === 'object' && evt.location !== null
                          ? (evt.location.placeName || 'Online')
                          : (evt.location || 'Online')} {evt.city ? `(${evt.city})` : ''}
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
                        border: isRsvped ? '1px solid #10b981' : undefined,
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
