import React, { createContext, useContext, useState, useEffect } from 'react';
import authenticatedFetch from '../utils/authenticatedFetch';
import { useAuth } from './AuthContext';
import { getUserBrowserTimezone, getUserBrowserLocale } from '../utils/dateUtils';

const TimezoneContext = createContext();

const STORAGE_KEY = 'user_timezone_override';

export function TimezoneProvider({ children }) {
  const { user } = useAuth();
  const detectedTimezone = getUserBrowserTimezone();
  const userLocale = getUserBrowserLocale();

  const [overrideTimezone, setOverrideTimezoneState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch (e) {
      return null;
    }
  });

  const activeTimezone = overrideTimezone || detectedTimezone;
  const isOverridden = Boolean(overrideTimezone);

  // Sync preference with user profile API on load if available
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!user) return;
        const res = await authenticatedFetch('/api/users/me');
        if (res.ok) {
          const json = await res.json();
          if (json.user?.preferredTimezone) {
            setOverrideTimezoneState(json.user.preferredTimezone);
            localStorage.setItem(STORAGE_KEY, json.user.preferredTimezone);
          }
        }
      } catch (e) {
        // Fall back to localStorage for anonymous/guest users
      }
    };

    fetchUserProfile();
  }, [user]);

  const setManualTimezone = async (tz) => {
    if (!tz || tz === detectedTimezone) {
      resetToDetectedTimezone();
      return;
    }

    try {
      // Save locally for guests
      localStorage.setItem(STORAGE_KEY, tz);
      setOverrideTimezoneState(tz);

      // Save to profile API
      if (user) await authenticatedFetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredTimezone: tz })
      });
    } catch (e) {
      console.warn('Failed to sync timezone with backend profile:', e.message);
    }
  };

  const resetToDetectedTimezone = async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setOverrideTimezoneState(null);

      if (user) await authenticatedFetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredTimezone: null })
      });
    } catch (e) {
      console.warn('Failed to reset timezone in backend profile:', e.message);
    }
  };

  return (
    <TimezoneContext.Provider
      value={{
        detectedTimezone,
        overrideTimezone,
        activeTimezone,
        isOverridden,
        userLocale,
        setManualTimezone,
        resetToDetectedTimezone
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}
