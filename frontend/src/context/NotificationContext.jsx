import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshNotifications = useCallback(async ({ quiet = false } = {}) => {
    if (!user) return;
    if (!quiet) setLoading(true);
    try {
      const response = await axios.get('/api/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      if (!quiet) console.warn('Unable to load notifications:', error.response?.data?.message || error.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }
    refreshNotifications();
    const interval = setInterval(() => refreshNotifications({ quiet: true }), 30000);
    return () => clearInterval(interval);
  }, [user, refreshNotifications]);

  const markRead = async (id) => {
    const current = notifications.find((item) => item.id === id);
    if (!current?.isRead) await axios.patch(`/api/notifications/${id}/read`);
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item));
    setUnreadCount((count) => Math.max(0, count - (current?.isRead ? 0 : 1)));
  };

  const markAllRead = async () => {
    await axios.patch('/api/notifications/read-all');
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, refreshNotifications, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}
