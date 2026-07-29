import React, { useState, useEffect, useCallback } from 'react';

export function OrganizerCheckIn({ onSelectEventForRegister }) {
  // State Management
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('evt-1');
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Role Simulation Switcher (organizer vs attendee for testing 403 authorization)
  const [userRole, setUserRole] = useState('organizer');

  // Attendance Data & Summary Stats
  const [attendanceData, setAttendanceData] = useState([]);
  const [summary, setSummary] = useState({
    totalRegistrations: 0,
    confirmedCount: 0,
    waitlistCount: 0,
    presentCount: 0,
    absentCount: 0,
    attendancePercentage: 0
  });

  // Filter & Pagination States
  const [search, setSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState('all'); // 'all' | 'confirmed' | 'waitlist'
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'present' | 'absent'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination metadata
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  // Selection & Bulk Operations
  const [selectedRegIds, setSelectedRegIds] = useState([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // UI State: Loading & Toast Messages
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [toast, setToast] = useState(null);

  // Helper to trigger temporary toast message
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch Events List for Event Selector
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setEvents(json.data);
            setSelectedEventId(json.data[0].id || json.data[0].itemKey || 'evt-1');
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch events from API, using fallback events:', err);
      }
      
      // Fallback default events list
      const defaultEvts = [
        { id: 'evt-1', title: 'Tech Summit Bengaluru 2026', category: 'tech', date: '2026-08-15' },
        { id: 'evt-2', title: 'Karnataka Cultural & Folk Festival', category: 'culture', date: '2026-08-22' },
        { id: 'evt-3', title: 'Fullstack React & Node Workshop', category: 'workshop', date: '2026-09-02' },
        { id: 'evt-4', title: 'Green City Cleanliness Drive', category: 'charity', date: '2026-09-10' }
      ];
      setEvents(defaultEvts);
    };
    fetchEvents();
  }, []);

  // Update selected event object when ID changes
  useEffect(() => {
    const found = events.find((e) => e.id === selectedEventId || e.itemKey === selectedEventId);
    setSelectedEvent(found || events[0] || null);
  }, [events, selectedEventId]);

  // 2. Fetch Attendance Data from API
  const fetchAttendance = useCallback(async () => {
    if (!selectedEventId) return;

    setIsLoading(true);
    setAuthError(null);

    try {
      const queryParams = new URLSearchParams({
        search,
        rsvpStatus: rsvpFilter,
        attendanceStatus: attendanceFilter,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      const res = await fetch(`/api/events/${selectedEventId}/attendance?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole,
          'X-User-Name': 'Organizer Admin',
          'X-User-Email': 'organizer@eventpulse.org'
        }
      });

      if (res.status === 403) {
        const errJson = await res.json();
        setAuthError(errJson.message || 'Access Denied: Organizer role required.');
        setAttendanceData([]);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        setAttendanceData(json.data || []);
        if (json.summary) setSummary(json.summary);
        if (json.pagination) setPagination(json.pagination);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      showToast(`Error fetching attendance: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEventId, userRole, search, rsvpFilter, attendanceFilter, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // 3. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    if (!selectedEventId || userRole !== 'organizer') return;
    try {
      const res = await fetch(`/api/events/${selectedEventId}/attendance/audit-logs`, {
        headers: {
          'X-User-Role': userRole,
          'X-User-Name': 'Organizer Admin'
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setAuditLogs(json.data || []);
      }
    } catch (err) {
      console.warn('Could not fetch audit logs:', err);
    }
  }, [selectedEventId, userRole]);

  useEffect(() => {
    if (showAuditLogs) {
      fetchAuditLogs();
    }
  }, [showAuditLogs, fetchAuditLogs]);

  // Reset page to 1 when search or filters change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRsvpFilterChange = (e) => {
    setRsvpFilter(e.target.value);
    setPage(1);
  };

  const handleAttendanceFilterChange = (e) => {
    setAttendanceFilter(e.target.value);
    setPage(1);
  };

  // Selection Checkboxes Logic
  const handleSelectRow = (regId) => {
    setSelectedRegIds((prev) =>
      prev.includes(regId) ? prev.filter((id) => id !== regId) : [...prev, regId]
    );
  };

  const handleSelectAllOnPage = (e) => {
    if (e.target.checked) {
      const pageIds = attendanceData.map((r) => r._id || r.id);
      setSelectedRegIds(Array.from(new Set([...selectedRegIds, ...pageIds])));
    } else {
      const pageIds = new Set(attendanceData.map((r) => r._id || r.id));
      setSelectedRegIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const isAllPageSelected =
    attendanceData.length > 0 &&
    attendanceData.every((r) => selectedRegIds.includes(r._id || r.id));

  // 4. Per-row Present/Absent Toggle
  const handleToggleSingleAttendance = async (regId, currentStatus, attendeeName) => {
    if (userRole !== 'organizer') {
      showToast('Access Denied: Only organizers can update attendance.', 'error');
      return;
    }

    const nextStatus = !currentStatus;

    // Optimistic UI Update
    setAttendanceData((prev) =>
      prev.map((item) => {
        if ((item._id || item.id) === regId) {
          return {
            ...item,
            statusPresent: nextStatus,
            checkInAt: nextStatus ? new Date().toISOString() : null,
            markedBy: 'Organizer Admin (organizer@eventpulse.org)'
          };
        }
        return item;
      })
    );

    try {
      const res = await fetch(`/api/events/${selectedEventId}/attendance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole,
          'X-User-Name': 'Organizer Admin',
          'X-User-Email': 'organizer@eventpulse.org'
        },
        body: JSON.stringify({
          registrationId: regId,
          statusPresent: nextStatus
        })
      });

      if (res.status === 403) {
        showToast('Access Denied: Only organizers can perform check-ins.', 'error');
        fetchAttendance(); // Revert
        return;
      }

      const json = await res.json();
      if (json.success) {
        showToast(
          nextStatus
            ? `Marked ${attendeeName || 'attendee'} as PRESENT ✓`
            : `Marked ${attendeeName || 'attendee'} as ABSENT`,
          nextStatus ? 'success' : 'info'
        );
        fetchAttendance();
        if (showAuditLogs) fetchAuditLogs();
      } else {
        throw new Error(json.message || 'Update failed');
      }
    } catch (err) {
      showToast(`Error updating attendance: ${err.message}`, 'error');
      fetchAttendance(); // Revert
    }
  };

  // 5. Bulk Mark Selected (Present or Absent)
  const handleBulkAttendanceUpdate = async (targetStatus) => {
    if (selectedRegIds.length === 0) {
      showToast('Please select at least one registrant from the table.', 'warning');
      return;
    }

    if (userRole !== 'organizer') {
      showToast('Access Denied: Organizer role required.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/events/${selectedEventId}/attendance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole,
          'X-User-Name': 'Organizer Admin',
          'X-User-Email': 'organizer@eventpulse.org'
        },
        body: JSON.stringify({
          registrationIds: selectedRegIds,
          statusPresent: targetStatus
        })
      });

      const json = await res.json();
      if (json.success) {
        showToast(
          `Bulk Update: Marked ${json.count || selectedRegIds.length} registrant(s) as ${
            targetStatus ? 'PRESENT ✓' : 'ABSENT'
          }`,
          'success'
        );
        setSelectedRegIds([]);
        fetchAttendance();
        if (showAuditLogs) fetchAuditLogs();
      } else {
        throw new Error(json.message || 'Bulk update failed');
      }
    } catch (err) {
      showToast(`Bulk update error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Bulk Quick Action: Mark All Present on Current Page
  const handleMarkPageAllPresent = async () => {
    if (attendanceData.length === 0) {
      showToast('No registrants available on this page to mark present.', 'info');
      return;
    }

    const pageIds = attendanceData.map((r) => r._id || r.id);

    setIsLoading(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/attendance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole,
          'X-User-Name': 'Organizer Admin',
          'X-User-Email': 'organizer@eventpulse.org'
        },
        body: JSON.stringify({
          registrationIds: pageIds,
          statusPresent: true
        })
      });

      const json = await res.json();
      if (json.success) {
        showToast(`Marked all ${pageIds.length} attendees on current page as PRESENT ✓`, 'success');
        fetchAttendance();
        if (showAuditLogs) fetchAuditLogs();
      } else {
        throw new Error(json.message || 'Action failed');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Export Current Attendance List to CSV
  const handleExportCSV = async () => {
    if (userRole !== 'organizer') {
      showToast('Access Denied: Only organizers can export attendance reports.', 'error');
      return;
    }

    setIsExporting(true);

    try {
      const queryParams = new URLSearchParams({
        search,
        rsvpStatus: rsvpFilter,
        attendanceStatus: attendanceFilter
      });

      const res = await fetch(`/api/events/${selectedEventId}/attendance/export?${queryParams.toString()}`, {
        headers: {
          'X-User-Role': userRole,
          'X-User-Name': 'Organizer Admin'
        }
      });

      if (res.status === 403) {
        const err = await res.json();
        showToast(err.message || 'Access denied for export.', 'error');
        setIsExporting(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      // Download CSV Blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-${selectedEventId}-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('Attendance report CSV downloaded successfully!', 'success');
    } catch (err) {
      console.error('CSV Export Error:', err);
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Formatter for timestamp strings
  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'Not checked in';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="checkin-container">
      {/* Toast Feedback Banner */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <span className="toast-text">{toast.message}</span>
        </div>
      )}

      {/* Screen Title & Controls Bar */}
      <div className="checkin-header">
        <div className="header-titles">
          <h2 className="checkin-title">
            <span className="title-icon">📋</span> Organizer Check-in & Attendance Desk
          </h2>
          <p className="checkin-subtitle">
            {selectedEvent ? <strong>{selectedEvent.title} — </strong> : null}
            Manage real-time event day attendance, confirm RSVPs, mark check-in timestamps, and export audit records.
          </p>
        </div>

        {/* Role Badge */}
        <div className="role-switcher-card">
          <div className="role-buttons">
            <span className="role-btn active-organizer" style={{ cursor: 'default' }}>
              👑 Organizer (Authorized)
            </span>
          </div>
        </div>
      </div>

      {/* Event Selector & Action Bar */}
      <div className="event-selection-bar">
        <div className="event-picker flex-1">
          <label htmlFor="event-select" className="picker-label">Select Event:</label>
          <select
            id="event-select"
            className="event-select-dropdown"
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setPage(1);
              setSelectedRegIds([]);
            }}
          >
            {events.map((evt) => (
              <option key={evt.id || evt.itemKey} value={evt.id || evt.itemKey}>
                {evt.title} ({evt.date || 'Upcoming'})
              </option>
            ))}
          </select>
        </div>

        <div className="action-buttons-group">
          {onSelectEventForRegister && (
            <button
              type="button"
              className="btn-action btn-secondary"
              onClick={() => onSelectEventForRegister(selectedEvent)}
            >
              ➕ Register Attendee
            </button>
          )}

          <button
            type="button"
            className="btn-action btn-export"
            onClick={handleExportCSV}
            disabled={isExporting || userRole !== 'organizer'}
          >
            {isExporting ? (
              <>⏳ Generating CSV...</>
            ) : (
              <>📥 Export Current Attendance (CSV)</>
            )}
          </button>
          
          <button
            type="button"
            className={`btn-action btn-audit ${showAuditLogs ? 'active' : ''}`}
            onClick={() => setShowAuditLogs(!showAuditLogs)}
            disabled={userRole !== 'organizer'}
            aria-expanded={showAuditLogs}
            aria-controls="audit-log-panel"
          >
            📜 {showAuditLogs ? 'Hide Audit Log' : 'View Audit Trail'}
          </button>
        </div>
      </div>

      {/* 403 Authorization Banner if Unauthorized */}
      {authError ? (
        <div className="auth-error-banner">
          <div className="banner-icon">🔒</div>
          <div className="banner-content">
            <h3>403 Forbidden - Access Restricted</h3>
            <p>{authError}</p>
            <span className="hint-text">
              Switch role back to <strong>"Organizer (Authorized)"</strong> above to manage attendance data.
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Dashboard Cards */}
          <div className="summary-cards-grid">
            <div className="summary-card total-card">
              <div className="card-header">
                <span className="card-title">Total Registrations</span>
                <span className="card-icon">🎟️</span>
              </div>
              <div className="card-value">{summary.totalRegistrations}</div>
              <div className="card-detail">
                <span className="tag tag-confirmed">{summary.confirmedCount} Confirmed</span>
                <span className="tag tag-waitlist">{summary.waitlistCount} Waitlist</span>
              </div>
            </div>

            <div className="summary-card present-card">
              <div className="card-header">
                <span className="card-title">Present / Checked In</span>
                <span className="card-icon">✅</span>
              </div>
              <div className="card-value text-green">{summary.presentCount}</div>
              <div className="card-detail text-muted">
                {summary.totalRegistrations > 0
                  ? `${Math.round((summary.presentCount / summary.totalRegistrations) * 100)}% of total registrants`
                  : 'No RSVPs yet'}
              </div>
            </div>

            <div className="summary-card absent-card">
              <div className="card-header">
                <span className="card-title">Absent / Pending</span>
                <span className="card-icon">⏳</span>
              </div>
              <div className="card-value text-amber">{summary.absentCount}</div>
              <div className="card-detail text-muted">Awaiting check-in at venue</div>
            </div>

            <div className="summary-card rate-card">
              <div className="card-header">
                <span className="card-title">Attendance Rate</span>
                <span className="card-icon">📈</span>
              </div>
              <div className="card-value text-indigo">{summary.attendancePercentage}%</div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, summary.attendancePercentage))}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Search, Filter & Bulk Control Bar */}
          <div className="table-controls-panel">
            {/* Search Input */}
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search by registrant name or email..."
                value={search}
                onChange={handleSearchChange}
              />
              {search && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearch('')}
                  aria-label="Clear search input"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="filters-group">
              <div className="filter-item">
                <label className="filter-label">RSVP Status:</label>
                <select className="filter-select" value={rsvpFilter} onChange={handleRsvpFilterChange}>
                  <option value="all">All (Confirmed & Waitlist)</option>
                  <option value="confirmed">Confirmed RSVPs</option>
                  <option value="waitlist">Waitlist Only</option>
                </select>
              </div>

              <div className="filter-item">
                <label className="filter-label">Attendance:</label>
                <select
                  className="filter-select"
                  value={attendanceFilter}
                  onChange={handleAttendanceFilterChange}
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present Only</option>
                  <option value="absent">Absent Only</option>
                </select>
              </div>

              <div className="filter-item">
                <label className="filter-label">Sort By:</label>
                <select
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="fullName">Name (A-Z)</option>
                  <option value="createdAt">Registration Time</option>
                  <option value="checkInAt">Check-in Time</option>
                </select>
              </div>

              <div className="filter-item">
                <label className="filter-label">Order:</label>
                <select
                  className="filter-select"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Operations Toolbar */}
          <div className="bulk-actions-toolbar">
            <div className="bulk-left">
              <span className="selection-count">
                {selectedRegIds.length > 0
                  ? `Selected ${selectedRegIds.length} registrant(s)`
                  : 'Select rows for bulk check-in'}
              </span>
            </div>

            <div className="bulk-right-buttons">
              <button
                type="button"
                className="btn-bulk btn-bulk-present"
                onClick={() => handleBulkAttendanceUpdate(true)}
                disabled={selectedRegIds.length === 0}
              >
                ✓ Mark Selected Present
              </button>

              <button
                type="button"
                className="btn-bulk btn-bulk-absent"
                onClick={() => handleBulkAttendanceUpdate(false)}
                disabled={selectedRegIds.length === 0}
              >
                ✕ Mark Selected Absent
              </button>

              <button
                type="button"
                className="btn-bulk btn-bulk-page-present"
                onClick={handleMarkPageAllPresent}
                disabled={attendanceData.length === 0}
              >
                ⚡ Mark Page All Present
              </button>
            </div>
          </div>

          {/* Registrants Attendance Data Table */}
          <div className="table-responsive-wrapper">
            {isLoading ? (
              <div className="table-loading-spinner">
                <div className="spinner"></div>
                <p>Loading attendance records...</p>
              </div>
            ) : attendanceData.length === 0 ? (
              <div className="table-empty-state">
                <div className="empty-icon">👥</div>
                <h3>No registrants found</h3>
                <p>No RSVPs match your current search and filter criteria.</p>
                {search || rsvpFilter !== 'all' || attendanceFilter !== 'all' ? (
                  <button
                    type="button"
                    className="btn-reset-filters"
                    onClick={() => {
                      setSearch('');
                      setRsvpFilter('all');
                      setAttendanceFilter('all');
                    }}
                  >
                    Reset All Filters
                  </button>
                ) : null}
              </div>
            ) : (
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th className="th-checkbox">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={handleSelectAllOnPage}
                        title="Select/Deselect all on current page"
                      />
                    </th>
                    <th>Registrant Details</th>
                    <th>Ticket Type</th>
                    <th>RSVP Status</th>
                    <th>Attendance Status</th>
                    <th>Check-in Timestamp</th>
                    <th>Audit Details</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((record) => {
                    const regId = record._id || record.id;
                    const isSelected = selectedRegIds.includes(regId);
                    const isPresent = Boolean(record.statusPresent);
                    const isWaitlist = (record.rsvpStatus || '').toLowerCase() === 'waitlist';

                    return (
                      <tr
                        key={regId}
                        className={`tr-row ${isPresent ? 'row-present' : 'row-absent'} ${
                          isSelected ? 'row-selected' : ''
                        }`}
                      >
                        <td className="td-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(regId)}
                          />
                        </td>

                        <td className="td-user">
                          <div className="user-avatar-name">
                            <div className={`avatar-circle ${isPresent ? 'avatar-green' : 'avatar-gray'}`}>
                              {record.fullName ? record.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="user-info">
                              <span className="user-name">{record.fullName}</span>
                              <span className="user-email">{record.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="td-ticket">
                          <span className="ticket-badge">
                            {record.ticketType || 'standard'} ({record.attendees || 1})
                          </span>
                        </td>

                        <td className="td-rsvp">
                          <span className={`rsvp-badge ${isWaitlist ? 'badge-waitlist' : 'badge-confirmed'}`}>
                            {isWaitlist ? '⏳ Waitlist' : '✅ Confirmed RSVP'}
                          </span>
                        </td>

                        <td className="td-status">
                          <span className={`status-pill ${isPresent ? 'pill-present' : 'pill-absent'}`}>
                            {isPresent ? '● Present' : '○ Absent'}
                          </span>
                        </td>

                        <td className="td-timestamp">
                          <span className={`timestamp-text ${record.checkInAt ? 'text-highlight' : 'text-dim'}`}>
                            {formatTimestamp(record.checkInAt)}
                          </span>
                        </td>

                        <td className="td-audit">
                          <span className="audit-text" title={record.markedBy || 'N/A'}>
                            {record.markedBy ? record.markedBy.split(' ')[0] : 'System'}
                          </span>
                        </td>

                        <td className="td-actions">
                          <button
                            type="button"
                            className={`btn-toggle-status ${isPresent ? 'btn-mark-absent' : 'btn-mark-present'}`}
                            onClick={() => handleToggleSingleAttendance(regId, isPresent, record.fullName)}
                            aria-pressed={isPresent}
                            aria-label={`Mark ${record.fullName || 'attendee'} as ${isPresent ? 'Absent' : 'Present'}`}
                          >
                            {isPresent ? 'Mark Absent ✕' : 'Mark Present ✓'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <div className="pagination-info">
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total registrants)
              </div>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  ◀ Previous
                </button>

                <div className="page-numbers">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`page-num-btn ${page === p ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="page-btn"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                >
                  Next ▶
                </button>

                <div className="page-size-selector">
                  <span className="size-label">Per page:</span>
                  <select
                    className="size-select"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Real-time Audit Trail Panel */}
      {showAuditLogs && userRole === 'organizer' && (
        <div className="audit-log-panel" id="audit-log-panel" role="region" aria-label="Event Audit Trail">
          <div className="audit-panel-header">
            <h3>📜 Event Check-in Audit Trail Log</h3>
            <button
              type="button"
              className="btn-close-audit"
              onClick={() => setShowAuditLogs(false)}
              aria-label="Close audit log panel"
            >
              ✕ Close
            </button>
          </div>

          <div className="audit-log-content">
            {auditLogs.length === 0 ? (
              <p className="no-audit-logs">No audit entries recorded for this event yet.</p>
            ) : (
              <div className="audit-logs-list">
                {auditLogs.map((log, index) => (
                  <div key={log.id || log._id || index} className="audit-log-item">
                    <div className="audit-log-icon">
                      {log.statusPresent ? '🟢' : '🔴'}
                    </div>
                    <div className="audit-log-details">
                      <div className="audit-log-title">
                        <strong>{log.attendeeName || 'Attendee'}</strong> was marked{' '}
                        <span className={log.statusPresent ? 'text-green' : 'text-amber'}>
                          {log.statusPresent ? 'PRESENT' : 'ABSENT'}
                        </span>
                      </div>
                      <div className="audit-log-meta">
                        <span>Email: {log.attendeeEmail || 'N/A'}</span> •{' '}
                        <span>Performed by: {log.performedBy || 'Organizer Admin'}</span> •{' '}
                        <span>Role: {log.userRole || 'organizer'}</span>
                      </div>
                    </div>
                    <div className="audit-log-time">
                      {formatTimestamp(log.timestamp || log.checkInAt || log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizerCheckIn;
