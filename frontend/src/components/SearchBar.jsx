import React from 'react';
import { useTranslation } from 'react-i18next';

export function SearchBar({ searchTerm, setSearchTerm, onSearch, onClear, placeholder }) {
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeof onSearch === 'function') {
      onSearch(searchTerm);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    if (typeof onClear === 'function') {
      onClear();
    }
  };

  return (
    <form className="search-bar-form" onSubmit={handleSubmit} role="search">
      <div className="search-input-wrapper">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder={placeholder || t('events.searchPlaceholder', 'Search events by title, city, or category...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search events"
        />
        {searchTerm && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={handleClear}
            aria-label="Clear search input"
          >
            ✕
          </button>
        )}
      </div>
      <button type="submit" className="search-submit-btn" aria-label="Submit search query">
        🔍 {t('events.searchBtn', 'Search')}
      </button>
    </form>
  );
}

export default SearchBar;
