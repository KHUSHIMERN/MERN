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
  Sparkles,
  Lock,
  Mail
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';
axios.defaults.withCredentials = true;

// In-memory access token storage
let inMemoryToken = '';
let onLogoutCallback = null;

// Axios Request Interceptor: Attach the in-memory access token to every outgoing request
axios.interceptors.request.use(
  (config) => {
    if (inMemoryToken) {
      config.headers['Authorization'] = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Axios Response Interceptor: Catch 401 and transparently attempt token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 (Unauthorized) and request is not already a retry or auth route
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        // Post to refresh endpoint (httpOnly cookie automatically attached by browser)
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`);
        const { accessToken } = res.data;
        
        // Update in-memory token
        inMemoryToken = accessToken;
        
        // Update headers and retry original request
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh failed (e.g. refresh token also expired/revoked), log out
        if (onLogoutCallback) {
          onLogoutCallback();
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

function App() {
  // App States
  const [currentUser, setCurrentUser] = useState(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // Available seed accounts for demonstration
  const seedAccounts = [
    { email: 'resident1@test.com', password: 'password', label: 'Ravi Kumar (Resident)', role: 'resident' },
    { email: 'organizer1@test.com', password: 'password', label: 'Neha Gupta (Organizer)', role: 'organizer' },
    { email: 'admin1@test.com', password: 'password', label: 'Sanjay Verma (Admin)', role: 'admin' },
    { email: 'unverified@test.com', password: 'password', label: 'Unverified User (Error Demo)', role: 'unverified' }
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

  // Test Protected API states
  const [testApiLoading, setTestApiLoading] = useState(null);
  const [testApiResult, setTestApiResult] = useState(null);
  const [testApiError, setTestApiError] = useState('');

  const handleTestProtectedApi = async (endpoint, label) => {
    setTestApiLoading(endpoint);
    setTestApiResult(null);
    setTestApiError('');
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`);
      setTestApiResult(response.data);
      addToast(`Access Granted: Successfully retrieved ${label}`, 'success');
    } catch (err) {
      console.error(`Protected API error on ${endpoint}:`, err);
      const errMsg = err.response?.data?.message || err.message || `Failed to fetch from ${endpoint}`;
      setTestApiError(errMsg);
      addToast(`Access Denied (403): ${errMsg}`, 'danger');
    } finally {
      setTestApiLoading(null);
    }
  };

  // Register logout callback for interceptor
  useEffect(() => {
    onLogoutCallback = () => {
      inMemoryToken = '';
      setCurrentUser(null);
      setEvents([]);
      setSelectedEventId(null);
      setTestApiResult(null);
      setTestApiError('');
      addToast('Session expired. Please log in again.', 'warning');
    };
    
    // Check session on start (silent refresh)
    const checkActiveSession = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`);
        const { accessToken } = res.data;
        inMemoryToken = accessToken;
        
        // Fetch profile
        const profileRes = await axios.get(`${API_BASE_URL}/auth/me`);
        setCurrentUser(profileRes.data.user);
        addToast(`Welcome back, ${profileRes.data.user.name}!`, 'success');
      } catch (err) {
        console.log('No active session.');
      } finally {
        setIsAppLoading(false);
      }
    };
    
    checkActiveSession();

    return () => {
      onLogoutCallback = null;
    };
  }, []);

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

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Email and password are required.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: loginEmail,
        password: loginPassword
      });
      
      const { accessToken, user } = response.data;
      inMemoryToken = accessToken;
      setCurrentUser(user);
      setTestApiResult(null);
      setTestApiError('');
      
      setLoginEmail('');
      setLoginPassword('');
      addToast(`Logged in as ${user.name} (${user.role})`, 'success');
    } catch (err) {
      console.error('Login error:', err);
      const errMsg = err.response?.data?.message || 'Login failed. Please check your network and credentials.';
      setLoginError(errMsg);
      addToast(errMsg, 'danger');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickLogin = (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
    // Trigger submission in next tick after state updates
    setTimeout(() => {
      const form = document.getElementById('login-form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 50);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      inMemoryToken = '';
      setCurrentUser(null);
      setEvents([]);
      setSelectedEventId(null);
      setTestApiResult(null);
      setTestApiError('');
      addToast('Logged out successfully', 'info');
      setLoading(false);
    }
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
    const confirmCancel = window.confirm('Are you sure you want to cancel your RSVP?');
    if (!confirmCancel) return;

    setActionLoadingId(eventId);
    try {
      const response = await axios.delete(`${API_BASE_URL}/events/${eventId}/rsvp`);
      const { slotFreed, promotedUser } = response.data;

      if (slotFreed) {
        if (promotedUser) {
          addToast('a user from the waitlist was promoted', 'success');
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

  if (isAppLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
        <Clock className="pulse" size={40} style={{ color: 'var(--accent-primary)' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Securing your connection...</p>
      </div>
    );
  }

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

      {currentUser ? (
        <>
          {/* Header bar */}
          <header className="animate-fade-in">
            <div className="logo-section">
              <Sparkles size={28} color="#a78bfa" />
              <h1>PulseEvent</h1>
              <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Secure Portal</span>
            </div>

            {/* User Session Info Card */}
            <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} color="#a78bfa" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentUser.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{currentUser.email}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                <span className={`badge ${currentUser.role === 'admin' ? 'badge-confirmed' : currentUser.role === 'organizer' ? 'badge-waitlist' : 'badge-capacity'}`} style={{ fontSize: '0.65rem' }}>
                  {currentUser.role}
                </span>
                <button 
                  onClick={handleLogout} 
                  title="Logout Session"
                  disabled={loading}
                  style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </header>

          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', transition: 'all 0.3s ease' }}>
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
                            {/* Details/Registrations View */}
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

            {/* Right Panel: Attendee list details OR Role Authorization Test Bed */}
            <div className="glass-card animate-fade-in" style={{ padding: '1.8rem', height: 'fit-content', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              {selectedEventId ? (
                selectedEventRSVPs ? (
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
                          {selectedEventRSVPs.confirmed.map(c => {
                            const isCurrentUser = currentUser && c.id === currentUser._id;
                            return (
                              <div key={c.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.8rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                <div>
                                  <div style={{ fontWeight: 500 }}>{c.name} {isCurrentUser && <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>(You)</span>}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {isCurrentUser && (
                                    <button
                                      onClick={() => handleCancelRSVP(selectedEventId)}
                                      className="cancel-btn"
                                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                      disabled={actionLoadingId === selectedEventId}
                                    >
                                      Cancel
                                    </button>
                                  )}
                                  <span className="badge badge-confirmed" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>Confirmed</span>
                                </div>
                              </div>
                            );
                          })}
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
                          {selectedEventRSVPs.waitlist.map(w => {
                            const isCurrentUser = currentUser && w.id === currentUser._id;
                            return (
                              <div key={w.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.8rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderLeft: '2px solid var(--warning)' }}>
                                <div>
                                  <div style={{ fontWeight: 500 }}>{w.name} {isCurrentUser && <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>(You)</span>}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.email}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {isCurrentUser && (
                                    <button
                                      onClick={() => handleCancelRSVP(selectedEventId)}
                                      className="cancel-btn"
                                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                      disabled={actionLoadingId === selectedEventId}
                                    >
                                      Leave
                                    </button>
                                  )}
                                  <span className="badge badge-waitlist" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                                    #{w.position} Wait
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <Clock className="pulse" size={24} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading registration data...</p>
                  </div>
                )
              ) : (
                /* Role Authorization Test Bed */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Lock size={18} color="#a78bfa" />
                      <span>Role Auth Test Bed</span>
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Verify server-side middleware behavior and role-based access controls in real-time.</p>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Current Identity:</span>
                      <span className={`badge ${currentUser.role === 'admin' ? 'badge-confirmed' : currentUser.role === 'organizer' ? 'badge-waitlist' : 'badge-capacity'}`}>
                        {currentUser.role}
                      </span>
                    </div>
                  </div>

                  {/* Route 1: Organizer-only */}
                  <div style={{ background: 'rgba(139, 92, 246, 0.03)', border: '1px solid rgba(139, 92, 246, 0.1)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace', color: '#a78bfa' }}>/api/organizer/events</span>
                      <span className="badge badge-waitlist" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>ORGANIZER</span>
                    </div>
                    <button
                      onClick={() => handleTestProtectedApi('/organizer/events', 'Organizer Events')}
                      className="glow-btn"
                      style={{ 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.85rem',
                        background: currentUser.role !== 'organizer' ? 'linear-gradient(135deg, #4b5563 0%, #374151 100%)' : undefined,
                        boxShadow: currentUser.role !== 'organizer' ? 'none' : undefined
                      }}
                      disabled={testApiLoading !== null}
                    >
                      {testApiLoading === '/organizer/events' ? 'Requesting...' : 'Query Organizer Events'}
                    </button>
                  </div>

                  {/* Route 2: Admin-only */}
                  <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace', color: '#34d399' }}>/api/admin/users</span>
                      <span className="badge badge-confirmed" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>ADMIN</span>
                    </div>
                    <button
                      onClick={() => handleTestProtectedApi('/admin/users', 'Registered Users')}
                      className="glow-btn"
                      style={{ 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.85rem',
                        background: currentUser.role !== 'admin' ? 'linear-gradient(135deg, #4b5563 0%, #374151 100%)' : undefined,
                        boxShadow: currentUser.role !== 'admin' ? 'none' : undefined
                      }}
                      disabled={testApiLoading !== null}
                    >
                      {testApiLoading === '/admin/users' ? 'Requesting...' : 'List Registered Users'}
                    </button>
                  </div>

                  {/* Results Section */}
                  {(testApiResult || testApiError) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Server Response:</span>
                        <button 
                          onClick={() => { setTestApiResult(null); setTestApiError(''); }}
                          style={{ background: 'transparent', border: 'none', color: '#fca5a5', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Clear
                        </button>
                      </div>
                      <div 
                        style={{ 
                          background: '#07060e', 
                          border: testApiError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', 
                          borderRadius: '8px', 
                          padding: '0.75rem',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem'
                        }}
                      >
                        {testApiError ? (
                          <div style={{ color: '#fca5a5', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontWeight: 'bold' }}>Status: 403 Forbidden</div>
                            <div>{testApiError}</div>
                          </div>
                        ) : (
                          <div style={{ color: '#34d399' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Status: 200 OK</div>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {JSON.stringify(testApiResult, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Stunning Login Page UI */
        <div className="login-wrapper animate-fade-in">
          <div className="glass-card login-card">
            <div className="login-header">
              <div style={{ display: 'inline-flex', background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '12px', marginBottom: '0.75rem' }}>
                <Sparkles size={36} color="#a78bfa" />
              </div>
              <h2 className="gradient-text">Welcome back</h2>
              <p>Sign in to register and coordinate community events</p>
            </div>

            {loginError && (
              <div className="error-alert animate-fade-in">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            <form id="login-form" onSubmit={handleLoginSubmit}>
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    style={{ paddingLeft: '38px' }}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={{ paddingLeft: '38px' }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="glow-btn"
                disabled={loginLoading}
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '1rem' }}
              >
                {loginLoading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            {/* Quick Login Drawer */}
            <div className="demo-accounts-section">
              <h4>Demo Accounts (Quick Select)</h4>
              <div className="demo-accounts-grid">
                {seedAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    className="demo-account-btn"
                    onClick={() => handleQuickLogin(acc.email, acc.password)}
                    title={`Login as ${acc.label}`}
                  >
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acc.label.split(' ')[0]} {acc.label.split(' ')[1] || ''}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acc.email}
                    </div>
                    <span 
                      className="demo-account-role"
                      style={{
                        background: acc.role === 'admin' ? 'rgba(16, 185, 129, 0.1)' : acc.role === 'organizer' ? 'rgba(245, 158, 11, 0.1)' : acc.role === 'unverified' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: acc.role === 'admin' ? '#34d399' : acc.role === 'organizer' ? '#fbbf24' : acc.role === 'unverified' ? '#fca5a5' : 'var(--text-secondary)'
                      }}
                    >
                      {acc.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
