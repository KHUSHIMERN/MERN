import React, { useEffect, useRef } from 'react';
import { Bell, CheckCheck, TrendingUp, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationPanel({ open, onClose, onOpenEvent }) {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', closeOnEscape);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const openNotification = async (notification) => {
    await markRead(notification.id);
    if (notification.event) onOpenEvent?.(notification.event);
    onClose();
  };

  return (
    <aside className="notification-panel" ref={panelRef} tabIndex={-1} aria-label="Notifications">
      <div className="notification-panel-header">
        <div><h2><Bell size={20} /> Notifications</h2><span>{unreadCount} unread</span></div>
        <button type="button" onClick={onClose} aria-label="Close notifications"><X size={20} /></button>
      </div>
      {unreadCount > 0 && (
        <button type="button" className="notification-read-all" onClick={markAllRead}><CheckCheck size={16} /> Mark all as read</button>
      )}
      <div className="notification-list">
        {loading ? <p className="notification-empty">Loading notifications...</p> : notifications.length === 0 ? (
          <p className="notification-empty">You have no notifications yet.</p>
        ) : notifications.map((notification) => (
          <button
            type="button"
            key={notification.id}
            className={`notification-item ${notification.isRead ? '' : 'unread'}`}
            onClick={() => openNotification(notification)}
          >
            <span className="notification-type-icon"><TrendingUp size={18} /></span>
            <span className="notification-copy">
              <strong>{notification.type === 'promoted_from_waitlist' ? 'You are confirmed!' : 'Event update'}</strong>
              <span>{notification.payload?.message || 'There is an update to your registration.'}</span>
              {notification.event && <em>View {notification.event.title}</em>}
              <time>{new Date(notification.createdAt).toLocaleString()}</time>
            </span>
            {!notification.isRead && <span className="notification-unread-dot" aria-label="Unread" />}
          </button>
        ))}
      </div>
    </aside>
  );
}
