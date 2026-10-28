import React, { useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, ExternalLink } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

/**
 * NotificationPanel — slide-in drawer shown when the bell icon is clicked.
 *
 * Props:
 *   open            {boolean}  - Whether the panel is visible
 *   onClose         {function} - Called to close the panel
 *   onOpenEvent     {function} - Called with an event object when user clicks a notification
 */
function NotificationPanel({ open, onClose, onOpenEvent }) {
  const { notifications, markRead, dismiss, refreshNotifications } = useNotifications();
  const panelRef = useRef(null);

  // Refresh when opening
  useEffect(() => {
    if (open) {
      refreshNotifications({ quiet: true });
    }
  }, [open, refreshNotifications]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    // Defer so the click that opened the panel doesn't immediately close it
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleNotifClick = async (notif) => {
    if (!notif.read) await markRead(notif._id);
    if (notif.eventId && onOpenEvent) {
      onOpenEvent(notif.eventId);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 1200,
          backdropFilter: 'blur(2px)',
        }}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100dvh',
          width: '100%',
          maxWidth: '380px',
          background: '#1e293b',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          zIndex: 1201,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.22s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: '700', fontSize: '16px' }}>
            <Bell size={20} color="#6366f1" />
            Notifications
          </div>
          <button
            onClick={onClose}
            aria-label="Close notifications"
            style={{
              background: 'none', border: 'none', color: '#94a3b8',
              cursor: 'pointer', padding: '4px', borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {notifications.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '200px', color: '#475569', gap: '10px',
            }}>
              <Bell size={36} strokeWidth={1.2} />
              <p style={{ fontSize: '14px' }}>No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif._id || notif.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: notif.read ? 'transparent' : 'rgba(99,102,241,0.07)',
                  cursor: notif.eventId ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
                onClick={() => handleNotifClick(notif)}
              >
                {/* Unread dot */}
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, marginTop: '5px',
                  background: notif.read ? 'transparent' : '#6366f1',
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {notif.title && (
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', marginBottom: '2px' }}>
                      {notif.title}
                    </p>
                  )}
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
                    {notif.message || notif.body || 'New notification'}
                  </p>
                  {notif.createdAt && (
                    <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {!notif.read && (
                    <button
                      aria-label="Mark as read"
                      onClick={(e) => { e.stopPropagation(); markRead(notif._id); }}
                      style={{
                        background: 'none', border: 'none', color: '#6366f1',
                        cursor: 'pointer', padding: '4px', borderRadius: '4px',
                      }}
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {notif.eventId && (
                    <button
                      aria-label="Open event"
                      onClick={(e) => { e.stopPropagation(); handleNotifClick(notif); }}
                      style={{
                        background: 'none', border: 'none', color: '#38bdf8',
                        cursor: 'pointer', padding: '4px', borderRadius: '4px',
                      }}
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                  <button
                    aria-label="Dismiss notification"
                    onClick={(e) => { e.stopPropagation(); dismiss(notif._id); }}
                    style={{
                      background: 'none', border: 'none', color: '#ef4444',
                      cursor: 'pointer', padding: '4px', borderRadius: '4px',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default NotificationPanel;
