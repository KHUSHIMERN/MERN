import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Globe,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  Clock,
  Download,
  ClipboardCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OrganizerEventForm from './OrganizerEventForm';

export function OrganizerDashboard({ onNavigateHome, onNavigateCheckIn }) {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('list'); // 'list' | 'form'
  const [activeSubTab, setActiveSubTab] = useState('events'); // 'events' | 'analytics'
  const [eventToEdit, setEventToEdit] = useState(null);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Analytics State
  const [metricsData, setMetricsData] = useState([]);
  const [metricsSummary, setMetricsSummary] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'past' | 'upcoming'
  const [isExportingCSV, setIsExportingCSV] = useState(false);

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

  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true);
      setMetricsError(null);
      const organizerParam = user?._id || user?.id || '';
      const organizerId = organizerParam || 'all';
      const params = {};
      const now = new Date().toISOString();
      if (timeFilter === 'upcoming') {
        params.startDate = now;
      } else if (timeFilter === 'past') {
        params.endDate = now;
      }
      const res = await axios.get(`/api/events/organizer/${organizerId}/attendance-metrics`, { params });
      if (res.data && res.data.success) {
        setMetricsData(res.data.data || []);
        setMetricsSummary(res.data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching organizer metrics:', err);
      setMetricsError('Unable to load attendance analytics.');
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'analytics') {
      fetchMetrics();
    }
  }, [activeSubTab, timeFilter, user?._id]);

  const handleExportCSV = async (eventId = null) => {
    try {
      setIsExportingCSV(true);
      const organizerParam = user?._id || user?.id || '';
      const organizerId = organizerParam || 'all';
      const endpoint = eventId
        ? `/api/events/${eventId}/attendance/export`
        : `/api/events/organizer/${organizerId}/attendance-metrics/export`;
      const res = await axios.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = eventId
        ? `attendance-${eventId}.csv`
        : `attendance-metrics-${organizerId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: 'Attendance CSV report downloaded successfully.' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error('CSV export error:', err);
      setFeedback({ type: 'error', message: 'Failed to download attendance CSV report.' });
    } finally {
      setIsExportingCSV(false);
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

      {/* Sub-tab Navigation: Events Manager vs Analytics */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '14px',
        marginBottom: '1.5rem',
      }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('events')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeSubTab === 'events' ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activeSubTab === 'events' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
            color: activeSubTab === 'events' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.15s ease',
          }}
        >
          <Calendar size={16} /> Events Manager ({events.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('analytics')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeSubTab === 'analytics' ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activeSubTab === 'analytics' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
            color: activeSubTab === 'analytics' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.15s ease',
          }}
        >
          <BarChart3 size={16} /> Analytics & Attendance
        </button>
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

      {/* Events Manager SubTab View */}
      {activeSubTab === 'events' && (
        <>
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
        </>
      )}

      {/* Analytics & Attendance Dashboard SubTab View */}
      {activeSubTab === 'analytics' && (
        <div className="analytics-dashboard-container animate-fade-in">
          {/* Controls & Filter Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '14px 20px',
            marginBottom: '20px',
          }}>
            {/* Timeframe Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 600 }}>Filter Timeframe:</span>
              {[
                { id: 'all', label: 'All Events' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'past', label: 'Past Events' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeFilter(tf.id)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: timeFilter === tf.id ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: timeFilter === tf.id ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    color: timeFilter === tf.id ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Actions: Refresh & Export CSV */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={fetchMetrics}
                disabled={metricsLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} className={metricsLoading ? 'animate-spin' : ''} />
                Refresh Metrics
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV()}
                disabled={isExportingCSV || metricsData.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: isExportingCSV ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Download size={15} />
                {isExportingCSV ? 'Exporting...' : 'Export Attendance CSV'}
              </button>
            </div>
          </div>

          {/* Top KPI Metric Cards Grid */}
          {metricsSummary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '14px',
              marginBottom: '24px',
            }}>
              {/* Total Events */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#818cf8', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Events</span>
                  <Calendar size={18} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{metricsSummary.totalEvents}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Active & Completed</div>
              </div>

              {/* Total Registrations */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#34d399', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Registrations</span>
                  <Users size={18} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{metricsSummary.totalRegistrations}</div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>
                  {metricsSummary.capacityUtilization} capacity filled
                </div>
              </div>

              {/* Total Checked-In */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#60a5fa', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Checked-In</span>
                  <UserCheck size={18} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{metricsSummary.totalCheckedIn}</div>
                <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '4px' }}>
                  {metricsSummary.overallAttendanceRate} attendance rate
                </div>
              </div>

              {/* Waitlist Backlog */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fbbf24', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Waitlist</span>
                  <Clock size={18} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{metricsSummary.totalWaitlist}</div>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '4px' }}>Awaiting seats</div>
              </div>

              {/* No-Shows */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f87171', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>No-Shows</span>
                  <UserX size={18} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{metricsSummary.totalNoShow}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Past event absentees</div>
              </div>
            </div>
          )}

          {/* Metrics Table */}
          {metricsLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '16px' }}>
              <RefreshCw size={28} className="animate-spin" style={{ color: '#6366f1', marginBottom: '12px' }} />
              <p style={{ color: '#94a3b8' }}>Loading event analytics...</p>
            </div>
          ) : metricsError ? (
            <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '12px' }}>
              <AlertCircle size={28} style={{ marginBottom: '8px' }} />
              <p>{metricsError}</p>
            </div>
          ) : metricsData.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '14px', border: '1px dashed rgba(255, 255, 255, 0.15)' }}>
              <BarChart3 size={40} color="#64748b" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '6px' }}>No Attendance Metrics Yet</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>As attendees RSVP and check into your events, attendance statistics and conversion rates will appear here.</p>
            </div>
          ) : (
            <div style={{
              background: 'rgba(30, 41, 59, 0.7)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      <th style={{ padding: '16px 20px' }}>Event</th>
                      <th style={{ padding: '16px 20px' }}>Date</th>
                      <th style={{ padding: '16px 20px' }}>Capacity & Registered</th>
                      <th style={{ padding: '16px 20px' }}>Checked-In (Rate)</th>
                      <th style={{ padding: '16px 20px' }}>Waitlist</th>
                      <th style={{ padding: '16px 20px' }}>No-Show</th>
                      <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricsData.map((m) => {
                      const capacity = m.capacity || 100;
                      const confirmed = m.confirmed || 0;
                      const checkedIn = m.checkedIn || 0;
                      const fillPct = Math.min(100, Math.round((confirmed / capacity) * 100));
                      const rateVal = typeof m.attendanceRate === 'number'
                        ? (m.attendanceRate * 100).toFixed(1)
                        : m.attendanceRate === '0%'
                        ? '0.0'
                        : String(m.attendanceRate || '0.0');

                      const formattedDate = m.date || m.startDate
                        ? new Date(m.date || m.startDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'TBD';

                      return (
                        <tr
                          key={m.eventId || m.id || m._id}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* Title */}
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9375rem', marginBottom: '2px' }}>
                              {m.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              ID: {m.eventId || m.id || m._id}
                            </div>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '16px 20px', color: '#cbd5e1', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                            {formattedDate}
                          </td>

                          {/* Capacity & Progress Bar */}
                          <td style={{ padding: '16px 20px', minWidth: '160px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                              <span style={{ color: '#f8fafc' }}>{confirmed} registered</span>
                              <span style={{ color: '#94a3b8' }}>/ {capacity} cap</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${fillPct}%`,
                                  height: '100%',
                                  background: fillPct >= 90 ? '#ef4444' : fillPct >= 70 ? '#f59e0b' : '#10b981',
                                  borderRadius: '3px',
                                }}
                              />
                            </div>
                          </td>

                          {/* Checked-In (Attendance Rate) */}
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9375rem' }}>
                                {checkedIn}
                              </span>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: Number(rateVal) >= 70 ? 'rgba(16, 185, 129, 0.15)' : Number(rateVal) >= 40 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                color: Number(rateVal) >= 70 ? '#34d399' : Number(rateVal) >= 40 ? '#60a5fa' : '#facc15',
                                border: `1px solid ${Number(rateVal) >= 70 ? 'rgba(16, 185, 129, 0.3)' : Number(rateVal) >= 40 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                              }}>
                                {rateVal}%
                              </span>
                            </div>
                          </td>

                          {/* Waitlist */}
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              color: m.waitlist > 0 ? '#fbbf24' : '#94a3b8',
                            }}>
                              {m.waitlist}
                            </span>
                          </td>

                          {/* No-Shows */}
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              color: m.noShow > 0 ? '#f87171' : '#94a3b8',
                            }}>
                              {m.noShow}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => onNavigateCheckIn?.(m.eventId || m.id || m._id)}
                                title="Open Attendee Check-In Desk"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  background: 'rgba(99, 102, 241, 0.15)',
                                  border: '1px solid rgba(99, 102, 241, 0.3)',
                                  borderRadius: '6px',
                                  color: '#818cf8',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <ClipboardCheck size={13} /> Check-In Desk
                              </button>

                              <button
                                type="button"
                                onClick={() => handleExportCSV(m.eventId || m.id || m._id)}
                                title="Download Event Attendance CSV"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '6px 8px',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  borderRadius: '6px',
                                  color: '#cbd5e1',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                }}
                              >
                                <Download size={13} />
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