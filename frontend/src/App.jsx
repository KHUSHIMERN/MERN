import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  MapPin, 
  Users, 
  UserCheck, 
  Clock, 
  PlusCircle, 
  User, 
  ChevronRight, 
  LogOut, 
  AlertCircle, 
  CheckCircle,
  Inbox,
  Sparkles
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

// Set up Axios authorization helper
const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authError, setAuthError] = useState('');
  
  // Available seed accounts for demonstration
  const seedAccounts = [
    { email: 'resident1@test.com', label: 'Ravi Kumar (Resident 1)' },
    { email: 'resident2@test.com', label: 'Amit Singh (Resident 2)' },
    { email: 'resident3@test.com', label: 'Priya Sharma (Resident 3)' },
    { email: 'organizer1@test.com', label: 'Neha Gupta (Organizer)' },
    { email: 'admin1@test.com', label: 'Sanjay Verma (Admin)' }
  ];

  // Events and details states
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEventRSVPs, setSelectedEventRSVPs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // New event form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    capacity: 5
  });

  // UI Toast states
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // 1. Initial Load: Check if token exists and fetch user profile
  useEffect(() => {
    if (token) {
      setAuthToken(token);
      fetchUserProfile();
    } else {
      // Auto login as Resident 1 on start if no token is found, for quick UX
      handleLogin('resident1@test.com');
    }
  }, [token]);

  // Fetch active events when user changes
  useEffect(() => {
    if (currentUser) {
      fetchEvents();
    }
  }, [currentUser]);

  // Fetch RSVPs list when event selection changes
  useEffect(() => {
    if (selectedEventId) {
      fetchEventRSVPs(selectedEventId);
    } else {
      setSelectedEventRSVPs(null);
    }
  }, [selectedEventId]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      setCurrentUser(response.data.user);
    } catch (err) {
      console.error('Fetch profile failed:', err);
      handleLogout();
    }
  };

  const handleLogin = async (email) => {
    setLoading(true);
    setAuthError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password: 'password' // all seed accounts share this password
      });
      const { token: userToken, user } = response.data;
      localStorage.setItem('token', userToken);
      setToken(userToken);
      setCurrentUser(user);
      setAuthToken(userToken);
      addToast(`Logged in as ${user.name} (${user.role})`, 'success');
    } catch {
      setAuthError('Authentication failed. Ensure backend server is running.');
      addToast('Auth error: Connection refused', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCurrentUser(null);
    setAuthToken(null);
    setEvents([]);
    setSelectedEventId(null);
    addToast('Logged out successfully', 'info');
  };

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/events`);
      setEvents(response.data);
    } catch (err) {
      console.error('Fetch events failed:', err);
      addToast('Failed to fetch events', 'danger');
    }
  };

  const fetchEventRSVPs = async (eventId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/events/${eventId}/rsvps`);
      setSelectedEventRSVPs(response.data);
    } catch (err) {
      console.error('Fetch RSVPs failed:', err);
      addToast('Failed to load registrations', 'danger');
    }
  };

  // POST RSVP / Join Waitlist
  const handleRSVP = async (eventId) => {
    setActionLoadingId(eventId);
    try {
      const response = await axios.post(`${API_BASE_URL}/events/${eventId}/rsvp`);
      const { status, waitlistPosition } = response.data;

      if (status === 'confirmed') {
        addToast('Registration Confirmed! Spot secured.', 'success');
      } else {
        addToast(`Event at capacity. You joined waitlist position #${waitlistPosition}`, 'warning');
      }

      // Refresh events and detail lists
      fetchEvents();
      if (selectedEventId === eventId) {
        fetchEventRSVPs(eventId);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'RSVP action failed';
      addToast(errMsg, 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  // DELETE RSVP / Leave Waitlist
  const handleCancelRSVP = async (eventId) => {
    setActionLoadingId(eventId);
    try {
      const response = await axios.delete(`${API_BASE_URL}/events/${eventId}/rsvp`);
      const { slotFreed, promotedUser } = response.data;

      if (slotFreed) {
        if (promotedUser) {
          addToast(`Registration cancelled. Promoted ${promotedUser.name} from the waitlist!`, 'success');
        } else {
          addToast('Registration cancelled. Spot is now open.', 'info');
        }
      } else {
        addToast('Removed from waitlist.', 'info');
      }

      // Refresh lists
      fetchEvents();
      if (selectedEventId === eventId) {
        fetchEventRSVPs(eventId);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Cancellation failed';
      addToast(errMsg, 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Create new event handler
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.location || !newEvent.date || !newEvent.capacity) {
      addToast('Please fill out all required fields.', 'warning');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/events`, newEvent);
      addToast('Event created successfully!', 'success');
      setShowCreateForm(false);
      setNewEvent({
        title: '',
        description: '',
        location: '',
        date: '',
        capacity: 5
      });
      fetchEvents();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to create event';
      addToast(errMsg, 'danger');
    }
  };

  // Helper to formats date nicely
  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="app-container">
      {/* Toast Notification Box */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div 
            key={t.id} 
            className="animate-fade-in"
            style={{ 
              background: t.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : t.type === 'danger' ? 'rgba(239, 68, 68, 0.95)' : t.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(99, 102, 241, 0.95)',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(8px)'
            }}
          >
            {t.type === 'success' && <CheckCircle size={18} />}
            {t.type === 'danger' && <AlertCircle size={18} />}
            {t.type === 'warning' && <Clock size={18} />}
            {t.type === 'info' && <Inbox size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header bar */}
      <header>
        <div className="logo-section">
          <Sparkles size={28} color="#a78bfa" />
          <h1>PulseEvent</h1>
          <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Tier 2-4 Hub</span>
        </div>

        {/* User Switching Module */}
        <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="#a78bfa" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Log in as:</span>
            <select 
              value={currentUser?.email || ''} 
              onChange={(e) => e.target.value && handleLogin(e.target.value)}
              style={{ width: 'auto', padding: '4px 10px', fontSize: '0.85rem' }}
              disabled={loading}
            >
              <option value="" disabled>-- Choose Account --</option>
              {seedAccounts.map(acc => (
                <option key={acc.email} value={acc.email}>{acc.label}</option>
              ))}
            </select>
          </div>

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.name}</span>
                <span className={`badge ${currentUser.role === 'admin' ? 'badge-confirmed' : currentUser.role === 'organizer' ? 'badge-waitlist' : 'badge-capacity'}`} style={{ fontSize: '0.65rem', padding: '1px 6px', marginTop: '2px', display: 'inline-block', textAlign: 'center' }}>
                  {currentUser.role}
                </span>
              </div>
              <button 
                onClick={handleLogout} 
                title="Logout"
                style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {authError && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--danger)', padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AlertCircle color="#ef4444" size={24} />
          <div>
            <h3 style={{ color: '#fca5a5', marginBottom: '0.25rem' }}>Backend Connection Required</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{authError}</p>
          </div>
        </div>
      )}

      {currentUser && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedEventId ? '1fr 380px' : '1fr', gap: '2rem', transition: 'all 0.3s ease' }}>
          {/* Main Events Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Upcoming Community Events</h2>
              
              {/* Creator Trigger: Organizer/Admin-only restriction */}
              {(currentUser.role === 'organizer' || currentUser.role === 'admin') && (
                <button 
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="glow-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
                >
                  <PlusCircle size={18} />
                  <span>Create New Event</span>
                </button>
              )}
            </div>

            {/* Create Event Form Overlay */}
            {showCreateForm && (
              <form onSubmit={handleCreateEvent} className="glass-card animate-fade-in" style={{ padding: '2rem', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                <h3 style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Post a New Event</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Event Title *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Blood Donation Camp"
                      value={newEvent.title}
                      onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Location *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Town Hall Hall Room"
                      value={newEvent.location}
                      onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date & Time *</label>
                    <input 
                      type="datetime-local" 
                      value={newEvent.date}
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Capacity (Attendee Limit) *</label>
                    <input 
                      type="number" 
                      min="1"
                      value={newEvent.capacity}
                      onChange={e => setNewEvent({...newEvent, capacity: Number(e.target.value)})}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Description</label>
                  <textarea 
                    rows="3"
                    placeholder="Provide details about the event, what to bring, and expectations..."
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="cancel-btn" style={{ padding: '0.6rem 1.5rem' }}>
                    Cancel
                  </button>
                  <button type="submit" className="glow-btn" style={{ padding: '0.6rem 2rem' }}>
                    Publish Event
                  </button>
                </div>
              </form>
            )}

            {/* Events Grid */}
            {events.length === 0 ? (
              <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Calendar size={48} color="rgba(255,255,255,0.06)" style={{ marginBottom: '1rem' }} />
                <p>No upcoming events listed yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {events.map(ev => {
                  const isSelected = selectedEventId === ev._id;
                  
                  return (
                    <div 
                      key={ev._id} 
                      className="glass-card" 
                      style={{ 
                        padding: '1.8rem', 
                        display: 'grid', 
                        gridTemplateColumns: '1fr auto', 
                        gap: '1.5rem',
                        alignItems: 'center',
                        borderLeft: isSelected ? '4px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)'
                      }}
                    >
                      {/* Left Block: Info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.4rem' }}>{ev.title}</h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{ev.description}</p>
                        </div>

                        {/* Metadata blocks */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} color="var(--accent-primary)" />
                            <span style={{ color: 'var(--text-secondary)' }}>{formatDate(ev.date)}</span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={14} color="var(--accent-primary)" />
                            <span style={{ color: 'var(--text-secondary)' }}>{ev.location}</span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={14} color="var(--accent-primary)" />
                            <span style={{ color: 'var(--text-secondary)' }}>Capacity: {ev.capacity}</span>
                          </span>
                        </div>
                      </div>

                      {/* Right Block: Buttons and Real-Time Counters */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                        
                        {/* Event RSVP/Waitlist counts (Backend-driven) */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span className="badge badge-capacity" style={{ background: 'rgba(99,102,241,0.06)' }}>
                            RSVPs: {ev.rsvpCount || 0} / {ev.capacity}
                          </span>
                          {(ev.waitlistCount > 0) && (
                            <span className="badge badge-waitlist">
                              Waitlist: {ev.waitlistCount}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                          {/* Details/Registrations View (Available to everyone but highly useful for organizer) */}
                          <button 
                            onClick={() => setSelectedEventId(isSelected ? null : ev._id)}
                            style={{ 
                              background: 'rgba(255,255,255,0.04)', 
                              border: '1px solid var(--border-color)', 
                              color: 'var(--text-primary)', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '8px', 
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{isSelected ? 'Hide Panel' : 'Manage & Track'}</span>
                            <ChevronRight size={14} style={{ transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                          </button>

                          {/* Resident RSVP / Cancel controls */}
                          {currentUser.role === 'resident' && (
                            <>
                              {ev.userRegistrationStatus === 'confirmed' ? (
                                <button 
                                  onClick={() => handleCancelRSVP(ev._id)} 
                                  className="cancel-btn"
                                  style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}
                                  disabled={actionLoadingId === ev._id}
                                >
                                  {actionLoadingId === ev._id ? 'Processing...' : 'Cancel RSVP'}
                                </button>
                              ) : ev.userRegistrationStatus === 'waitlist' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                  <span className="badge badge-waitlist" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                    Waitlisted (Pos #{ev.userWaitlistPosition || 1})
                                  </span>
                                  <button 
                                    onClick={() => handleCancelRSVP(ev._id)} 
                                    className="cancel-btn"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                    disabled={actionLoadingId === ev._id}
                                  >
                                    {actionLoadingId === ev._id ? '...' : 'Leave'}
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleRSVP(ev._id)} 
                                  className="glow-btn"
                                  style={{ 
                                    padding: '0.5rem 1.5rem', 
                                    fontSize: '0.85rem',
                                    background: (ev.rsvpCount || 0) >= ev.capacity ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : undefined
                                  }}
                                  disabled={actionLoadingId === ev._id}
                                >
                                  {actionLoadingId === ev._id ? 'Processing...' : (ev.rsvpCount || 0) >= ev.capacity ? 'Join Waitlist' : 'RSVP Now'}
                                </button>
                              )}
                            </>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Attendee list details (Organizer / Admin visual validation) */}
          {selectedEventId && (
            <div className="glass-card animate-fade-in" style={{ padding: '1.8rem', height: 'fit-content', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              {selectedEventRSVPs ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '0.2rem' }}>Registration Desk</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Real-time audit log of the waitlist queue and confirmations.</p>
                  </div>

                  {/* Summary counts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '8px', padding: '0.5rem' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399' }}>{selectedEventRSVPs.confirmedCount}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Confirmed</div>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '8px', padding: '0.5rem' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24' }}>{selectedEventRSVPs.waitlistCount}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Waitlist</div>
                    </div>
                  </div>

                  {/* Confirmed List */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.75rem' }}>
                      <UserCheck size={14} color="#34d399" />
                      <span>Confirmed Seats ({selectedEventRSVPs.confirmedCount} / {selectedEventRSVPs.capacity})</span>
                    </h4>

                    {selectedEventRSVPs.confirmed.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', italic: 'true', paddingLeft: '4px' }}>No registrations yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {selectedEventRSVPs.confirmed.map(c => (
                          <div key={c.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.8rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                            <div>
                              <div style={{ fontWeight: 500 }}>{c.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                            </div>
                            <span className="badge badge-confirmed" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>Confirmed</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Waitlist (FIFO ordered representation) */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.75rem' }}>
                      <Clock size={14} color="#fbbf24" />
                      <span>FIFO Waitlist Queue ({selectedEventRSVPs.waitlistCount})</span>
                    </h4>

                    {selectedEventRSVPs.waitlist.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', italic: 'true', paddingLeft: '4px' }}>Waitlist is empty.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {selectedEventRSVPs.waitlist.map(w => (
                          <div key={w.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.8rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderLeft: '2px solid var(--warning)' }}>
                            <div>
                              <div style={{ fontWeight: 500 }}>{w.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.email}</div>
                            </div>
                            <span className="badge badge-waitlist" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                              #{w.position} Wait
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <Clock className="pulse" size={24} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading registration data...</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
