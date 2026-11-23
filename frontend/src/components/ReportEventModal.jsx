import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Flag, AlertTriangle, CheckCircle, X, ShieldAlert, Clock, Send } from 'lucide-react';

const REASON_OPTIONS = [
  { value: 'spam', label: 'Spam or Commercial Advertising' },
  { value: 'misleading', label: 'Misleading Details (Incorrect Venue, Date or Claims)' },
  { value: 'inappropriate', label: 'Inappropriate or Offensive Content' },
  { value: 'safety_concern', label: 'Safety or Security Concern for Attendees' },
  { value: 'scam', label: 'Scam, Fake Event or Fraudulent Solicitation' },
  { value: 'other', label: 'Other Violation of Community Guidelines' },
];

export default function ReportEventModal({ open, onClose, event, onReportSubmitted }) {
  const { user } = useAuth();
  const showToast = useToast();

  const [reason, setReason] = useState('misleading');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [existingReport, setExistingReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const eventId = event?._id || event?.id;

  useEffect(() => {
    if (!open || !eventId) return;
    setErrorMsg('');
    setDetails('');
    setReason('misleading');

    // Check if user has already submitted a report for this event
    if (user?._id) {
      setChecking(true);
      axios
        .get(`/api/events/${eventId}/my-report`, { params: { userId: user._id } })
        .then((res) => {
          if (res.data?.hasReported) {
            setExistingReport(res.data.report);
          } else {
            setExistingReport(null);
          }
        })
        .catch(() => setExistingReport(null))
        .finally(() => setChecking(false));
    }
  }, [open, eventId, user?._id]);

  if (!open || !event) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      showToast('Please log in to submit a safety report.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        reason,
        details: details.trim(),
        reporterId: user._id,
        reporterName: user.name,
        reporterEmail: user.email,
      };

      const res = await axios.post(`/api/events/${eventId}/report`, payload);

      if (res.data?.success) {
        showToast('Safety report submitted. Our moderation team will review this event.', 'success');
        setExistingReport(res.data.report);
        onReportSubmitted?.();
        setTimeout(() => {
          onClose();
        }, 1400);
      }
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.isDuplicate) {
        setExistingReport(err.response?.data?.report || { reason });
        showToast('You have already submitted a report for this event.', 'info');
      } else {
        const msg = err.response?.data?.message || 'Failed to submit safety report. Please try again.';
        setErrorMsg(msg);
        showToast(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          background: '#0f172a',
          color: '#f8fafc',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.15)',
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flag size={20} color="#ef4444" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem', color: '#f8fafc', margin: 0 }}>
                Report Inappropriate Event
              </h2>
              <p className="modal-subtitle" style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                {event.title}
              </p>
            </div>
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Existing report notice */}
        {existingReport ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Clock size={28} color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#f8fafc' }}>
              Report Under Admin Review
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '16px' }}>
              You submitted a report for this event categorized as{' '}
              <strong style={{ color: '#fbbf24' }}>
                {REASON_OPTIONS.find((r) => r.value === existingReport.reason)?.label || existingReport.reason}
              </strong>
              . Our platform administration is currently investigating.
            </p>
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '0.8125rem',
                color: '#cbd5e1',
              }}
            >
              <span style={{ color: '#94a3b8' }}>Status:</span>{' '}
              <span style={{ fontWeight: 600, color: existingReport.status === 'pending' ? '#fbbf24' : '#10b981' }}>
                {existingReport.status?.toUpperCase() || 'PENDING'}
              </span>
              {existingReport.details && (
                <p style={{ margin: '6px 0 0', color: '#94a3b8', fontStyle: 'italic' }}>
                  "{existingReport.details}"
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{ padding: '10px 24px', background: '#334155', border: 'none' }}
            >
              Close
            </button>
          </div>
        ) : !user ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <ShieldAlert size={44} color="#818cf8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Sign In Required</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '20px' }}>
              To ensure safety and prevent spam, users must be logged in to submit an event report.
            </p>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#fca5a5',
                  fontSize: '0.8125rem',
                  marginBottom: '16px',
                }}
              >
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#e2e8f0',
                }}
              >
                What is the issue with this event? *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                }}
                required
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#e2e8f0',
                }}
              >
                Provide additional details (optional)
              </label>
              <textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain why this event should be reviewed by administrators..."
                maxLength={1000}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textAlign: 'right', marginTop: '4px' }}>
                {details.length}/1000 characters
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={submitting}
                style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#cbd5e1' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <Send size={15} />
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
