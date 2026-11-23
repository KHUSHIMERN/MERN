import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Bell,
  Clock,
  MapPin,
  CheckCircle,
  ExternalLink,
  Download,
  Filter,
  Sparkles,
} from 'lucide-react';

export default function SmartCalendar({ onSelectEvent, onRsvpChanged }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const showToast = useToast();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeredOnly, setRegisteredOnly] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderChannel, setReminderChannel] = useState('both'); // 'in-app' | 'email' | 'both'
  const [reminderSuccess, setReminderSuccess] = useState(null);

  // Fetch calendar events
  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reminders/calendar-events', {
        params: { registeredOnly },
      });
      if (res.data && res.data.success) {
        setCalendarEvents(res.data.events || []);
      }
    } catch (err) {
      console.error('Fetch calendar events error:', err);
      showToast('Could not load calendar events.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, [registeredOnly, user?._id]);

  // Calendar Date Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedEvent(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedEvent(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedEvent(null);
  };

  // Map events to day numbers
  const getEventsForDay = (dayNum) => {
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return calendarEvents.filter((evt) => {
      if (evt.date && evt.date.startsWith(targetDateStr)) return true;
      if (evt.startDate) {
        const d = new Date(evt.startDate);
        return (
          d.getFullYear() === year &&
          d.getMonth() === month &&
          d.getDate() === dayNum
        );
      }
      return false;
    });
  };

  const isToday = (dayNum) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === dayNum;
  };

  // Send Reminder Handler
  const handleSendReminder = async () => {
    if (!selectedEvent) return;
    setReminderLoading(true);
    setReminderSuccess(null);
    try {
      const res = await axios.post('/api/reminders/send', {
        eventId: selectedEvent.id || selectedEvent._id,
        channel: reminderChannel,
        userEmail: user?.email,
      });

      if (res.data && res.data.success) {
        setReminderSuccess(res.data.data.emailStatus || 'Reminder scheduled successfully!');
        showToast(`Reminder scheduled for "${selectedEvent.title}"!`, 'success');
      }
    } catch (err) {
      console.error('Send reminder error:', err);
      showToast(err.response?.data?.message || 'Failed to send reminder.', 'error');
    } finally {
      setReminderLoading(false);
    }
  };

  // Generate .ics download for standard calendars (Google / Outlook / Apple)
  const handleDownloadIcs = (evt) => {
    const sDate = new Date(evt.startDate);
    const eDate = new Date(evt.endDate || sDate.getTime() + 2 * 3600000);

    const pad = (n) => String(n).padStart(2, '0');
    const formatIcsDate = (d) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CommunityConnect//SmartCalendar//EN',
      'BEGIN:VEVENT',
      `UID:${evt.id}-${Date.now()}@communityconnect.org`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(sDate)}`,
      `DTEND:${formatIcsDate(eDate)}`,
      `SUMMARY:${evt.title}`,
      `DESCRIPTION:${(evt.description || '').replace(/\n/g, ' ')}`,
      `LOCATION:${evt.city || evt.location || ''}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(evt.title || 'event').toLowerCase().replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Calendar (.ics) invite downloaded!', 'info');
  };

  const getLocalizedTitle = (evt) => {
    if (lang === 'hi' && evt.title_hi) return evt.title_hi;
    if (lang === 'kn' && evt.title_kn) return evt.title_kn;
    return evt.title;
  };

  return (
    <div className="smart-calendar-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Calendar Header Controls */}
      <div
        className="calendar-header-bar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
          background: 'rgba(30, 41, 59, 0.7)',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <CalendarIcon size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              {monthNames[month]} {year}
            </h2>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Smart Calendar & Event Reminders
            </span>
          </div>
        </div>

        {/* Navigation Buttons & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={goToToday}
            style={{
              background: 'rgba(99, 102, 241, 0.18)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#c7d2fe',
              borderRadius: '8px',
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={nextMonth}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Next Month"
          >
            <ChevronRight size={18} />
          </button>

          {/* Toggle Registered Only */}
          <button
            type="button"
            onClick={() => setRegisteredOnly(!registeredOnly)}
            style={{
              background: registeredOnly ? '#059669' : 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              border: registeredOnly ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Filter size={14} />
            {registeredOnly ? 'Showing: My RSVPs' : 'Filter: My RSVPs'}
          </button>
        </div>
      </div>

      {/* Grid Layout: Calendar + Event Detail Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedEvent ? '1fr 340px' : '1fr', gap: '20px' }}>
        {/* Monthly Calendar Table */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px',
            overflowX: 'auto',
          }}
        >
          {/* Day of Week Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '8px',
              textAlign: 'center',
              marginBottom: '10px',
              color: '#94a3b8',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            {daysOfWeek.map((day) => (
              <div key={day} style={{ padding: '8px 0' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '8px',
            }}
          >
            {/* Previous month trailing days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const dNum = prevMonthDays - firstDayIndex + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  style={{
                    minHeight: '90px',
                    padding: '8px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.015)',
                    opacity: 0.35,
                    fontSize: '12px',
                    color: '#64748b',
                  }}
                >
                  {dNum}
                </div>
              );
            })}

            {/* Current month active days */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayEvents = getEventsForDay(dayNum);
              const today = isToday(dayNum);

              return (
                <div
                  key={`day-${dayNum}`}
                  style={{
                    minHeight: '90px',
                    padding: '8px',
                    borderRadius: '10px',
                    background: today
                      ? 'rgba(99, 102, 241, 0.08)'
                      : dayEvents.length > 0
                      ? 'rgba(30, 41, 59, 0.6)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: today
                      ? '1.5px solid #6366f1'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: today ? 800 : 600,
                        color: today ? '#818cf8' : '#e2e8f0',
                        width: today ? '22px' : 'auto',
                        height: today ? '22px' : 'auto',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.some((e) => e.isRegistered) && (
                      <span
                        title="You have RSVP'd for an event today"
                        style={{
                          fontSize: '10px',
                          color: '#10b981',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.2)',
                          padding: '1px 5px',
                          borderRadius: '8px',
                        }}
                      >
                        ✓ RSVP
                      </span>
                    )}
                  </div>

                  {/* Day Event Chips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
                    {dayEvents.slice(0, 3).map((evt) => (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => {
                          setSelectedEvent(evt);
                          setReminderSuccess(null);
                        }}
                        style={{
                          textAlign: 'left',
                          background: evt.isRegistered ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.2)',
                          border: `1px solid ${evt.color || '#6366f1'}`,
                          borderRadius: '6px',
                          padding: '3px 6px',
                          fontSize: '11px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 600,
                          transition: 'transform 0.1s ease',
                        }}
                        title={evt.title}
                      >
                        {evt.isRegistered && '✓ '}
                        {getLocalizedTitle(evt)}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Event Detail & Reminder Panel */}
        {selectedEvent && (
          <div
            className="calendar-event-sidebar animate-fade-in"
            style={{
              background: '#0f172a',
              borderRadius: '16px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: selectedEvent.color || '#6366f1',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                {selectedEvent.category}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
              {getLocalizedTitle(selectedEvent)}
            </h3>

            <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '16px' }}>
              {lang === 'hi' && selectedEvent.description_hi
                ? selectedEvent.description_hi
                : lang === 'kn' && selectedEvent.description_kn
                ? selectedEvent.description_kn
                : selectedEvent.description}
            </p>

            {/* Event Time & Venue Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#818cf8" />
                <span>
                  {new Date(selectedEvent.startDate).toLocaleDateString()} at {selectedEvent.time}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#38bdf8" />
                <span>{selectedEvent.location || selectedEvent.city}</span>
              </div>
            </div>

            {/* RSVP Status */}
            <div
              style={{
                background: selectedEvent.isRegistered ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: selectedEvent.isRegistered ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '10px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: selectedEvent.isRegistered ? '#6ee7b7' : '#94a3b8' }}>
                {selectedEvent.isRegistered ? '✓ Registered (RSVP Confirmed)' : 'Not Yet Registered'}
              </span>
              <button
                type="button"
                onClick={() => onSelectEvent?.(selectedEvent)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {selectedEvent.isRegistered ? 'Manage RSVP' : 'RSVP Now'}
              </button>
            </div>

            {/* Reminder Dispatch Section */}
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '14px',
                borderRadius: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Bell size={15} color="#818cf8" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#c7d2fe' }}>
                  Smart Reminders
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                {[
                  { key: 'in-app', label: 'In-App' },
                  { key: 'email', label: 'Email' },
                  { key: 'both', label: 'Both' },
                ].map((ch) => (
                  <button
                    key={ch.key}
                    type="button"
                    onClick={() => setReminderChannel(ch.key)}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      background: reminderChannel === ch.key ? '#6366f1' : 'rgba(255, 255, 255, 0.05)',
                      color: reminderChannel === ch.key ? '#fff' : '#94a3b8',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSendReminder}
                disabled={reminderLoading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Bell size={14} />
                {reminderLoading ? 'Sending Reminder...' : 'Set / Send Reminder'}
              </button>

              {reminderSuccess && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#6ee7b7',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '6px',
                    borderRadius: '6px',
                  }}
                >
                  ✓ {reminderSuccess}
                </div>
              )}
            </div>

            {/* Download Calendar Invite (.ics) */}
            <button
              type="button"
              onClick={() => handleDownloadIcs(selectedEvent)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Download size={14} />
              Export to Calendar (.ics)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
