import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let _toastId = 0;

/**
 * ToastProvider — wraps the app and renders a portal-free toast stack.
 * Usage: const showToast = useToast();
 *        showToast('Message here', 'success' | 'error' | 'info' | 'warning');
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const colorMap = {
    success: { bg: '#10b981', icon: '✓' },
    error:   { bg: '#ef4444', icon: '✕' },
    warning: { bg: '#f59e0b', icon: '⚠' },
    info:    { bg: '#6366f1', icon: 'ℹ' },
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      {/* Toast stack — fixed overlay, no portal needed */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="false"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '360px',
            width: '100%',
          }}
        >
          {toasts.map(({ id, message, type }) => {
            const { bg, icon } = colorMap[type] || colorMap.info;
            return (
              <div
                key={id}
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: 'rgba(15, 23, 42, 0.97)',
                  border: `1px solid ${bg}`,
                  borderLeft: `4px solid ${bg}`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  animation: 'fadeInUp 0.25s ease',
                }}
              >
                <span style={{ color: bg, fontWeight: '700', flexShrink: 0 }}>{icon}</span>
                <span style={{ flex: 1 }}>{message}</span>
                <button
                  onClick={() => dismiss(id)}
                  aria-label="Dismiss notification"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '16px',
                    lineHeight: 1,
                    padding: '0 2px',
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

/**
 * useToast — returns showToast(message, type) function.
 * Falls back gracefully if called outside ToastProvider (e.g. in tests).
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  // Graceful fallback: if no provider, just log to console
  return ctx ?? ((msg, type) => console.info(`[Toast:${type}] ${msg}`));
}

export default ToastProvider;
