import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { hasActiveRsvp, isEventFull, rsvpStatus, rsvpStatusLabel } from '../utils/rsvpState';
import { Calendar, MapPin, PlusCircle, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';

export function EventRegistrationForm({ selectedEvent, onClose, onNavigateProfile, onRsvpChanged }) {
  const { t } = useTranslation();
  const { user, fetchProfile } = useAuth();
  const showToast = useToast();
  const [eventState, setEventState] = useState(selectedEvent);

  const isCreateMode = !selectedEvent;
  const isOrganizerOrAdmin = user && (user.role === 'organizer' || user.role === 'admin');

  // RSVP Form State
  const [rsvpData, setRsvpData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    notes: '',
    agreeTerms: false,
  });

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
    if (user) {
      setRsvpData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    setEventState(selectedEvent);
    const eventId = selectedEvent?._id || selectedEvent?.id;
    if (!eventId) return;
    axios.get(`/api/events/${eventId}`)
      .then((response) => setEventState(response.data.data || response.data))
      .catch(() => {});
  }, [selectedEvent]);

  const refreshEvent = async () => {
    const eventId = selectedEvent?._id || selectedEvent?.id;
    if (!eventId) return;
    const response = await axios.get(`/api/events/${eventId}`);
    setEventState(response.data.data || response.data);
  };

  const handleRsvpChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRsvpData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRsvpSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      setErrorMsg('You must be logged in with a verified account to register for events.');
      return;
    }

    if (!user.isVerified) {
      setErrorMsg('Your account email is unverified. Please verify your email before registering.');
      return;
    }

    if (!rsvpData.agreeTerms) {
      setErrorMsg(t('form.agreeTermsError', 'You must agree to the terms to proceed.'));
      return;
    }

    setLoading(true);

    try {
      const eventId = selectedEvent._id || selectedEvent.id;
      const res = await axios.post(`/api/events/${eventId}/rsvp`);
      await fetchProfile();
      await refreshEvent();
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
      setErrorMsg(err.response?.data?.message || 'RSVP registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    const eventId = selectedEvent?._id || selectedEvent?.id;
    setLoading(true);
    try {
      await axios.delete(`/api/events/${eventId}/rsvp`);
      await Promise.all([fetchProfile(), refreshEvent()]);
      onRsvpChanged?.();
      showToast('RSVP cancelled successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel RSVP.', 'error');
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
      setErrorMsg(err.response?.data?.message || 'Failed to create event.');
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
          /* RSVP for existing event Form */
          <form className="registration-form" onSubmit={handleRsvpSubmit}>
            {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                {t('form.fullName', 'Full Name')} *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className="form-input"
                placeholder={t('form.fullNamePlaceholder', 'Enter your full name')}
                value={rsvpData.fullName}
                onChange={handleRsvpChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                {t('form.email', 'Email Address')} *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder={t('form.emailPlaceholder', 'name@example.com')}
                value={rsvpData.email}
                onChange={handleRsvpChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes" className="form-label">
                {t('form.notes', 'Special Requests / Notes')}
              </label>
              <textarea
                id="notes"
                name="notes"
                rows="2"
                className="form-textarea"
                placeholder={t('form.notesPlaceholder', 'Dietary requirements, accessibility needs, etc.')}
                value={rsvpData.notes}
                onChange={handleRsvpChange}
              ></textarea>
            </div>

            <div className="form-checkbox-group">
              <input
                type="checkbox"
                id="agreeTerms"
                name="agreeTerms"
                className="form-checkbox"
                checked={rsvpData.agreeTerms}
                onChange={handleRsvpChange}
                required
              />
              <label htmlFor="agreeTerms" className="checkbox-label">
                {t('form.agreeTerms', 'I agree to the event terms and community code of conduct')}
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                {t('form.cancelBtn', 'Cancel')}
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Submitting...' : isEventFull(eventState) ? 'Join Waitlist' : t('form.submitBtn', 'Confirm Registration')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EventRegistrationForm;
