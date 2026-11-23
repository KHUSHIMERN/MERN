import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  MapPin,
  Navigation,
  Compass,
  Sliders,
  Filter,
  Search,
  Calendar,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Layers,
  Map as MapIcon,
  CheckCircle,
} from 'lucide-react';

const CATEGORY_COLORS = {
  tech: '#6366f1',
  technology: '#6366f1',
  culture: '#ec4899',
  cultural: '#ec4899',
  workshop: '#10b981',
  skills: '#10b981',
  charity: '#f59e0b',
  civic: '#f59e0b',
  health: '#06b6d4',
  career: '#8b5cf6',
  default: '#6366f1',
};

const getCategoryColor = (category = '') => {
  const cat = String(category).toLowerCase();
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (cat.includes(key)) return color;
  }
  return CATEGORY_COLORS.default;
};

// Create SVG-based custom div icon to avoid asset-bundling 404s
const createCustomMarkerIcon = (category, isSelected = false) => {
  const color = getCategoryColor(category);
  const size = isSelected ? 40 : 32;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
      <circle cx="16" cy="14" r="12" fill="${color}" stroke="#ffffff" stroke-width="2.5" filter="url(#shadow)"/>
      <circle cx="16" cy="14" r="5" fill="#ffffff"/>
      <path d="M16 26 L12 20 L20 20 Z" fill="${color}"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-map-marker-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 4],
    popupAnchor: [0, -size + 4],
  });
};

const createUserLocationIcon = () => {
  const svg = `
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17" cy="17" r="14" fill="#3b82f6" fill-opacity="0.3"/>
      <circle cx="17" cy="17" r="8" fill="#3b82f6" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="17" cy="17" r="3" fill="#ffffff"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-user-location-pin',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};

export default function NearbyEventsMap({ onSelectEvent, onRsvpChanged }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const showToast = useToast();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userCircleRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [cityPresets, setCityPresets] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Filter States
  const [userLocation, setUserLocation] = useState(null); // { lat, lng, name }
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState(''); // informative message
  const [radiusKm, setRadiusKm] = useState(50);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Bengaluru');

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Default center at Bengaluru
    const defaultLat = 12.9716;
    const defaultLng = 77.5946;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch Nearby Events
  const fetchNearbyEvents = async (opts = {}) => {
    setLoading(true);
    try {
      const params = {};
      const targetRadius = opts.radius !== undefined ? opts.radius : radiusKm;
      const targetCat = opts.category !== undefined ? opts.category : selectedCategory;
      const targetLoc = opts.loc !== undefined ? opts.loc : userLocation;
      const targetCity = opts.city !== undefined ? opts.city : selectedCity;

      if (targetLoc && targetLoc.lat && targetLoc.lng) {
        params.lat = targetLoc.lat;
        params.lng = targetLoc.lng;
        params.radiusKm = targetRadius;
      } else if (targetCity && targetCity !== 'all') {
        params.city = targetCity;
        params.radiusKm = targetRadius;
      }

      if (targetCat && targetCat !== 'all') {
        params.category = targetCat;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await axios.get('/api/events/nearby', { params });
      if (res.data && res.data.success) {
        setEvents(res.data.events || []);
        if (res.data.cityPresets && res.data.cityPresets.length > 0) {
          setCityPresets(res.data.cityPresets);
        }
      }
    } catch (err) {
      console.error('Error fetching nearby events:', err);
      showToast('Could not load nearby events.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount & whenever parameters change
  useEffect(() => {
    fetchNearbyEvents();
  }, [userLocation, selectedCity, radiusKm, selectedCategory]);

  // Update Leaflet markers when events or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Draw User Location & Radius Circle if active
    if (userCircleRef.current) {
      userCircleRef.current.remove();
      userCircleRef.current = null;
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    const activeCenter = userLocation || (cityPresets.find((c) => c.name.toLowerCase() === selectedCity?.toLowerCase()));
    if (activeCenter && activeCenter.lat && activeCenter.lng) {
      // User/Center Pin
      const userMarker = L.marker([activeCenter.lat, activeCenter.lng], {
        icon: createUserLocationIcon(),
        zIndexOffset: 1000,
      }).addTo(map);
      userMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
          <strong>📍 Your Active Center</strong><br/>
          <span>${activeCenter.name || selectedCity || 'Active Location'}</span><br/>
          <small style="color: #64748b;">Search Radius: ${radiusKm} km</small>
        </div>
      `);
      userMarkerRef.current = userMarker;

      // Radius Circle
      const circle = L.circle([activeCenter.lat, activeCenter.lng], {
        radius: radiusKm * 1000, // km to meters
        color: '#6366f1',
        weight: 1.5,
        fillColor: '#6366f1',
        fillOpacity: 0.08,
        dashArray: '4, 4',
      }).addTo(map);
      userCircleRef.current = circle;
    }

    // 2. Add Event Markers
    const bounds = [];
    if (activeCenter && activeCenter.lat && activeCenter.lng) {
      bounds.push([activeCenter.lat, activeCenter.lng]);
    }

    events.forEach((evt) => {
      const coords = evt.coordinates || (evt.location && evt.location.latitude && {
        lat: evt.location.latitude,
        lng: evt.location.longitude,
      });

      if (!coords || !coords.lat || !coords.lng) return;

      const isSelected = selectedEventId === (evt.id || evt._id);
      const marker = L.marker([coords.lat, coords.lng], {
        icon: createCustomMarkerIcon(evt.category, isSelected),
        zIndexOffset: isSelected ? 500 : 100,
      });

      const dateStr = evt.startDate
        ? new Date(evt.startDate).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        : '';
      const timeStr = evt.startDate
        ? new Date(evt.startDate).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      const distanceBadge = evt.distanceFormatted
        ? `<span style="background: rgba(99, 102, 241, 0.15); color: #818cf8; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 12px; display: inline-block; margin-bottom: 6px;">📍 ${evt.distanceFormatted}</span>`
        : '';

      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; max-width: 260px; line-height: 1.4; color: #1e293b;">
          ${distanceBadge}
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #0f172a;">${evt.title}</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">📅 ${dateStr} at ${timeStr}</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">🏢 ${coords.placeName || evt.city || 'Event Venue'}</div>
          <button
            id="popup-btn-${evt.id || evt._id}"
            style="width: 100%; padding: 6px 10px; background: #6366f1; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;"
          >
            View Event & RSVP
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-${evt.id || evt._id}`);
        if (btn) {
          btn.onclick = () => onSelectEvent?.(evt);
        }
      });

      marker.on('click', () => {
        setSelectedEventId(evt.id || evt._id);
      });

      markersGroup.addLayer(marker);
      bounds.push([coords.lat, coords.lng]);
    });

    // Fit Map to bounds nicely if events or center exist
    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch {
        // Safe fallback
      }
    }
  }, [events, selectedEventId, userLocation, selectedCity, radiusKm]);

  // Handle "Use My Location" via Browser Geolocation API
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setIsDetectingLocation(true);
    setLocationStatus('Detecting your GPS location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng, name: 'Current Location' });
        setSelectedCity('');
        setIsDetectingLocation(false);
        setLocationStatus(`GPS Location detected: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        showToast('Location detected successfully!', 'success');

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 12);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        let msg = 'Could not retrieve GPS location. Please select a city preset.';
        if (err.code === 1) msg = 'Location permission was denied. Select a city preset below.';
        setLocationStatus(msg);
        showToast(msg, 'warning');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectCity = (cityName) => {
    setSelectedCity(cityName);
    setUserLocation(null);
    setLocationStatus(`Viewing events in ${cityName}`);
    const found = cityPresets.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    if (found && mapInstanceRef.current) {
      mapInstanceRef.current.setView([found.lat, found.lng], 12);
    }
  };

  const handleSelectCard = (evt) => {
    setSelectedEventId(evt.id || evt._id);
    const coords = evt.coordinates || (evt.location && evt.location.latitude && {
      lat: evt.location.latitude,
      lng: evt.location.longitude,
    });
    if (coords && coords.lat && coords.lng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 14, { duration: 0.8 });
    }
  };

  const defaultCities = [
    { name: 'Bengaluru', label: 'Bengaluru' },
    { name: 'Mysuru', label: 'Mysuru' },
    { name: 'Jaipur', label: 'Jaipur' },
    { name: 'Patna', label: 'Patna' },
    { name: 'Bhopal', label: 'Bhopal' },
    { name: 'Chikkaballapur', label: 'Chikkaballapur' },
  ];

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'tech', label: 'Tech & AI' },
    { id: 'culture', label: 'Culture & Arts' },
    { id: 'workshop', label: 'Workshops' },
    { id: 'charity', label: 'Community & Charity' },
    { id: 'health', label: 'Health & Sports' },
  ];

  const radiusOptions = [5, 10, 25, 50, 100, 250];

  return (
    <section
      className="nearby-events-map-section"
      style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '24px 16px',
        color: '#f8fafc',
      }}
      aria-label="Nearby Events Map"
    >
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                background: '#6366f1',
                borderRadius: '10px',
                padding: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={22} color="#ffffff" />
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Nearby Events Map
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                padding: '3px 10px',
                borderRadius: '12px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              Geospatial Discovery
            </span>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9375rem', maxWidth: '680px' }}>
            Explore community events happening near you on an interactive map. Adjust your search radius,
            detect your location, or switch cities to discover workshops, festivals, and meetups.
          </p>
        </div>

        {/* Location Detection Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isDetectingLocation}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: userLocation ? '#3b82f6' : 'rgba(99, 102, 241, 0.2)',
              color: '#ffffff',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: isDetectingLocation ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Navigation size={16} className={isDetectingLocation ? 'animate-spin' : ''} />
            {isDetectingLocation
              ? 'Detecting GPS...'
              : userLocation
              ? '📍 Location Detected'
              : 'Use My Location'}
          </button>
        </div>
      </div>

      {/* Control Panel: City Presets & Distance Radius */}
      <div
        style={{
          background: '#131b2e',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* City Selector */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginRight: '6px' }}>
            Quick City Presets:
          </span>
          {defaultCities.map((city) => {
            const isSelected = !userLocation && selectedCity?.toLowerCase() === city.name.toLowerCase();
            return (
              <button
                key={city.name}
                type="button"
                onClick={() => handleSelectCity(city.name)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : '#cbd5e1',
                  transition: 'all 0.15s ease',
                }}
              >
                {city.label}
              </button>
            );
          })}
        </div>

        {/* Distance Radius & Category Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            paddingTop: '12px',
          }}
        >
          {/* Radius selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sliders size={14} /> Distance Radius:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {radiusOptions.map((r) => {
                const isSelected = radiusKm === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadiusKm(r)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? '#a5b4fc' : '#94a3b8',
                    }}
                  >
                    {r} km
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} color="#94a3b8" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter events by category"
              style={{
                background: '#0f172a',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Content: Map (Left) & Event Cards (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
        className="nearby-map-split-container"
      >
        {/* Map Container */}
        <div
          style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
            height: '620px',
            background: '#0f172a',
          }}
        >
          <div
            ref={mapContainerRef}
            style={{ width: '100%', height: '100%', zIndex: 1 }}
            tabIndex={0}
            aria-label="Interactive OpenStreetMap for nearby events"
          />

          {/* Map Overlay Badge */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.75rem',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              pointerEvents: 'none',
            }}
          >
            <MapIcon size={13} color="#818cf8" />
            <span>OpenStreetMap</span> • <span>{events.length} Events on Map</span>
          </div>

          {/* Category Color Legend */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '0.6875rem',
              color: '#94a3b8',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} /> Tech
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ec4899' }} /> Culture
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Workshop
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> Charity
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} /> You
            </span>
          </div>
        </div>

        {/* Nearby Events List (Side Panel) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '620px',
            overflowY: 'auto',
            paddingRight: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Nearby Events ({events.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
              Within {radiusKm} km • Closest first
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.875rem' }}>Loading nearby events...</p>
            </div>
          ) : events.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: '#131b2e',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.15)',
              }}
            >
              <AlertCircle size={32} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '6px' }}>
                No events found within {radiusKm} km
              </h4>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '16px' }}>
                Try expanding the distance radius to 100 km or select another city above.
              </p>
              <button
                type="button"
                onClick={() => setRadiusKm(100)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Expand to 100 km
              </button>
            </div>
          ) : (
            events.map((evt) => {
              const isSelected = selectedEventId === (evt.id || evt._id);
              const color = getCategoryColor(evt.category);
              const dateStr = evt.startDate
                ? new Date(evt.startDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : '';
              const timeStr = evt.startDate
                ? new Date(evt.startDate).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div
                  key={evt.id || evt._id}
                  onClick={() => handleSelectCard(evt)}
                  style={{
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : '#131b2e',
                    border: isSelected ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 16px rgba(99, 102, 241, 0.25)' : 'none',
                  }}
                >
                  {/* Top Row: Distance Chip & Category */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color,
                        background: `${color}18`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {evt.category || 'General'}
                    </span>

                    {evt.distanceFormatted && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#818cf8',
                          background: 'rgba(99, 102, 241, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <MapPin size={11} /> {evt.distanceFormatted}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      margin: '0 0 8px 0',
                      color: '#f8fafc',
                      lineHeight: 1.3,
                    }}
                  >
                    {evt.title}
                  </h4>

                  {/* Metadata */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={12} color="#818cf8" />
                      <span>{dateStr} at {timeStr}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={12} color="#818cf8" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {evt.coordinates?.placeName || evt.location?.placeName || evt.city || 'Event Venue'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      paddingTop: '8px',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: evt.isFree ? '#10b981' : '#cbd5e1', fontWeight: 600 }}>
                      {evt.isFree ? 'Free Admission' : 'Community Event'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent?.(evt);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        background: '#6366f1',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <ExternalLink size={12} />
                      View & RSVP
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
