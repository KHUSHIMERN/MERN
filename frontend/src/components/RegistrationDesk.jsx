import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, RefreshCw, ShieldAlert, Ticket, TrendingUp, Users } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function RegistrationDesk({ eventId, event }) {
  const showToast = useToast();
  const [desk, setDesk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDesk = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/events/${eventId}/rsvps`);
      setDesk(response.data);
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Unable to load the Registration Desk.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [eventId, showToast]);

  useEffect(() => {
    loadDesk();
  }, [loadDesk]);

  if (loading && !desk) return <div className="registration-desk-state"><RefreshCw className="animate-spin" /> Loading registrations...</div>;
  if (error) return (
    <div className="auth-error-banner" role="alert">
      <ShieldAlert />
      <div><h3>Registration Desk unavailable</h3><p>{error}</p></div>
    </div>
  );
  if (!desk) return null;

  const available = Math.max(0, desk.capacity - desk.confirmedCount);
  const fillPercent = desk.capacity ? Math.min(100, Math.round((desk.confirmedCount / desk.capacity) * 100)) : 0;

  return (
    <section className="registration-desk" aria-labelledby="registration-desk-title">
      <div className="registration-desk-header">
        <div>
          <h3 id="registration-desk-title"><Ticket size={22} /> Registration Desk</h3>
          <p>{event?.title || 'Selected event'} registrations and FIFO waitlist</p>
        </div>
        <button type="button" className="btn-secondary" onClick={loadDesk} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="summary-cards-grid">
        <div className="summary-card"><Users /><span className="card-title">Capacity</span><strong className="card-value">{desk.capacity}</strong></div>
        <div className="summary-card confirmed"><CheckCircle /><span className="card-title">Confirmed</span><strong className="card-value">{desk.confirmedCount}</strong></div>
        <div className="summary-card waitlist"><Clock /><span className="card-title">Waitlisted</span><strong className="card-value">{desk.waitlistCount}</strong></div>
        <div className="summary-card"><TrendingUp /><span className="card-title">Available</span><strong className="card-value">{available}</strong></div>
      </div>
      <div className="desk-capacity-track" aria-label={`${fillPercent}% of event capacity filled`}><span style={{ width: `${fillPercent}%` }} /></div>

      <div className="registration-desk-columns">
        <div className="desk-panel">
          <h4>Confirmed registrations ({desk.confirmedCount})</h4>
          {desk.confirmed.length ? desk.confirmed.map((registration) => (
            <div className="desk-person" key={registration.rsvpId}>
              <span className="desk-position confirmed"><CheckCircle size={15} /></span>
              <div><strong>{registration.name || 'Resident'}</strong><small>{registration.email}</small></div>
              <time>{new Date(registration.createdAt).toLocaleString()}</time>
            </div>
          )) : <p className="desk-empty">No confirmed registrations.</p>}
        </div>

        <div className="desk-panel">
          <h4>Ordered waitlist ({desk.waitlistCount})</h4>
          {desk.waitlist.length ? desk.waitlist.map((registration) => (
            <div className="desk-person" key={registration.rsvpId}>
              <span className="desk-position">{registration.position}</span>
              <div><strong>{registration.name || 'Resident'}</strong><small>{registration.email}</small></div>
              <time>{new Date(registration.createdAt).toLocaleString()}</time>
            </div>
          )) : <p className="desk-empty">The waitlist is empty.</p>}
        </div>
      </div>

      <div className="desk-panel promotion-panel">
        <h4>Promotion activity</h4>
        {desk.promotions?.length ? desk.promotions.map((promotion) => (
          <div className="desk-person" key={promotion.rsvpId}>
            <span className="desk-position confirmed"><TrendingUp size={15} /></span>
            <div><strong>{promotion.name || 'Resident'} promoted</strong><small>{promotion.email}</small></div>
            <time>{new Date(promotion.promotedAt).toLocaleString()}</time>
          </div>
        )) : <p className="desk-empty">No waitlist promotions yet.</p>}
      </div>
    </section>
  );
}
