import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const INITIAL_EVENTS = [
  {
    id: 'evt-1',
    itemKey: 'evt1',
    category: 'tech',
    date: '2026-08-15',
    seatsLeft: 35,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'evt-2',
    itemKey: 'evt2',
    category: 'culture',
    date: '2026-08-22',
    seatsLeft: 120,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'evt-3',
    itemKey: 'evt3',
    category: 'workshop',
    date: '2026-09-02',
    seatsLeft: 14,
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'evt-4',
    itemKey: 'evt4',
    category: 'charity',
    date: '2026-09-10',
    seatsLeft: 80,
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&auto=format&fit=crop&q=80',
  }
];

export function EventList({ onRegisterEvent, onSelectEvent }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { key: 'all', label: t('events.filterAll', 'All Events') },
    { key: 'tech', label: t('events.filterTech', 'Technology') },
    { key: 'culture', label: t('events.filterCulture', 'Cultural') },
    { key: 'workshop', label: t('events.filterWorkshop', 'Workshops') },
    { key: 'charity', label: t('events.filterCharity', 'Charity') },
  ];

  const filteredEvents = INITIAL_EVENTS.filter((evt) => {
    const title = t(`events.items.${evt.itemKey}.title`);
    const location = t(`events.items.${evt.itemKey}.location`);
    const matchesCategory = selectedCategory === 'all' || evt.category === selectedCategory;
    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.toLowerCase().includes(searchTerm.toLowerCase());
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
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search input"
            >
              ✕
            </button>
          )}
        </div>

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

      {/* Event Cards Grid */}
      {filteredEvents.length === 0 ? (
        <div className="no-events-box">
          <p>{t('events.noResults', 'No events found matching your search or category filter.')}</p>
        </div>
      ) : (
        <div className="events-grid">
          {filteredEvents.map((evt) => {
            const title = t(`events.items.${evt.itemKey}.title`);
            const location = t(`events.items.${evt.itemKey}.location`);
            const description = t(`events.items.${evt.itemKey}.description`);

            return (
              <div className="event-card" key={evt.id}>
                <div className="card-image-wrapper">
                  <img src={evt.image} alt={title} className="card-image" />
                  <span className="category-badge">
                    {t(`events.filter${evt.category.charAt(0).toUpperCase() + evt.category.slice(1)}`, evt.category)}
                  </span>
                </div>
                <div className="card-body">
                  <h3 className="card-title">{title}</h3>
                  <p className="card-description">{description}</p>

                  <div className="card-meta">
                    <div className="meta-item">
                      <span className="meta-label">📅 {t('events.card.dateLabel', 'Date:')}</span>
                      <span className="meta-value">{evt.date}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">📍 {t('events.card.locationLabel', 'Location:')}</span>
                      <span className="meta-value">{location}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">🎟️</span>
                      <span className="meta-value highlight-seats">{evt.seatsLeft} {t('events.card.seatsLeft', 'seats remaining')}</span>
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
