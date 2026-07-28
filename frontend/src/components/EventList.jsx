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
  );
}

export default EventList;
