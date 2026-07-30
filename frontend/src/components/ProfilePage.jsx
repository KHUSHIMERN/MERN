import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Phone, Globe, Shield, Send, CheckCircle, AlertCircle, Edit3, Save, X, Clock, Ticket } from 'lucide-react';

export default function ProfilePage({ onNavigateHome }) {
  const { user, updateProfile, requestOrganizerRole, fetchProfile, logout } = useAuth();
  const showToast = useToast();
  const [registeredEvents, setRegisteredEvents] = useState([]);

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    language: 'en',
  });

  // Role Request state
  const [requestDescription, setRequestDescription] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Status & Optimistic Feedback UI state
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        contact: user.contact || '',
        language: user.language || 'en',
      });
    }
  }, [user]);

  const fetchRegisteredEvents = async () => {
    if (!user) return;
    try {
      const response = await axios.get('/api/events');
      const allEvents = response.data.events || response.data.data || [];
      setRegisteredEvents(allEvents.filter((event) => ['confirmed', 'waitlist'].includes(event.userRegistrationStatus)));
    } catch {
      setRegisteredEvents([]);
    }
  };

  useEffect(() => {
    fetchRegisteredEvents();
  }, [user?._id]);

  if (!user) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>
        <h2>User Profile</h2>
        <p style={{ color: 'var(--text-muted)' }}>Please log in to view and manage your profile.</p>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Inline Edit Save with Optimistic UI Feedback
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setStatusMessage({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }

    const previousData = { ...user };
    
    // Optimistic UI update
    setStatusMessage({ type: 'info', text: 'Saving profile changes...' });
    setIsSubmitting(true);

    const result = await updateProfile({
      name: formData.name.trim(),
      contact: formData.contact.trim(),
      language: formData.language,
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsEditing(false);
      setStatusMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setStatusMessage(null), 4000);
    } else {
      // Revert optimistic data if request failed
      setFormData({
        name: previousData.name || '',
        contact: previousData.contact || '',
        language: previousData.language || 'en',
      });
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  // Submit Organizer Role Request (Residents only)
  const handleRoleRequest = async (e) => {
    e.preventDefault();

    if (user.role === 'organizer' || user.role === 'admin') {
      setStatusMessage({ type: 'error', text: 'You are already an event organizer or administrator.' });
      return;
    }

    setIsRequestSubmitting(true);
    const result = await requestOrganizerRole(requestDescription);
    setIsRequestSubmitting(false);

    if (result.success) {
      setShowRequestModal(false);
      setRequestDescription('');
      setStatusMessage({ type: 'success', text: 'Organizer role request submitted successfully!' });
      setTimeout(() => setStatusMessage(null), 5000);
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  const isResident = user.role === 'resident';
  const roleRequestStatus = user.organizerRoleRequest?.status || 'none';

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      {/* Navigation & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>User Profile & Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Manage your hyperlocal account details and community preferences
          </p>
        </div>
        {onNavigateHome && (
          <button className="btn-secondary" onClick={onNavigateHome}>
            ← Back to Home
          </button>
        )}
      </div>

      {/* Alert / Toast Messages */}
      {statusMessage && (
        <div
          className="animate-fade-in"
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '600',
            background:
              statusMessage.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : statusMessage.type === 'error'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(99, 102, 241, 0.15)',
            border: `1px solid ${
              statusMessage.type === 'success'
                ? '#10b981'
                : statusMessage.type === 'error'
                ? '#ef4444'
                : '#6366f1'
            }`,
            color:
              statusMessage.type === 'success'
                ? '#10b981'
                : statusMessage.type === 'error'
                ? '#f87171'
                : '#818cf8',
          }}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle size={18} />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <Clock size={18} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="card" style={{ padding: '32px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '24px',
                fontWeight: '700',
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{user.name}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user.email}</p>
              <div style={{ marginTop: '6px', display: 'inline-flex', gap: '8px' }}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    background: user.role === 'organizer' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                    color: user.role === 'organizer' ? '#34d399' : '#818cf8',
                    border: `1px solid ${user.role === 'organizer' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
                  }}
                >
                  Role: {user.role}
                </span>
                {user.isVerified && (
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: 'rgba(52, 211, 153, 0.15)',
                      color: '#34d399',
                    }}
                  >
                    ✓ Email Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isEditing ? (
            <button className="btn-secondary" onClick={() => setIsEditing(true)}>
              <Edit3 size={16} /> Edit Profile
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => setIsEditing(false)}>
              <X size={16} /> Cancel
            </button>
          )}
        </div>

        <hr style={{ borderColor: 'var(--border-color)', margin: '20px 0' }} />

        {/* Profile Edit / View Form */}
        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Full Name */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} color="#6366f1" /> Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
              ) : (
                <div className="form-control" style={{ background: 'var(--input-bg)', opacity: 0.9 }}>
                  {user.name}
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={16} color="#6366f1" /> Contact Phone / Info
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  placeholder="+91 9876543210"
                  className="form-control"
                />
              ) : (
                <div className="form-control" style={{ background: 'var(--input-bg)', opacity: 0.9 }}>
                  {user.contact || 'Not provided'}
                </div>
              )}
            </div>

            {/* Preferred Language */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={16} color="#6366f1" /> Preferred Language
              </label>
              {isEditing ? (
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="form-control"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                </select>
              ) : (
                <div className="form-control" style={{ background: 'var(--input-bg)', opacity: 0.9 }}>
                  {user.language === 'hi'
                    ? 'हिंदी (Hindi)'
                    : user.language === 'mr'
                    ? 'मराठी (Marathi)'
                    : user.language === 'ta'
                    ? 'தமிழ் (Tamil)'
                    : 'English'}
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                <Save size={16} /> {isSubmitting ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* My Registered Events (RSVPs) Section */}
      <div className="card" style={{ padding: '32px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Ticket size={24} color="#6366f1" />
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>My Registered Events ({registeredEvents.length})</h3>
        </div>

        {registeredEvents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            You have not registered for any events yet. Explore upcoming community events to RSVP!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {registeredEvents
              .sort((a, b) => a.userRegistrationStatus === b.userRegistrationStatus ? 0 : a.userRegistrationStatus === 'confirmed' ? -1 : 1)
              .map((evt, index, sortedEvents) => {
              const eventObj = evt;
              const eventId = evt._id;
              const beginsGroup = index === 0 || sortedEvents[index - 1].userRegistrationStatus !== evt.userRegistrationStatus;
              return (
                <React.Fragment key={eventId}>
                {beginsGroup && (
                  <h4 style={{ marginTop: index ? '16px' : 0, color: evt.userRegistrationStatus === 'confirmed' ? '#34d399' : '#fbbf24' }}>
                    {evt.userRegistrationStatus === 'confirmed' ? 'Confirmed Events' : 'Waitlisted Events'}
                  </h4>
                )}
                <div
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    background: 'var(--input-bg)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <span className={`rsvp-state-badge ${eventObj.userRegistrationStatus === 'waitlist' ? 'waitlist' : 'confirmed'}`}>
                      {eventObj.userRegistrationStatus === 'waitlist'
                        ? `Waitlisted • Position ${eventObj.userWaitlistPosition}`
                        : 'Confirmed'}
                    </span>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {eventObj ? eventObj.title : `Event ID: ${eventId}`}
                    </h4>
                    {eventObj && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        📅 {eventObj.date || (eventObj.startDate ? new Date(eventObj.startDate).toLocaleDateString() : '')} • 📍 {(typeof eventObj.location === 'object' && eventObj.location !== null ? eventObj.location.placeName : eventObj.location) || eventObj.city} • 🏷️ {eventObj.category}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      try {
                        setStatusMessage({ type: 'info', text: 'Cancelling RSVP...' });
                        await axios.delete(`/api/events/${eventId}/rsvp`);
                        await fetchProfile();
                        await fetchRegisteredEvents();
                        showToast('RSVP cancelled successfully.', 'success');
                        setStatusMessage({ type: 'success', text: 'RSVP cancelled successfully.' });
                        setTimeout(() => setStatusMessage(null), 4000);
                      } catch (err) {
                        setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to cancel RSVP.' });
                        showToast(err.response?.data?.message || 'Failed to cancel RSVP.', 'error');
                      }
                    }}
                    style={{ fontSize: '12px', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                  >
                    Cancel RSVP
                  </button>
                </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Organizer Role Request Workflow Section */}
      <div className="card" style={{ padding: '32px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Shield size={24} color="#6366f1" />
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Event Organizer Status & Permissions</h3>
        </div>

        {/* State A: User is Resident (Can request organizer role) */}
        {isResident && (
          <div>
            {roleRequestStatus === 'none' && (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
                  Are you a local event coordinator, NGO representative, or community organizer? Request an
                  organizer account to post hyperlocal opportunities in tier 2-4 cities.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => setShowRequestModal(true)}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <Send size={16} /> Request Organizer Role
                </button>
              </div>
            )}

            {roleRequestStatus === 'pending' && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '20px',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: '700', marginBottom: '8px' }}>
                  <Clock size={20} /> Organizer Role Request Under Admin Review
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Your request was submitted on{' '}
                  <strong>
                    {user.organizerRoleRequest?.requestedAt
                      ? new Date(user.organizerRoleRequest.requestedAt).toLocaleDateString()
                      : 'recently'}
                  </strong>
                  . An administrator will review your application soon.
                </p>
                {user.organizerRoleRequest?.description && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'var(--input-bg)', borderRadius: '8px', fontSize: '12px' }}>
                    <strong>Your Note:</strong> "{user.organizerRoleRequest.description}"
                  </div>
                )}
              </div>
            )}

            {roleRequestStatus === 'rejected' && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '20px',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: '700', marginBottom: '8px' }}>
                  <AlertCircle size={20} /> Role Request Not Approved
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Your previous organizer request was reviewed by an administrator and could not be approved at this time.
                </p>
                <button className="btn-secondary" onClick={() => setShowRequestModal(true)}>
                  Submit New Request with Updated Details
                </button>
              </div>
            )}
          </div>
        )}

        {/* State B: User is already an Organizer */}
        {user.role === 'organizer' && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              padding: '20px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <CheckCircle size={28} color="#10b981" />
            <div>
              <h4 style={{ color: '#34d399', fontWeight: '700', marginBottom: '4px' }}>
                Active Event Organizer Account
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                You have full organizer permissions to publish, edit, and track participation for community events.
              </p>
            </div>
          </div>
        )}

        {/* State C: User is Admin */}
        {user.role === 'admin' && (
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              padding: '20px',
              borderRadius: '12px',
            }}
          >
            <h4 style={{ color: '#818cf8', fontWeight: '700', marginBottom: '4px' }}>System Administrator Account</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              You have administrative rights to manage community event listings and review pending organizer role requests.
            </p>
          </div>
        )}
      </div>

      {/* Role Request Modal Popup */}
      {showRequestModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowRequestModal(false)}>
          <div
            className="card animate-fade-in"
            style={{ maxWidth: '500px', width: '100%', padding: '28px', borderRadius: '16px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowRequestModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '20px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>
                Request Organizer Role
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Provide details about the local events or organization you represent for admin review.
              </p>
            </div>

            <form onSubmit={handleRoleRequest}>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: '600' }}>
                  Organization / Event Purpose (Optional)
                </label>
                <textarea
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  placeholder="E.g., I represent Indore Health Foundation and plan to host free blood donation and wellness camps."
                  rows={4}
                  className="form-control"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isRequestSubmitting}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {isRequestSubmitting ? 'Submitting Request...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowRequestModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
