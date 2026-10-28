import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Plus, Edit2, Trash2, Globe, EyeOff, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OrganizerEventForm from './OrganizerEventForm';

export function OrganizerDashboard({ onNavigateHome }) {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('list'); // 'list' | 'form'
  const [eventToEdit, setEventToEdit] = useState(null);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, event: null });

  useEffect(() => {
    fetchOrganizerEvents();
  }, [user]);

  const fetchOrganizerEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query organizer events
      const organizerParam = user?._id || user?.id || '';
      const params = organizerParam ? { organizerId: organizerParam } : {};
      const res = await axios.get('/api/events', { params });

      let list = res.data?.events || res.data?.data || (Array.isArray(res.data) ? res.data : []);

      // If user is logged in, filter events created by this organizer or show list
      if (user && user._id) {
        const userMatches = list.filter(
          (e) =>
            String(e.organizerId) === String(user._id) ||
            String(e.organizer) === String(user._id) ||
            String(e.organizerName || '').toLowerCase() === String(user.name || '').toLowerCase()
        );
        // If specific matches exist, show them; otherwise fallback to list
        if (userMatches.length > 0) {
          list = userMatches;
        }
      }

      setEvents(list);
    } catch (err) {
      console.error('Error fetching organizer events:', err);
      setError('Unable to load organizer events from server.');
    } finally {
      setLoading(false);
    }
  };

  // Toggling Publish/Unpublish calls PATCH /api/events/:id/publish and updates row state without a full reload
  const handleTogglePublish = async (evt) => {
    const eventId = evt._id || evt.id;
    try {
      setActionLoadingId(eventId);
      const res = await axios.patch(`/api/events/${eventId}/publish`);
      const newStatus =
        res.data?.published !== undefined
          ? res.data.published
          : !Boolean(evt.published);

      setEvents((prev) =>
        prev.map((e) =>
          (e._id === eventId || e.id === eventId)
            ? { ...e, published: newStatus }
            : e
        )
      );

      setFeedback({
        type: 'success',
        message: `Event "${evt.title}" is now ${newStatus ? 'Published' : 'Draft (Unpublished)'}.`
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('Error toggling publish state:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update publication status.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete prompts a confirmation modal
  const handlePromptDelete = (evt) => {
    setDeleteModal({ isOpen: true, event: evt });
  };

  // On confirm calls DELETE /api/events/:id and removes the row from the UI
  const handleConfirmDelete = async () => {
    if (!deleteModal.event) return;
    const evt = deleteModal.event;
    const eventId = evt._id || evt.id;

    try {
      setActionLoadingId(eventId);
      await axios.delete(`/api/events/${eventId}`);

      setEvents((prev) => prev.filter((e) => e._id !== eventId && e.id !== eventId));
      setDeleteModal({ isOpen: false, event: null });

      setFeedback({
        type: 'success',
        message: `Event "${evt.title}" was permanently deleted.`
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('Error deleting event:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete event.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Edit button navigates to the Organizer Event Creation & Edit Form with the selected event loaded
  const handleOpenEdit = (evt) => {
    setEventToEdit(evt);
    setCurrentView('form');
  };

  const handleOpenCreate = () => {
    setEventToEdit(null);
    setCurrentView('form');
  };

  const handleFormSuccess = (savedEvent, isEdit) => {
    setFeedback({
      type: 'success',
      message: `Event "${savedEvent.title}" was successfully ${isEdit ? 'updated' : 'created'}!`
    });
    setTimeout(() => setFeedback(null), 4000);
    setCurrentView('list');
    fetchOrganizerEvents();
  };

  if (currentView === 'form') {
    return (
      <div className="main-content">
        <OrganizerEventForm
          eventToEdit={eventToEdit}
          onSaveSuccess={handleFormSuccess}
          onCancel={() => setCurrentView('list')}
        />
      </div>
    );
  }

  return (
    <div className="main-content animate-fade-in">
      {/* Dashboard Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            📋 Organizer Event Dashboard
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '6px 0 0' }}>
            Manage drafts, publish status, schedule updates, and registrations for your events.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchOrganizerEvents}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Plus size={18} /> New Event
          </button>
        </div>
      </div>

      {/* Dynamic Feedback Notification Toast */}
      {feedback && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          color: feedback.type === 'success' ? '#34d399' : '#fca5a5',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '1.5rem',
          fontWeight: 600
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Loading & Error States */}
      {loading ? (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <RefreshCw size={28} className="animate-spin" style={{ color: '#6366f1', marginBottom: '12px' }} />
          <p style={{ color: '#94a3b8' }}>Loading organizer events...</p>
        </div>
      ) : error ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '16px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171'
        }}>
          <AlertCircle size={32} style={{ marginBottom: '10px' }} />
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchOrganizerEvents}
            style={{
              marginTop: '12px',
              padding: '8px 18px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <Calendar size={48} style={{ color: '#64748b', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '8px' }}>
            No Events Found in Dashboard
          </h3>
          <p style={{ color: '#94a3b8', maxWidth: '420px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
            You haven't created any events yet, or you don't have events registered under your organizer profile.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              padding: '10px 22px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + Create Your First Event
          </button>
        </div>
      ) : (
        /* Organizer Events Table UI */
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Event Title</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Start Date</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Category</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const eventId = evt._id || evt.id;
                  const isPublished = Boolean(evt.published);
                  const isBusy = actionLoadingId === eventId;

                  const formattedDate = evt.startDate
                    ? new Date(evt.startDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : evt.date || 'TBD';

                  return (
                    <tr
                      key={eventId}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Title & Location Column */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem', marginBottom: '2px' }}>
                          {evt.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          📍 {typeof evt.location === 'object' && evt.location !== null
                            ? (evt.location.placeName || evt.city || 'Online')
                            : (evt.location || evt.city || 'Online')}
                        </div>
                      </td>

                      {/* Start Date Column */}
                      <td style={{ padding: '16px 20px', color: '#cbd5e1', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        📅 {formattedDate}
                      </td>

                      {/* Category Column */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#a5b4fc',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}>
                          {evt.category || 'General'}
                        </span>
                      </td>

                      {/* Published Status Column */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: isPublished ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: isPublished ? '#34d399' : '#facc15',
                          border: `1px solid ${isPublished ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isPublished ? '#34d399' : '#facc15'
                          }} />
                          {isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>

                      {/* Action Buttons Column */}
                      <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(evt)}
                            disabled={isBusy}
                            title="Edit Event"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '6px',
                              color: '#cbd5e1',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={13} /> Edit
                          </button>

                          {/* Publish / Unpublish Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(evt)}
                            disabled={isBusy}
                            title={isPublished ? 'Unpublish Event (set to draft)' : 'Publish Event'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              background: isPublished ? 'rgba(234, 179, 8, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              border: `1px solid ${isPublished ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                              borderRadius: '6px',
                              color: isPublished ? '#facc15' : '#34d399',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: isBusy ? 'wait' : 'pointer',
                              opacity: isBusy ? 0.6 : 1
                            }}
                          >
                            {isPublished ? <EyeOff size={13} /> : <Globe size={13} />}
                            {isPublished ? 'Unpublish' : 'Publish'}
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handlePromptDelete(evt)}
                            disabled={isBusy}
                            title="Delete Event"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                              color: '#f87171',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: isBusy ? 'wait' : 'pointer'
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.event && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(11, 15, 25, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <Trash2 size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Confirm Event Deletion
              </h3>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 20px' }}>
              Are you sure you want to permanently delete event <strong>"{deleteModal.event.title}"</strong>? This action cannot be undone and will remove it from resident discovery.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, event: null })}
                style={{
                  padding: '9px 18px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoadingId != null}
                style={{
                  padding: '9px 20px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                }}
              >
                {actionLoadingId != null ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizerDashboard;