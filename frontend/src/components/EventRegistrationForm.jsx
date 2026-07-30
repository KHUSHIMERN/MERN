import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { hasActiveRsvp, isEventFull, rsvpStatus, rsvpStatusLabel } from '../utils/rsvpState';
import { CheckCircle, ShieldAlert } from 'lucide-react';

export function EventRegistrationForm({ selectedEvent, onClose, onNavigateProfile, onRsvpChanged, onRequireLogin }) {
  const { t } = useTranslation();
  const { user, fetchProfile } = useAuth();
  const showToast = useToast();
  const { refreshNotifications } = useNotifications();
  const [eventState, setEventState] = useState(selectedEvent);

  const isCreateMode = !selectedEvent;
  const isOrganizerOrAdmin = user && (user.role === 'organizer' || user.role === 'admin');

  // Event Creation Form State (for organizers/admins)
  const [createData, setCreateData] = useState({
    title: '',
    description: '',
    category: 'Career & Jobs',
    city: user?.city || 'Indore',
    tier: 'Tier 2',
    location: '',
    date: '',
    time: '10:00 AM - 04:00 PM',
    capacity: 100,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  });

  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setEventState(selectedEvent);
    const eventId = selectedEvent?._id || selectedEvent?.id;
    if (!eventId) return;
    axios.get(`/api/events/${eventId}`)
      .then((response) => setEventState(response.data.data || response.data))
      .catch((error) => showToast(error.response?.data?.message || 'Unable to load event details.', 'error'));
  }, [selectedEvent, showToast]);

  const refreshEvent = async () => {
    const eventId = selectedEvent?._id || selectedEvent?.id;
    if (!eventId) return;
    const response = await axios.get(`/api/events/${eventId}`);
    setEventState(response.data.data || response.data);
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRsvpSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      showToast('Please log in with a verified account to RSVP.', 'info');
      onRequireLogin?.();
      return;
    }

    if (!user.isVerified) {
      setErrorMsg('Your account email is unverified. Please verify your email before registering.');
      return;
    }

    setLoading(true);

    try {
      const eventId = selectedEvent._id || selectedEvent.id;
      const res = await axios.post(`/api/events/${eventId}/rsvp`);
      await Promise.allSettled([
        fetchProfile(),
        refreshEvent(),
        refreshNotifications({ quiet: true }),
      ]);
      onRsvpChanged?.();
      setSuccessMsg(res.data.message || 'Successfully registered for event!');
      showToast(
        res.data.status === 'waitlist'
          ? `Joined waitlist at position ${res.data.waitlistPosition}.`
          : 'Your RSVP is confirmed.',
        res.data.status === 'waitlist' ? 'warning' : 'success'
      );
      setIsSubmitted(true);
    } catch (err) {
      const message = err.response?.data?.message || 'RSVP registration failed.';
      setErrorMsg(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    const eventId = selectedEvent?._id || selectedEvent?.id;
    setLoading(true);
    try {
      await axios.delete(`/api/events/${eventId}/rsvp`);
      await Promise.allSettled([
        fetchProfile(),
        refreshEvent(),
        refreshNotifications({ quiet: true }),
      ]);
      onRsvpChanged?.();
      showToast('RSVP cancelled successfully.', 'success');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to cancel RSVP.';
      setErrorMsg(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!createData.title.trim() || !createData.description.trim() || !createData.location.trim() || !createData.date) {
      setErrorMsg('Please fill in all required fields (title, description, location, date).');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...createData,
        startDate: new Date(`${createData.date}T09:00:00`).toISOString(),
        capacity: Number(createData.capacity),
        published: true,
      };
      const res = await axios.post('/api/events', payload);
      onRsvpChanged?.();
      setSuccessMsg(res.data.message || 'Event created and published successfully!');
      setIsSubmitted(true);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create event.';
      setErrorMsg(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: isCreateMode ? '640px' : '520px' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {isCreateMode ? '➕ Create & Publish Local Event' : t('form.title', 'Register for Event')}
            </h2>
            {selectedEvent && (
              <p className="modal-subtitle">
                {selectedEvent.title} ({(typeof selectedEvent.location === 'object' && selectedEvent.location !== null ? selectedEvent.location.placeName : selectedEvent.location) || selectedEvent.city})
              </p>
            )}
            {selectedEvent && eventState && (
              <span className={`rsvp-state-badge ${rsvpStatus(eventState) === 'waitlist' ? 'waitlist' : rsvpStatus(eventState) === 'confirmed' ? 'confirmed' : isEventFull(eventState) ? 'full' : ''}`}>
                {rsvpStatusLabel(eventState)}
              </span>
            )}
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {isSubmitted ? (
          <div className="form-success-box">
            <div className="success-icon">🎉</div>
            <p className="success-text">{successMsg}</p>
            <button type="button" className="btn-primary" onClick={onClose}>
              {t('form.okBtn', 'OK')}
            </button>
          </div>
        ) : isCreateMode && !isOrganizerOrAdmin ? (
          /* Resident Notice when clicking Create Event */
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <ShieldAlert size={48} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              Organizer Permission Required
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', lineHeight: 1.6 }}>
              Publishing new community events is reserved for verified Event Organizers. As a Resident user, you can request an organizer role from your profile page.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onClose();
                  if (onNavigateProfile) onNavigateProfile();
                }}
              >
                Go to Profile & Request Role
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : isCreateMode ? (
          /* Organizer Create Event Form */
          <form className="registration-form" onSubmit={handleCreateSubmit}>
            {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

            <div className="form-group">
              <label className="form-label">Event Title *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="e.g. Indore Youth Tech Conference 2026"
                value={createData.title}
                onChange={handleCreateChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                name="description"
                rows="3"
                className="form-textarea"
                placeholder="Describe the event, agenda, target audience..."
                value={createData.description}
                onChange={handleCreateChange}
                required
              ></textarea>
            </div>

            <div className="form-row">
              <div className="form-group half-width">
                <label className="form-label">Category *</label>
                <select
                  name="category"
                  className="form-select"
                  value={createData.category}
                  onChange={handleCreateChange}
                >
                  <option value="Career & Jobs">Career & Jobs</option>
                  <option value="Skill Workshops">Skill Workshops</option>
                  <option value="Health & Wellness">Health & Wellness</option>
                  <option value="Cultural Festivals">Cultural Festivals</option>
                  <option value="Civic & Community">Civic & Community</option>
                </select>
              </div>

              <div className="form-group half-width">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  name="city"
                  className="form-input"
                  placeholder="e.g. Indore, Jaipur, Bhopal"
                  value={createData.city}
                  onChange={handleCreateChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group half-width">
                <label className="form-label">City Tier</label>
                <select
                  name="tier"
                  className="form-select"
                  value={createData.tier}
                  onChange={handleCreateChange}
                >
                  <option value="Tier 2">Tier 2</option>
                  <option value="Tier 3">Tier 3</option>
                  <option value="Tier 4">Tier 4</option>
                </select>
              </div>

              <div className="form-group half-width">
                <label className="form-label">Capacity (Seats)</label>
                <input
                  type="number"
                  name="capacity"
                  min="1"
                  className="form-input"
                  value={createData.capacity}
                  onChange={handleCreateChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Venue Location *</label>
              <input
                type="text"
                name="location"
                className="form-input"
                placeholder="e.g. Brilliant Convention Centre, Vijay Nagar"
                value={createData.location}
                onChange={handleCreateChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group half-width">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  name="date"
                  className="form-input"
                  value={createData.date}
                  onChange={handleCreateChange}
                  required
                />
              </div>

              <div className="form-group half-width">
                <label className="form-label">Time</label>
                <input
                  type="text"
                  name="time"
                  className="form-input"
                  placeholder="10:00 AM - 04:00 PM"
                  value={createData.time}
                  onChange={handleCreateChange}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Publishing...' : 'Publish Event'}
              </button>
            </div>
          </form>
        ) : !user ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <ShieldAlert size={42} color="#818cf8" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ marginBottom: '8px' }}>Log in to RSVP</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '18px' }}>Use a verified resident account to confirm a seat or join the waitlist.</p>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
              <button type="button" className="btn-primary" onClick={onRequireLogin}>Continue to Login</button>
            </div>
          </div>
        ) : hasActiveRsvp(eventState) ? (
          <div style={{ padding: '24px 0' }}>
            <div className="form-success-box" style={{ marginBottom: '18px' }}>
              <CheckCircle size={42} color={rsvpStatus(eventState) === 'waitlist' ? '#f59e0b' : '#10b981'} />
              <h3>{rsvpStatusLabel(eventState)}</h3>
              <p className="success-text">
                {rsvpStatus(eventState) === 'waitlist'
                  ? 'You are in the FIFO waitlist. We will notify you if a place becomes available.'
                  : 'Your place at this event is confirmed.'}
              </p>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
              <button type="button" className="btn-secondary" disabled={loading} onClick={handleCancelRsvp} style={{ color: '#f87171' }}>
                {loading ? 'Cancelling...' : 'Cancel RSVP'}
              </button>
            </div>
          </div>
        ) : (
          <form className="registration-form" onSubmit={handleRsvpSubmit}>
            {errorMsg && <div className="form-error-alert" role="alert">{errorMsg}</div>}
            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Booking as</p>
              <strong>{user.name}</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{user.email}</p>
              <p style={{ marginTop: '12px', color: isEventFull(eventState) ? '#fbbf24' : '#34d399', fontWeight: 700 }}>
                {isEventFull(eventState)
                  ? 'This event is full. You will join the FIFO waitlist.'
                  : 'A seat is currently available.'}
              </p>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Updating RSVP...' : isEventFull(eventState) ? 'Join Waitlist' : 'Confirm RSVP'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EventRegistrationForm;
