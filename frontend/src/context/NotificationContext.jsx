import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 60_000; // 60 s

/**
 * NotificationProvider — polls /api/notifications for the logged-in user.
 * Exposes { notifications, unreadCount, loading, refreshNotifications, markRead, markAllRead, dismiss }.
 */
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  const refreshNotifications = useCallback(async ({ quiet = false } = {}) => {
    if (!user) return;
    if (!quiet) setLoading(true);
    try {
      const res = await axios.get('/api/notifications');
      const items = res.data.notifications || [];
      setNotifications(items);
      setUnreadCount(res.data.unreadCount ?? items.filter((n) => !n.read && !n.isRead).length);
    } catch (err) {
      if (!quiet) {
        console.warn('Notification fetch failed:', err.message);
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user]);

  // Initial load + polling
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }
    refreshNotifications();
    pollRef.current = setInterval(() => refreshNotifications({ quiet: true }), POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [user, refreshNotifications]);

  /** Mark a single notification as read (optimistic + server sync). */
  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await axios.patch(`/api/notifications/${id}/read`);
    } catch {
      // Ignore — optimistic update stays
    }
  }, []);

  /** Mark all notifications as read. */
  const markAllRead = useCallback(async () => {
    try {
      await axios.patch('/api/notifications/read-all');
    } catch {
      // Ignore
    }
    setNotifications((items) =>
      items.map((item) => ({ ...item, isRead: true, read: true, readAt: item.readAt || new Date().toISOString() }))
    );
    setUnreadCount(0);
  }, []);

  /** Remove a notification from local state. */
  const dismiss = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== id));
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
        loading,
        refreshNotifications,
        markRead,
        markAllRead,
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
      loading: false,
      refreshNotifications: async () => {},
      markRead: async () => {},
      markAllRead: async () => {},
      dismiss: async () => {},
    };
  }
  return ctx;
}

export default NotificationProvider;
