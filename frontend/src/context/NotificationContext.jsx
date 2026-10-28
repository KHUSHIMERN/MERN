import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 60_000; // 60 s

/**
 * NotificationProvider — polls /api/notifications for the logged-in user.
 * Exposes { notifications, unreadCount, refreshNotifications, markRead, dismiss }.
 */
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  const fetchNotifications = useCallback(async (opts = {}) => {
    if (!user) return;
    try {
      const res = await axios.get('/api/notifications');
      const items = res.data.notifications || [];
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read).length);
    } catch (err) {
      // Silent fail — notifications are non-critical
      if (!opts.quiet) {
        console.warn('Notification fetch failed:', err.message);
      }
    }
  }, [user]);

  // Initial load + polling
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
    pollRef.current = setInterval(() => fetchNotifications({ quiet: true }), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [user, fetchNotifications]);

  /** Mark a single notification as read (optimistic + server sync). */
  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await axios.patch(`/api/notifications/${id}/read`);
    } catch {
      // Ignore — optimistic update stays
    }
  }, []);

  /** Remove a notification from local state. */
  const dismiss = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await axios.delete(`/api/notifications/${id}`);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications: fetchNotifications,
        markRead,
        dismiss,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/** useNotifications — consume the NotificationContext. */
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // Graceful fallback outside provider (e.g. unit tests / Storybook)
    return {
      notifications: [],
      unreadCount: 0,
      refreshNotifications: async () => {},
      markRead: async () => {},
      dismiss: async () => {},
    };
  }
  return ctx;
}

export default NotificationProvider;
