import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Star,
  CheckCircle,
  MessageSquare,
  Send,
  Trash2,
  Edit3,
  AlertCircle,
  ThumbsUp,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export default function EventFeedbackSection({ eventId, onFeedbackSubmitted }) {
  const { user } = useAuth();
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [distribution, setDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [userFeedback, setUserFeedback] = useState(null);

  // Form states
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const fetchFeedback = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const params = user?._id ? { userId: user._id } : {};
      const res = await axios.get(`/api/events/${eventId}/feedback`, { params });
      if (res.data && res.data.success) {
        setReviews(res.data.reviews || []);
        setAverageRating(res.data.averageRating || 0);
        setTotalReviews(res.data.totalReviews || 0);
        setDistribution(res.data.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
        if (res.data.userFeedback) {
          setUserFeedback(res.data.userFeedback);
          setRatingInput(res.data.userFeedback.rating || 5);
          setCommentInput(res.data.userFeedback.comment || '');
        } else {
          setUserFeedback(null);
        }
      }
    } catch (err) {
      console.error('Error fetching event feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [eventId, user?._id]);

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Please log in to submit your rating and feedback.', 'warning');
      return;
    }
    if (ratingInput < 1 || ratingInput > 5) {
      showToast('Please select a star rating between 1 and 5.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(`/api/events/${eventId}/feedback`, {
        rating: ratingInput,
        comment: commentInput,
      });

      if (res.data && res.data.success) {
        showToast(res.data.message || 'Feedback saved successfully!', 'success');
        setIsEditingExisting(false);
        fetchFeedback();
        onFeedbackSubmitted?.();
      }
    } catch (err) {
      console.error('Submit feedback error:', err);
      showToast(err.response?.data?.message || 'Could not submit feedback.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      setSubmitting(true);
      await axios.delete(`/api/events/${eventId}/feedback`);
      showToast('Review removed successfully.', 'info');
      setUserFeedback(null);
      setCommentInput('');
      setRatingInput(5);
      setIsEditingExisting(false);
      fetchFeedback();
      onFeedbackSubmitted?.();
    } catch (err) {
      console.error('Delete feedback error:', err);
      showToast('Could not delete review.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="event-feedback-section"
      style={{
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <MessageSquare size={18} color="#f59e0b" />
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
          Attendee Ratings & Reviews ({totalReviews})
        </h3>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.8125rem' }}>Loading reviews...</p>
        </div>
      ) : (
        <>
          {/* Rating Summary Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(120px, 1fr) minmax(180px, 2fr)',
              gap: '16px',
              background: '#131b2e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              alignItems: 'center',
            }}
          >
            {/* Big Score */}
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255, 255, 255, 0.08)', paddingRight: '12px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>
                {averageRating > 0 ? averageRating.toFixed(1) : '—'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', margin: '6px 0 4px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={15}
                    fill={star <= Math.round(averageRating) ? '#fbbf24' : 'none'}
                    color={star <= Math.round(averageRating) ? '#fbbf24' : '#64748b'}
                  />
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            {/* Distribution Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[5, 4, 3, 2, 1].map((num) => {
                const count = distribution[num] || 0;
                const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                return (
                  <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                    <span style={{ width: '28px', color: '#cbd5e1', fontWeight: 600 }}>{num} ★</span>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: num >= 4 ? '#10b981' : num === 3 ? '#f59e0b' : '#ef4444',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                    <span style={{ width: '24px', textAlign: 'right', color: '#94a3b8' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback Submission or Edit Form */}
          {user ? (
            userFeedback && !isEditingExisting ? (
              /* Already reviewed state */
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} color="#34d399" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc' }}>
                      Your Review ({userFeedback.rating} ★)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingExisting(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: 'none',
                        color: '#818cf8',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteFeedback}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '6px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      fill={star <= userFeedback.rating ? '#fbbf24' : 'none'}
                      color={star <= userFeedback.rating ? '#fbbf24' : '#64748b'}
                    />
                  ))}
                </div>
                {userFeedback.comment && (
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                    "{userFeedback.comment}"
                  </p>
                )}
              </div>
            ) : (
              /* Review Form */
              <form
                onSubmit={handleSubmitFeedback}
                style={{
                  background: '#131b2e',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                    {isEditingExisting ? 'Edit Your Review' : 'Rate & Review this Event'}
                  </h4>
                  {isEditingExisting && (
                    <button
                      type="button"
                      onClick={() => setIsEditingExisting(false)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Star Rating Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || ratingInput) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingInput(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${star} stars out of 5`}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          transition: 'transform 0.1s ease',
                        }}
                      >
                        <Star
                          size={24}
                          fill={isFilled ? '#fbbf24' : 'none'}
                          color={isFilled ? '#fbbf24' : '#64748b'}
                        />
                      </button>
                    );
                  })}
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fbbf24', marginLeft: '6px' }}>
                    {(hoverRating || ratingInput)} / 5 Stars
                  </span>
                </div>

                {/* Comment Textarea */}
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Share your experience (what did you learn? how was the venue/speaker?)..."
                  rows={3}
                  maxLength={1000}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#f8fafc',
                    fontSize: '0.875rem',
                    marginBottom: '10px',
                    resize: 'vertical',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: submitting ? 'wait' : 'pointer',
                    }}
                  >
                    <Send size={14} />
                    {submitting ? 'Submitting...' : isEditingExisting ? 'Update Review' : 'Post Review'}
                  </button>
                </div>
              </form>
            )
          ) : (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'center',
                fontSize: '0.8125rem',
                color: '#94a3b8',
                marginBottom: '20px',
              }}
            >
              Log in with your resident account to share feedback and star rating for this event.
            </div>
          )}

          {/* Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviews.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>
                No feedback reviews yet. Be the first to share your thoughts!
              </p>
            ) : (
              reviews.map((r) => {
                const dateStr = r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '';

                return (
                  <div
                    key={r._id || r.id}
                    style={{
                      background: '#131b2e',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '0.875rem', color: '#f8fafc' }}>
                          {r.userName || 'Resident Attendee'}
                        </strong>
                        {r.isVerifiedAttendee && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '8px',
                            }}
                          >
                            <ShieldCheck size={11} /> Verified Attendee
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{dateStr}</span>
                    </div>

                    {/* Stars */}
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={13}
                          fill={star <= r.rating ? '#fbbf24' : 'none'}
                          color={star <= r.rating ? '#fbbf24' : '#64748b'}
                        />
                      ))}
                    </div>

                    {/* Comment */}
                    {r.comment && (
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        {r.comment}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
