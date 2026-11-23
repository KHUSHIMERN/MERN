import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  HandHeart,
  Award,
  Sparkles,
  CheckCircle,
  Calendar,
  MapPin,
  ChevronRight,
  Filter,
  RefreshCw,
  Users,
  Check,
} from 'lucide-react';

export default function VolunteerMatchingSection({ onSelectEvent, onRegisterSuccess }) {
  const { user } = useAuth();
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [onlyVolunteering, setOnlyVolunteering] = useState(false);
  const [activeVolunteerIds, setActiveVolunteerIds] = useState({});
  const [volunteeringLoadingId, setVolunteeringLoadingId] = useState(null);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const params = {};
      if (onlyVolunteering) params.onlyVolunteering = 'true';
      if (user?._id) params.userId = user._id;

      const res = await axios.get('/api/volunteer/recommendations', { params });
      if (res.data?.success) {
        setMatches(res.data.matches || []);
      }
    } catch (err) {
      console.error('Error fetching volunteer matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [onlyVolunteering, user?.skills?.length, user?._id]);

  const handleVolunteerSignup = async (e, evt) => {
    e.stopPropagation();
    if (!user) {
      showToast('Please log in with your resident account to volunteer.', 'warning');
      return;
    }

    const evtId = evt._id || evt.id;
    try {
      setVolunteeringLoadingId(evtId);
      const res = await axios.post(`/api/events/${evtId}/volunteer`, {
        roleName: 'Community Volunteer',
        skills: user.skills || [],
      });

      if (res.data?.success) {
        showToast(res.data.message || 'Volunteer registration confirmed!', 'success');
        setActiveVolunteerIds((prev) => ({ ...prev, [evtId]: true }));
        onRegisterSuccess?.();
      }
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.isDuplicate) {
        setActiveVolunteerIds((prev) => ({ ...prev, [evtId]: true }));
        showToast('You are already registered as a volunteer for this event.', 'info');
      } else {
        showToast(err.response?.data?.message || 'Could not register as volunteer.', 'error');
      }
    } finally {
      setVolunteeringLoadingId(null);
    }
  };

  return (
    <section
      className="volunteer-matching-section"
      style={{
        margin: '36px 0',
        padding: '28px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '8px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <HandHeart size={14} /> Feature 10: Volunteer & Skill Matching
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px' }}>
            Volunteer Opportunities & Skill Workshops
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, maxWidth: '640px' }}>
            AI-matched events and community initiatives that directly leverage your verified skills and personal passions.
          </p>

          {/* User Skills Pills */}
          {user?.skills && user.skills.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Matching against your skills:</span>
              {user.skills.map((skill) => (
                <span
                  key={skill}
                  style={{
                    padding: '2px 10px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.18)',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  ✓ {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Filter Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: onlyVolunteering ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid',
              borderColor: onlyVolunteering ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
              color: onlyVolunteering ? '#38bdf8' : '#cbd5e1',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={onlyVolunteering}
              onChange={(e) => setOnlyVolunteering(e.target.checked)}
              style={{ display: 'none' }}
            />
            <HandHeart size={15} />
            <span>Volunteering Roles Only</span>
          </label>

          <button
            type="button"
            onClick={fetchMatches}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              padding: '7px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
            title="Refresh Skill Recommendations"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid of Matched Events */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
          <p style={{ fontSize: '14px' }}>Analyzing your skills and local opportunities...</p>
        </div>
      ) : matches.length === 0 ? (
        <div style={{ padding: '36px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <Users size={36} color="#64748b" style={{ margin: '0 auto 10px' }} />
          <h4 style={{ color: '#f8fafc', margin: '0 0 6px' }}>No Exact Matches Found</h4>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
            Update your skills and interests in your Profile to unlock personalized volunteering recommendations.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '16px',
          }}
        >
          {matches.slice(0, 6).map((match) => {
            const evt = match.event;
            const evtId = evt._id || evt.id;
            const isVolunteered = Boolean(activeVolunteerIds[evtId]);
            const isLoadingThis = volunteeringLoadingId === evtId;

            return (
              <div
                key={evtId}
                onClick={() => onSelectEvent?.(evt)}
                style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                {/* Top Row: Score + Badge */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: match.matchScore >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: match.matchScore >= 80 ? '#34d399' : '#38bdf8',
                        border: `1px solid ${match.matchScore >= 80 ? '#10b981' : '#38bdf8'}`,
                      }}
                    >
                      ⭐ {match.matchScore}% Skill Match
                    </span>

                    {match.isVolunteerOpportunity ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#facc15',
                          background: 'rgba(234, 179, 8, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        Volunteering
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#94a3b8',
                        }}
                      >
                        {match.category}
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#f8fafc',
                      margin: '0 0 6px',
                      lineHeight: 1.4,
                    }}
                  >
                    {evt.title}
                  </h3>

                  {/* Why recommended reasoning */}
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#38bdf8',
                      margin: '0 0 10px',
                      fontStyle: 'italic',
                      lineHeight: 1.4,
                    }}
                  >
                    💡 {match.whyRecommended}
                  </p>

                  {/* Matched skills pill tags */}
                  {match.matchedSkills && match.matchedSkills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                      {match.matchedSkills.map((s) => (
                        <span
                          key={s}
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#7dd3fc',
                          }}
                        >
                          + {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Row: Details & Volunteer Button */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={11} /> {match.city || evt.city || 'India'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} /> {evt.date || (evt.startDate && new Date(evt.startDate).toLocaleDateString())}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {match.isVolunteerOpportunity && (
                      <button
                        type="button"
                        onClick={(e) => handleVolunteerSignup(e, evt)}
                        disabled={isVolunteered || isLoadingThis}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: isVolunteered ? '#059669' : '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          cursor: isVolunteered ? 'default' : 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {isVolunteered ? (
                          <>
                            <Check size={13} /> Volunteered
                          </>
                        ) : isLoadingThis ? (
                          'Joining...'
                        ) : (
                          <>
                            <HandHeart size={13} /> Volunteer
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectEvent?.(evt)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: 'transparent',
                        color: '#cbd5e1',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        cursor: 'pointer',
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
