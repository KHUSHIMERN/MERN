import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Search, X, Loader2, Calendar, Tag, Sparkles } from 'lucide-react';
import './Typeahead.css';

/**
 * Typeahead Autocomplete Component
 * 
 * Features:
 * - 200-300ms configurable debounce (default 250ms)
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Categorized suggestions with type labels (title / tag)
 * - Language badge display (EN, ES, etc.)
 * - Telemetry analytics logging for impressions and clicks
 */
export default function Typeahead({
  apiBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:5000/api',
  placeholder = 'Search events by title or tags (e.g. react, design)...',
  debounceMs = 200,
  language = '',
  onSelect = () => {},
  onSearch = () => {},
  className = ''
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastLoggedImpressionRef = useRef('');

  // Log analytics helper
  const logAnalytics = useCallback(async (payload) => {
    try {
      await axios.post(`${apiBaseUrl}/events/suggest/analytics`, payload);
    } catch (err) {
      // Telemetry error silently caught to not disrupt user experience
      console.debug('Telemetry logging notice:', err.message);
    }
  }, [apiBaseUrl]);

  // Fetch suggestions with abort handling
  const fetchSuggestions = useCallback(async (searchTerm) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    try {
      const res = await axios.get(`${apiBaseUrl}/events/suggest`, {
        params: { 
          q: trimmed,
          ...(language ? { lang: language } : {})
        },
        signal: abortController.signal
      });

      const items = res.data?.suggestions || [];
      setSuggestions(items);
      setSelectedIndex(-1);
      setIsOpen(true);
      setIsLoading(false);

      // Log impression analytics if suggestions exist and not previously logged for this exact query
      if (items.length > 0 && lastLoggedImpressionRef.current !== trimmed.toLowerCase()) {
        lastLoggedImpressionRef.current = trimmed.toLowerCase();
        logAnalytics({
          eventType: 'impression',
          query: trimmed,
          suggestions: items
        });
      }
    } catch (error) {
      if (!axios.isCancel(error) && error.name !== 'CanceledError') {
        console.error('Typeahead suggest error:', error);
        setIsLoading(false);
      }
    }
  }, [apiBaseUrl, language, logAnalytics]);

  // Debounced input change handler
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, debounceMs);
  };

  // Select suggestion item
  const handleSelectSuggestion = (suggestion) => {
    setQuery(suggestion.text);
    setIsOpen(false);
    setSelectedIndex(-1);

    // Record click analytics
    logAnalytics({
      eventType: 'click',
      query,
      suggestion
    });

    onSelect(suggestion);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen && e.key === 'ArrowDown') {
      if (suggestions.length > 0) {
        setIsOpen(true);
        setSelectedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else if (query.trim()) {
          setIsOpen(false);
          onSearch(query.trim());
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;

      case 'Tab':
        setIsOpen(false);
        break;

      default:
        break;
    }
  };

  // Clear query button
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    lastLoggedImpressionRef.current = '';
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    inputRef.current?.focus();
    onSearch('');
  };

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return (
    <div className={`typeahead-container ${className}`} ref={containerRef}>
      <div className="typeahead-input-wrapper">
        <Search className="typeahead-search-icon" size={18} />
        <input
          ref={inputRef}
          type="text"
          className="typeahead-input"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-label="Search events"
        />

        <div className="typeahead-actions">
          {isLoading && <Loader2 className="typeahead-spinner" size={16} />}
          {query && (
            <button
              type="button"
              className="typeahead-clear-btn"
              onClick={handleClear}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="typeahead-dropdown" role="listbox">
          <div className="typeahead-header">
            <span>Suggestions ({suggestions.length})</span>
            <span>Navigate with ↑ ↓</span>
          </div>

          {suggestions.length === 0 ? (
            <div className="typeahead-empty">
              No matching events or tags found for "{query}"
            </div>
          ) : (
            <ul className="typeahead-list">
              {suggestions.map((item, index) => {
                const isSelected = index === selectedIndex;
                const isTitle = item.type === 'title';
                const lang = (item.language || 'en').toUpperCase();

                return (
                  <li
                    key={item.id || `${item.type}-${item.text}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`typeahead-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="typeahead-item-main">
                      <span className="typeahead-item-icon">
                        {isTitle ? <Calendar size={15} /> : <Tag size={15} />}
                      </span>
                      <span className="typeahead-item-text">{item.text}</span>
                    </div>

                    <div className="typeahead-item-badges">
                      {/* Popularity metric if available */}
                      {typeof item.popularity === 'number' && item.popularity > 0 && (
                        <span className="badge-popularity" title={`${item.popularity} confirmed RSVPs`}>
                          <Sparkles size={11} /> {item.popularity}
                        </span>
                      )}

                      {/* Type Label Badge */}
                      <span className={`typeahead-badge ${isTitle ? 'badge-type-title' : 'badge-type-tag'}`}>
                        {isTitle ? 'Title' : 'Tag'}
                      </span>

                      {/* Language Badge */}
                      <span className="typeahead-badge badge-language">
                        {lang}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="typeahead-footer">
            <span className="typeahead-footer-hint">
              <kbd className="typeahead-kbd">Enter</kbd> to select
            </span>
            <span className="typeahead-footer-hint">
              <kbd className="typeahead-kbd">Esc</kbd> to dismiss
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
