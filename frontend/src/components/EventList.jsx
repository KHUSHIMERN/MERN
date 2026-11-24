import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { confirmedCount, hasActiveRsvp, isEventFull, rsvpStatus, rsvpStatusLabel } from '../utils/rsvpState';
import { RefreshCw, AlertCircle, Filter, MapPin, Calendar, Globe, RotateCcw, X, ChevronLeft, ChevronRight, SlidersHorizontal, ShieldCheck, Flag } from 'lucide-react';
import { recordInteraction } from '../utils/recommendationApi';
import ReportEventModal from './ReportEventModal';

export function EventList({ onSelectEvent, onRequireLogin, refreshKey = 0, searchFilter }) {
  const { t } = useTranslation();
  const { user, fetchProfile } = useAuth();
  const showToast = useToast();
  const { refreshNotifications } = useNotifications();

  const [events, setEvents] = useState([]);
  const [reportTargetEvent, setReportTargetEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [rsvpLoadingId, setRsvpLoadingId] = useState(null);
  const [nlParsed, setNlParsed] = useState(null);

  const { lang } = useLanguage();
  const currentLang = (lang || 'en').slice(0, 2);

  const [showOriginalMap, setShowOriginalMap] = useState({});
  const [dynamicTranslations, setDynamicTranslations] = useState({});
  const [translatingIds, setTranslatingIds] = useState({});

  const getEventDisplay = (evt) => {
    const evtId = evt._id || evt.id;
    const isOriginalForced = Boolean(showOriginalMap[evtId]);

    if (isOriginalForced || currentLang === 'en') {
      return {
        title: evt.title,
        description: evt.description,
        isTranslated: false,
        isShowingOriginal: true,
        langLabel: 'English (Original)',
      };
    }

    let title = evt.title;
    let description = null;

    if (currentLang === 'hi') {
      title = evt.title_hi || evt.title;
      description = evt.description_hi || dynamicTranslations[`${evtId}_hi`];
    } else if (currentLang === 'kn') {
      title = evt.title_kn || evt.title;
      description = evt.description_kn || dynamicTranslations[`${evtId}_kn`];
    }

    if (description) {
      return {
        title,
        description,
        isTranslated: true,
        isShowingOriginal: false,
        langLabel: currentLang === 'hi' ? 'Hindi' : 'Kannada',
      };
    }

    return {
      title,
      description: evt.description,
      isTranslated: false,
      isShowingOriginal: true,
      langLabel: 'English (Original)',
    };
  };

  const handleTranslateEvent = async (evt, targetLanguage = currentLang) => {
    const evtId = evt._id || evt.id;
    setTranslatingIds((prev) => ({ ...prev, [evtId]: true }));
    try {
      const res = await axios.post('/api/ai/translate', {
        text: evt.description,
        targetLang: targetLanguage,
        sourceLang: 'en',
        eventId: evtId,
      });
      if (res.data && res.data.success) {
        setDynamicTranslations((prev) => ({
          ...prev,
          [`${evtId}_${targetLanguage}`]: res.data.translatedText,
        }));
        setShowOriginalMap((prev) => ({ ...prev, [evtId]: false }));
        showToast(
          targetLanguage === 'hi'
            ? 'विवरण का हिंदी में अनुवाद किया गया'
            : targetLanguage === 'kn'
            ? 'ವಿವರಣೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಅನುವಾದಿಸಲಾಗಿದೆ'
            : 'Description translated successfully!',
          'success'
        );
      }
    } catch (err) {
      console.error('Translation error:', err);
      showToast('Failed to translate description. Please try again.', 'error');
    } finally {
      setTranslatingIds((prev) => ({ ...prev, [evtId]: false }));
    }
  };

  const toggleShowOriginal = (evtId) => {
    setShowOriginalMap((prev) => ({ ...prev, [evtId]: !prev[evtId] }));
  };

  // Sync external search filter from Typeahead if provided
  useEffect(() => {
    if (searchFilter !== undefined) {
      setSearchTerm(searchFilter);
      setPage(1);
    }
  }, [searchFilter]);

  const categories = [
    { key: 'all', label: t('events.filterAll', 'All Events') },
    { key: 'Career & Jobs', label: 'Career & Jobs' },
    { key: 'Skill Workshops', label: 'Skill Workshops' },
    { key: 'Health & Wellness', label: 'Health & Wellness' },
    { key: 'Cultural Festivals', label: 'Cultural Festivals' },
    { key: 'Civic & Community', label: 'Civic & Community' },
  ];

  const languages = [
    { key: 'all', label: 'All Languages' },
    { key: 'en', label: 'English (en)' },
    { key: 'hi', label: 'Hindi (hi)' },
    { key: 'kn', label: 'Kannada (kn)' },
  ];

  const fetchEventsAndRecommendations = React.useCallback(async () => {
    try {
      void refreshKey;
      setLoading(true);
      setError(null);

      const trimmedSearch = searchTerm.trim();
      const isNaturalSentence =
        trimmedSearch.split(/\s+/).length >= 3 ||
        /\b(free|near me|in my city|this weekend|this month|job fairs|workshops near|festivals)\b/i.test(trimmedSearch);

      // Check if user is using a natural language query sentence
      if (trimmedSearch && isNaturalSentence) {
        try {
          const nlRes = await axios.post('/api/ai/nl-search', {
            query: trimmedSearch,
            userLocation: locationFilter || user?.city || 'Jaipur',
            language: languageFilter !== 'all' ? languageFilter : 'en',
          });
          if (nlRes.data && nlRes.data.success) {
            setNlParsed(nlRes.data.parsed);
            setEvents(nlRes.data.events || []);
            setPagination({
              total: nlRes.data.count || (nlRes.data.events || []).length,
              totalPages: 1,
            });
            return;
          }
        } catch (nlErr) {
          console.warn('[NL Search] Fallback to standard filter query:', nlErr);
        }
      }

      setNlParsed(null);

      // Build combined query parameters
      const params = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (locationFilter.trim()) {
        params.location = locationFilter.trim();
      }
      if (startDateFilter) {
        params.startDate = startDateFilter;
      }
      if (endDateFilter) {
        params.endDate = endDateFilter;
      }
      if (languageFilter !== 'all') {
        params.language = languageFilter;
      }
      params.page = page;
      params.pageSize = pageSize;

      const eventsRes = await axios.get('/api/events', { params });
      const fetchedEvents = eventsRes.data.events || eventsRes.data.data || (Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setEvents(fetchedEvents);

      if (eventsRes.data.total !== undefined) {
        setPagination({
          total: Number(eventsRes.data.total) || fetchedEvents.length,
          totalPages: Number(eventsRes.data.totalPages) || 1,
        });
      } else {
        setPagination({
          total: fetchedEvents.length,
          totalPages: 1,
        });
      }
    } catch (err) {
      console.error('Fetch events error:', err);
      setError('Failed to load events from backend server.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchTerm, locationFilter, startDateFilter, endDateFilter, languageFilter, page, pageSize, refreshKey, user?._id]);

  useEffect(() => {
    fetchEventsAndRecommendations();
  }, [fetchEventsAndRecommendations]);

  // Compute active filters list for visual tags
  const activeFilters = [];
  if (searchTerm.trim()) {
    activeFilters.push({
      id: 'search',
      label: `Search: "${searchTerm.trim()}"`,
      clear: () => { setSearchTerm(''); setPage(1); }
    });
  }
  if (selectedCategory !== 'all') {
    activeFilters.push({
      id: 'category',
      label: `Category: ${selectedCategory}`,
      clear: () => { setSelectedCategory('all'); setPage(1); }
    });
  }
  if (locationFilter.trim()) {
    activeFilters.push({
      id: 'location',
      label: `Location: ${locationFilter.trim()}`,
      clear: () => { setLocationFilter(''); setPage(1); }
    });
  }
  if (startDateFilter) {
    activeFilters.push({
      id: 'startDate',
      label: `From: ${startDateFilter}`,
      clear: () => { setStartDateFilter(''); setPage(1); }
    });
  }
  if (endDateFilter) {
    activeFilters.push({
      id: 'endDate',
      label: `To: ${endDateFilter}`,
      clear: () => { setEndDateFilter(''); setPage(1); }
    });
  }
  if (languageFilter !== 'all') {
    const langLabel = languages.find((l) => l.key === languageFilter)?.label || languageFilter;
    activeFilters.push({
      id: 'language',
      label: `Language: ${langLabel}`,
      clear: () => { setLanguageFilter('all'); setPage(1); }
    });
  }

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setLocationFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setLanguageFilter('all');
    setPage(1);
  };

  const handleCategorySelect = (key) => {
    setSelectedCategory(key);
    setPage(1);
    // Record filter interaction
    if (user?._id && key !== 'all') {
      recordInteraction({
        userId: user._id,
        interactionType: 'filter',
        category: key,
        city: user?.city || '',
        language: user?.preferredLanguage || 'en',
        metadata: { filterType: 'category', value: key },
      });
    }
  };

  const handleToggleRsvp = async (evt) => {
    if (!user) {
      showToast('Please log in with a verified account to RSVP.', 'info');
      onRequireLogin?.();
      return;
    }

    const eventId = evt._id || evt.id;
    const isAlreadyRsvped = hasActiveRsvp(evt) || isUserRsvped(evt);

    try {
      setRsvpLoadingId(eventId);
      if (isAlreadyRsvped) {
        await axios.delete(`/api/events/${eventId}/rsvp`);
        showToast('RSVP cancelled successfully.', 'success');
      } else {
        const response = await axios.post(`/api/events/${eventId}/rsvp`);
        if (response.data?.status === 'waitlist') {
          showToast(`Event is full. You joined the waitlist at position ${response.data.waitlistPosition}.`, 'warning');
        } else {
          showToast('Your RSVP is confirmed.', 'success');
        }
        // Record RSVP interaction to improve future recommendations
        recordInteraction({
          userId: user._id,
          eventId: eventId,
          interactionType: 'rsvp',
          category: evt.category || '',
          city: evt.city || user?.city || '',
          language: evt.language || user?.preferredLanguage || 'en',
          metadata: { source: 'event-list' },
        });
      }
      await Promise.allSettled([
        fetchProfile(),
        fetchEventsAndRecommendations(),
        refreshNotifications({ quiet: true }),
      ]);
    } catch (err) {
      showToast(err.response?.data?.message || 'RSVP operation failed.', 'error');
    } finally {
      setRsvpLoadingId(null);
    }
  };

  const isUserRsvped = (evt) => {
    if (!user) return false;
    if (hasActiveRsvp(evt)) return true;
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

<<<<<<< HEAD
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

=======
>>>>>>> DEV-AMRITA
      {/* Controls Bar: Search + Category Filters + Advanced Multi-Criteria Panel */}
      <div className="events-controls">
        <div className="search-bar-row">
          <div className="search-bar">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder={t('events.searchPlaceholder', 'Search events by title, city, or category...')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              aria-label="Search events"
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className={`advanced-filter-toggle-btn ${showAdvancedFilters ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            aria-expanded={showAdvancedFilters}
            aria-label="Toggle advanced filters panel"
          >
            <SlidersHorizontal size={18} />
            <span>Filters</span>
            {(locationFilter || startDateFilter || endDateFilter || languageFilter !== 'all') && (
              <span className="filter-count-badge">
                {[Boolean(locationFilter), Boolean(startDateFilter), Boolean(endDateFilter), languageFilter !== 'all'].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Natural-Language Prompt Suggestions */}
        <div
          className="nl-prompt-chips-container"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            margin: '8px 0 14px 0',
            fontSize: '12px',
          }}
        >
          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            ✨ Natural query ideas:
          </span>
          {[
            'Free job fairs in my city this month',
            'Coding workshops near Patna this weekend',
            'Folk music and dance festivals in Karnataka',
          ].map((promptText) => (
            <button
              key={promptText}
              type="button"
              className="nl-prompt-pill"
              onClick={() => {
                setSearchTerm(promptText);
                setPage(1);
              }}
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#c7d2fe',
                border: '1px solid rgba(99, 102, 241, 0.28)',
                padding: '3px 10px',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.15s ease',
              }}
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* AI Parsed Multi-Criteria Indicator Banner */}
        {nlParsed && (
          <div
            className="nl-parsed-banner animate-fade-in"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              margin: '0 0 16px 0',
              background: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid #6366f1',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.2)',
            }}
          >
            <span style={{ fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              🤖 Natural Language AI Filter:
            </span>
            {nlParsed.category && (
              <span style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#c7d2fe', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                Category: {nlParsed.category}
              </span>
            )}
            {nlParsed.city && (
              <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                City: {nlParsed.city}
              </span>
            )}
            {nlParsed.isFree && (
              <span style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                Price: Free
              </span>
            )}
            {nlParsed.timeframe && (
              <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fde68a', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                When: {nlParsed.timeframe}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setNlParsed(null);
                setPage(1);
              }}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '11px',
                textDecoration: 'underline',
              }}
            >
              Clear AI Search
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="category-filter-tabs" style={{ flexWrap: 'wrap' }} role="tablist" aria-label="Event category filters">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat.key}
              className={`category-tab ${selectedCategory === cat.key ? 'active' : ''}`}
              onClick={() => handleCategorySelect(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="advanced-filters-panel animate-fade-in" role="region" aria-label="Advanced multi-criteria filters">
            <div className="filter-grid">
              {/* Location / City Filter */}
              <div className="filter-field-group">
                <label htmlFor="filter-location" className="filter-label">
                  <MapPin size={15} /> City / Location:
                </label>
                <input
                  id="filter-location"
                  type="text"
                  className="filter-input"
                  placeholder="e.g. Bengaluru, Jaipur, Mysuru"
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Start Date Filter */}
              <div className="filter-field-group">
                <label htmlFor="filter-start-date" className="filter-label">
                  <Calendar size={15} /> From Date:
                </label>
                <input
                  id="filter-start-date"
                  type="date"
                  className="filter-input"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* End Date Filter */}
              <div className="filter-field-group">
                <label htmlFor="filter-end-date" className="filter-label">
                  <Calendar size={15} /> To Date:
                </label>
                <input
                  id="filter-end-date"
                  type="date"
                  className="filter-input"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Language Filter */}
              <div className="filter-field-group">
                <label htmlFor="filter-language" className="filter-label">
                  <Globe size={15} /> Language:
                </label>
                <select
                  id="filter-language"
                  className="filter-select"
                  value={languageFilter}
                  onChange={(e) => {
                    setLanguageFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  {languages.map((lang) => (
                    <option key={lang.key} value={lang.key}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Page Size Selector */}
              <div className="filter-field-group">
                <label htmlFor="filter-page-size" className="filter-label">
                  <Filter size={15} /> Items per page:
                </label>
                <select
                  id="filter-page-size"
                  className="filter-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={6}>6 events</option>
                  <option value={12}>12 events</option>
                  <option value={24}>24 events</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips / Pills Bar */}
        {activeFilters.length > 0 && (
          <div className="active-filters-bar animate-fade-in" aria-label="Active filters">
            <span className="active-filters-label">Active filters ({activeFilters.length}):</span>
            <div className="active-filters-list">
              {activeFilters.map((flt) => (
                <span key={flt.id} className="active-filter-pill">
                  {flt.label}
                  <button
                    type="button"
                    className="remove-filter-btn"
                    onClick={flt.clear}
                    aria-label={`Remove ${flt.id} filter`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                className="reset-all-filters-btn"
                onClick={handleResetAllFilters}
                aria-label="Reset all filters"
              >
                <RotateCcw size={14} /> Reset All
              </button>
            </div>
          </div>
        )}
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
        <div className="events-grid-wrapper">
          <div className="events-grid">
          {events.map((evt) => {
            const seatsRemaining = Math.max(0, (evt.capacity || 100) - confirmedCount(evt));
            const isRsvped = hasActiveRsvp(evt) || isUserRsvped(evt);
            const status = rsvpStatus(evt);
            const full = isEventFull(evt);

            return (
              <div className="event-card animate-fade-in" key={evt._id || evt.id}>
                <div className="card-image-wrapper">
                  <img
                    src={evt.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80'}
                    alt={evt.title}
                    className="card-image"
                  />
                  <span className="category-badge">{evt.category}</span>
                  {evt.isVerified !== false && evt.verificationStatus !== 'rejected' && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(16, 185, 129, 0.9)',
                        color: '#ffffff',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backdropFilter: 'blur(4px)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
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
                  {(() => {
                    const evtId = evt._id || evt.id;
                    const display = getEventDisplay(evt);

                    return (
                      <>
                        <h3 className="card-title">{display.title}</h3>
                        <span className={`rsvp-state-badge ${status === 'waitlist' ? 'waitlist' : status === 'confirmed' ? 'confirmed' : full ? 'full' : ''}`}>
                          {rsvpStatusLabel(evt)}
                        </span>
                        <p className="card-description">{display.description}</p>

                        {/* AI Translation & Preserve-Original Toggle Bar */}
                        <div
                          className="translation-action-row"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            margin: '4px 0 10px 0',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            fontSize: '11px',
                          }}
                        >
                          {display.isTranslated ? (
                            <>
                              <span style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                🌐 {t('events.aiTranslated', 'AI Translated')} ({display.langLabel})
                              </span>
                              <button
                                type="button"
                                className="toggle-original-btn"
                                onClick={() => toggleShowOriginal(evtId)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#38bdf8',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontWeight: 600,
                                  textDecoration: 'underline',
                                }}
                              >
                                {t('events.showOriginal', 'Show Original (EN)')}
                              </button>
                            </>
                          ) : display.isShowingOriginal && (currentLang === 'hi' || currentLang === 'kn') && (evt.description_hi || evt.description_kn || dynamicTranslations[`${evtId}_${currentLang}`]) ? (
                            <>
                              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                📄 Original English Description
                              </span>
                              <button
                                type="button"
                                className="toggle-original-btn"
                                onClick={() => toggleShowOriginal(evtId)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#818cf8',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontWeight: 600,
                                  textDecoration: 'underline',
                                }}
                              >
                                {t('events.showTranslated', 'Show Translated')} ({currentLang === 'hi' ? 'Hindi' : 'Kannada'})
                              </button>
                            </>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
                              <span style={{ color: '#94a3b8' }}>
                                {translatingIds[evtId] ? 'Translating...' : 'Translate description:'}
                              </span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleTranslateEvent(evt, 'hi')}
                                  disabled={translatingIds[evtId]}
                                  style={{
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    color: '#c7d2fe',
                                    borderRadius: '12px',
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                >
                                  🇮🇳 हिंदी
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTranslateEvent(evt, 'kn')}
                                  disabled={translatingIds[evtId]}
                                  style={{
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    color: '#fde68a',
                                    borderRadius: '12px',
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                >
                                  🟡 ಕನ್ನಡ
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {Array.isArray(evt.matchReasons) && evt.matchReasons.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', margin: '6px 0 10px 0' }}>
                      {evt.matchReasons.map((reason, rIdx) => (
                        <span
                          key={rIdx}
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#a5b4fc',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                          }}
                        >
                          ✨ {reason}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="card-meta">
                    <div className="meta-item">
<<<<<<< HEAD
                      <span className="meta-label">📅 Date:</span>
=======
                      <span className="meta-label">Date:</span>
>>>>>>> DEV-AMRITA
                      <span className="meta-value">
                        {evt.date || (evt.startDate ? new Date(evt.startDate).toLocaleDateString() : 'Upcoming')}{evt.time ? ` (${evt.time})` : ''}
                      </span>
                    </div>
                    <div className="meta-item">
<<<<<<< HEAD
                      <span className="meta-label">📍 Location:</span>
=======
                      <span className="meta-label">Location:</span>
>>>>>>> DEV-AMRITA
                      <span className="meta-value">
                        {(() => {
                          const rawLoc = typeof evt.location === 'object' && evt.location !== null
                            ? (evt.location.placeName || evt.city || 'Online')
                            : (evt.location || evt.city || 'Online');
                          return evt.city && !rawLoc.toLowerCase().includes(evt.city.toLowerCase())
                            ? `${rawLoc} (${evt.city})`
                            : rawLoc;
                        })()}
                      </span>
                    </div>
                    <div className="meta-item">
<<<<<<< HEAD
                      <span className="meta-label">🎟️</span>
                      <span className="meta-value highlight-seats">{seatsRemaining} seats remaining</span>
                    </div>
                    {evt.organizerName && (
                      <div className="meta-item">
                        <span className="meta-label">👤 Organizer:</span>
                        <span className="meta-value">{evt.organizerName}</span>
                      </div>
                    )}
=======
                      <span className="meta-label">Seats Remaining:</span>
                      <span className="meta-value highlight-seats">{seatsRemaining}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Organizer:</span>
                      <span className="meta-value">
                        {evt.organizerName
                          || (typeof evt.organizer === 'object' && evt.organizer !== null ? evt.organizer.name : null)
                          || (typeof evt.organizer === 'string' && evt.organizer.trim() ? evt.organizer : null)
                          || evt.organizerId
                          || 'Community Organizer'}
                      </span>
                    </div>
>>>>>>> DEV-AMRITA
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
                        : !isRsvped && full
                        ? 'Join Waitlist'
                        : isRsvped
                        ? '✓ RSVPed (Cancel)'
                        : user
                        ? 'Register / RSVP'
                        : 'Register Now'}
                    </button>

                    <button
                      type="button"
                      className="btn-secondary card-btn"
                      onClick={() => {
                        // Record click/view interaction
                        if (user?._id) {
                          recordInteraction({
                            userId: user._id,
                            eventId: evt._id || evt.id,
                            interactionType: 'click',
                            category: evt.category || '',
                            city: evt.city || user?.city || '',
                            language: evt.language || user?.preferredLanguage || 'en',
                          });
                        }
                        onSelectEvent && onSelectEvent(evt);
                      }}
                    >
                      View Details
                    </button>

                    {/* Feature 9: Report Event trigger button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReportTargetEvent(evt);
                      }}
                      title="Report suspicious or inappropriate event"
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Flag size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls Bar */}
        {pagination.totalPages > 1 && (
          <div className="pagination-bar" role="navigation" aria-label="Events pagination">
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <span className="pagination-status">
              Page <strong>{page}</strong> of <strong>{pagination.totalPages}</strong>
              <span className="pagination-total-count">({pagination.total} events)</span>
            </span>

            <button
              type="button"
              className="pagination-btn"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              aria-label="Next page"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    )}

    {/* Feature 9: Report Event Modal */}
    <ReportEventModal
      open={Boolean(reportTargetEvent)}
      onClose={() => setReportTargetEvent(null)}
      event={reportTargetEvent}
      onReportSubmitted={() => {
        // Report saved
      }}
    />
  </section>
  );
}

export default EventList;
