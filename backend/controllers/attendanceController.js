const mongoose = require('mongoose');
const RSVP = require('../models/RSVP');
const Event = require('../models/Event');
const AuditLog = require('../models/AuditLog');
const { memoryRegistrations, memoryAuditLogs } = require('../data/seedEvents');
const { migrateLegacyRsvpsForEvent } = require('../services/rsvpService');
const isConnectedToMongoDB = () => mongoose.connection.readyState === 1;

const canManageEvent = (user, event) => {
  if (user?.role === 'admin') return true;
  if (user?.role !== 'organizer') return false;
  const ownerId = event.organizer?._id || event.organizer || event.organizerId;
  return ownerId?.toString() === user._id?.toString();
};

const loadManagedEvent = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404).json({ message: 'Event not found.' });
    return null;
  }
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ message: 'Event not found.' });
    return null;
  }
  if (!canManageEvent(req.user, event)) {
    res.status(403).json({ message: 'Only this event owner or an administrator can manage event attendance.' });
    return null;
  }
  return event;
};

const toAttendanceRecord = (record, waitlistPosition = null) => ({
  _id: record._id.toString(),
  id: record._id.toString(),
  eventId: record.eventId.toString(),
  userId: record.userId?._id?.toString() || record.userId?.toString(),
  fullName: record.userId?.name || 'Resident',
  email: record.userId?.email || '',
  ticketType: 'standard',
  attendees: 1,
  rsvpStatus: record.status,
  waitlistPosition,
  statusPresent: record.status === 'confirmed' && Boolean(record.statusPresent),
  checkInAt: record.status === 'confirmed' ? record.checkInAt : null,
  markedBy: record.markedBy,
  createdAt: record.createdAt,
});

const filterAndSortRecords = (records, { search, rsvpStatus, attendanceStatus, sortBy, sortOrder }) => {
  let filtered = [...records];
  if (search.trim()) {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter((record) =>
      record.fullName.toLowerCase().includes(term) || record.email.toLowerCase().includes(term)
    );
  }
  if (rsvpStatus !== 'all') filtered = filtered.filter((record) => record.rsvpStatus === rsvpStatus);
  if (attendanceStatus === 'present') filtered = filtered.filter((record) => record.statusPresent);
  if (attendanceStatus === 'absent') {
    filtered = filtered.filter((record) => record.rsvpStatus === 'confirmed' && !record.statusPresent);
  }

  const direction = sortOrder === 'asc' ? 1 : -1;
  filtered.sort((left, right) => {
    const leftValue = left[sortBy] || '';
    const rightValue = right[sortBy] || '';
    return String(leftValue).localeCompare(String(rightValue)) * direction;
  });
  return filtered;
};

/**
 * GET /api/events/:id/attendance
 * Fetch attendance list with search, filtering (rsvpStatus, attendanceStatus), pagination & summary.
 */
const getEventAttendance = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const {
      search = '',
      rsvpStatus = 'all',
      attendanceStatus = 'all',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);

    if (isConnectedToMongoDB()) {
      const event = await loadManagedEvent(req, res);
      if (!event) return;
      await migrateLegacyRsvpsForEvent(event);

      const normalizedRsvps = await RSVP.find({
        eventId,
        status: { $in: ['confirmed', 'waitlist'] },
      })
        .populate('userId', 'name email')
        .sort({ waitlistedAt: 1, createdAt: 1, _id: 1 });

      let waitlistPosition = 0;
      const allEventRecords = normalizedRsvps.map((record) => {
        if (record.status === 'waitlist') waitlistPosition += 1;
        return toAttendanceRecord(record, record.status === 'waitlist' ? waitlistPosition : null);
      });
      const confirmedRecords = allEventRecords.filter((record) => record.rsvpStatus === 'confirmed');
      const presentCount = confirmedRecords.filter((record) => record.statusPresent).length;
      const summary = {
        totalRegistrations: allEventRecords.length,
        confirmedCount: confirmedRecords.length,
        waitlistCount: allEventRecords.length - confirmedRecords.length,
        presentCount,
        absentCount: confirmedRecords.length - presentCount,
        attendancePercentage: confirmedRecords.length > 0
          ? Math.round((presentCount / confirmedRecords.length) * 100)
          : 0
      };

      const filtered = filterAndSortRecords(allEventRecords, {
        search,
        rsvpStatus,
        attendanceStatus,
        sortBy,
        sortOrder,
      });
      const totalFiltered = filtered.length;
      const totalPages = Math.ceil(totalFiltered / limitNum) || 1;
      const records = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return res.json({
        success: true,
        summary,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalFiltered,
          totalPages
        },
        data: records
      });
    }

    // In-memory Fallback Store
    let allRecords = memoryRegistrations.filter((r) => r.eventId === eventId);
    if (allRecords.length === 0 && (eventId === 'evt-1' || eventId === 'evt-2')) {
      allRecords = memoryRegistrations;
    }

    const summary = {
      totalRegistrations: allRecords.length,
      confirmedCount: allRecords.filter((r) => r.rsvpStatus !== 'waitlist').length,
      waitlistCount: allRecords.filter((r) => r.rsvpStatus === 'waitlist').length,
      presentCount: allRecords.filter((r) => r.statusPresent).length,
      absentCount: allRecords.filter((r) => !r.statusPresent).length,
      attendancePercentage: allRecords.length > 0
        ? Math.round((allRecords.filter((r) => r.statusPresent).length / allRecords.length) * 100)
        : 0
    };

    let filtered = [...allRecords];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.fullName && r.fullName.toLowerCase().includes(term)) ||
          (r.email && r.email.toLowerCase().includes(term)) ||
          (r.ticketType && r.ticketType.toLowerCase().includes(term))
      );
    }

    if (rsvpStatus && rsvpStatus !== 'all') {
      filtered = filtered.filter((r) => (r.rsvpStatus || 'confirmed') === rsvpStatus);
    }

    if (attendanceStatus && attendanceStatus !== 'all') {
      if (attendanceStatus === 'present') filtered = filtered.filter((r) => r.statusPresent);
      if (attendanceStatus === 'absent') filtered = filtered.filter((r) => !r.statusPresent);
    }

    // Sorting
    filtered.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedData = filtered.slice(startIndex, startIndex + limitNum);

    return res.json({
      success: true,
      summary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalFiltered,
        totalPages
      },
      data: paginatedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/events/:id/attendance
 * Update single or bulk attendance status (statusPresent: true/false).
 * Persists checkInAt timestamp, markedBy, and records audit logs.
 */
const updateEventAttendance = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const { registrationId, statusPresent, updates, registrationIds } = req.body;
    const performer = req.performer || { identity: 'Organizer Admin (organizer@eventpulse.org)' };

    const itemsToUpdate = [];

    // Format 1: Single item update { registrationId, statusPresent }
    if (registrationId !== undefined && statusPresent !== undefined) {
      itemsToUpdate.push({
        registrationId,
        statusPresent: Boolean(statusPresent)
      });
    }
    // Format 2: Array of updates [{ registrationId, statusPresent }]
    else if (Array.isArray(updates)) {
      updates.forEach((item) => {
        if (item.registrationId !== undefined && item.statusPresent !== undefined) {
          itemsToUpdate.push({
            registrationId: item.registrationId,
            statusPresent: Boolean(item.statusPresent)
          });
        }
      });
    }
    // Format 3: Array of IDs with single statusPresent { registrationIds: [...], statusPresent: true }
    else if (Array.isArray(registrationIds) && statusPresent !== undefined) {
      registrationIds.forEach((regId) => {
        itemsToUpdate.push({
          registrationId: regId,
          statusPresent: Boolean(statusPresent)
        });
      });
    }

    if (itemsToUpdate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Please provide registrationId or updates array with statusPresent.'
      });
    }

    const updatedRecords = [];
    const auditEntries = [];
    const now = new Date();

    if (isConnectedToMongoDB()) {
      const event = await loadManagedEvent(req, res);
      if (!event) return;
      const blockedWaitlistIds = [];

      for (const item of itemsToUpdate) {
        if (!mongoose.Types.ObjectId.isValid(item.registrationId)) continue;
        const checkInAtValue = item.statusPresent ? now : null;

        const reg = await RSVP.findOneAndUpdate(
          { _id: item.registrationId, eventId, status: 'confirmed' },
          {
            $set: {
              statusPresent: item.statusPresent,
              checkInAt: checkInAtValue,
              markedBy: performer.identity
            }
          },
          { returnDocument: 'after' }
        ).populate('userId', 'name email');

        if (reg) {
          updatedRecords.push(toAttendanceRecord(reg));

          // Save Audit Log
          const audit = await AuditLog.create({
            action: item.statusPresent ? 'ATTENDANCE_CHECKIN' : 'ATTENDANCE_CHECKOUT',
            eventId: eventId || reg.eventId,
            registrationId: reg._id ? reg._id.toString() : reg.id,
            attendeeName: reg.userId?.name || 'Resident',
            attendeeEmail: reg.userId?.email || '',
            statusPresent: item.statusPresent,
            checkInAt: checkInAtValue,
            performedBy: performer.identity,
            userRole: 'organizer',
            timestamp: now
          });
          auditEntries.push(audit);
        } else {
          const waitlisted = await RSVP.exists({ _id: item.registrationId, eventId, status: 'waitlist' });
          if (waitlisted) blockedWaitlistIds.push(item.registrationId);
        }
      }

      if (updatedRecords.length === 0 && blockedWaitlistIds.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Waitlisted residents cannot be checked in until they are promoted to confirmed.',
          blockedWaitlistIds,
        });
      }

      if (updatedRecords.length > 0) {
        const checkedInRecords = await RSVP.find({
          eventId,
          status: 'confirmed',
          statusPresent: true,
        }).select('userId').lean();
        await Event.findByIdAndUpdate(eventId, {
          $set: {
            checkedInCount: checkedInRecords.length,
            checkedInUsers: checkedInRecords.map((record) => record.userId),
          },
        });
      }

      return res.json({
        success: true,
        message: `Successfully updated attendance status for ${updatedRecords.length} registrant(s).`,
        count: updatedRecords.length,
        skippedWaitlistCount: blockedWaitlistIds.length,
        data: updatedRecords,
        auditLogs: auditEntries
      });
    }

    // In-Memory Update & Audit Logging
    for (const item of itemsToUpdate) {
      const idx = memoryRegistrations.findIndex(
        (r) => r.id === item.registrationId || r._id === item.registrationId
      );

      if (idx !== -1) {
        const checkInAtValue = item.statusPresent ? now.toISOString() : null;
        memoryRegistrations[idx].statusPresent = item.statusPresent;
        memoryRegistrations[idx].checkInAt = checkInAtValue;
        memoryRegistrations[idx].markedBy = performer.identity;

        updatedRecords.push(memoryRegistrations[idx]);

        const auditItem = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          action: item.statusPresent ? 'ATTENDANCE_CHECKIN' : 'ATTENDANCE_CHECKOUT',
          eventId: eventId || memoryRegistrations[idx].eventId,
          registrationId: memoryRegistrations[idx].id,
          attendeeName: memoryRegistrations[idx].fullName,
          attendeeEmail: memoryRegistrations[idx].email,
          statusPresent: item.statusPresent,
          checkInAt: checkInAtValue,
          performedBy: performer.identity,
          userRole: 'organizer',
          timestamp: now.toISOString()
        };
        memoryAuditLogs.unshift(auditItem);
        auditEntries.push(auditItem);
      }
    }

    return res.json({
      success: true,
      message: `Successfully updated attendance status for ${updatedRecords.length} registrant(s).`,
      count: updatedRecords.length,
      data: updatedRecords,
      auditLogs: auditEntries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:id/attendance/export
 * Streams CSV file of attendance data for an event.
 */
const exportEventAttendance = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const { search = '', rsvpStatus = 'all', attendanceStatus = 'all' } = req.query;

    let records = [];

    if (isConnectedToMongoDB()) {
      const event = await loadManagedEvent(req, res);
      if (!event) return;
      await migrateLegacyRsvpsForEvent(event);
      const normalizedRsvps = await RSVP.find({
        eventId,
        status: { $in: ['confirmed', 'waitlist'] },
      }).populate('userId', 'name email');
      records = filterAndSortRecords(
        normalizedRsvps.map((record) => toAttendanceRecord(record)),
        { search, rsvpStatus, attendanceStatus, sortBy: 'fullName', sortOrder: 'asc' }
      );
    } else {
      records = memoryRegistrations.filter((r) => r.eventId === eventId);
      if (records.length === 0 && (eventId === 'evt-1' || eventId === 'evt-2')) {
        records = memoryRegistrations;
      }

      if (search.trim()) {
        const term = search.trim().toLowerCase();
        records = records.filter(
          (r) =>
            (r.fullName && r.fullName.toLowerCase().includes(term)) ||
            (r.email && r.email.toLowerCase().includes(term))
        );
      }
      if (rsvpStatus && rsvpStatus !== 'all') {
        records = records.filter((r) => (r.rsvpStatus || 'confirmed') === rsvpStatus);
      }
      if (attendanceStatus && attendanceStatus !== 'all') {
        if (attendanceStatus === 'present') records = records.filter((r) => r.statusPresent);
        if (attendanceStatus === 'absent') records = records.filter((r) => !r.statusPresent);
      }
    }

    // Escape CSV cell helper
    const cleanCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // CSV Header row
    const headers = [
      'Registration ID',
      'Event ID',
      'Full Name',
      'Email Address',
      'Ticket Type',
      'Attendees Count',
      'RSVP Status',
      'Attendance Status',
      'Check-in Timestamp',
      'Marked By',
      'Notes',
      'Created At'
    ];

    const csvRows = [headers.map(cleanCsvCell).join(',')];

    records.forEach((r) => {
      const regId = r._id ? r._id.toString() : r.id;
      const checkIn = r.checkInAt ? new Date(r.checkInAt).toISOString() : 'N/A';
      const statusText = r.statusPresent ? 'PRESENT' : 'ABSENT';
      const rsvpText = (r.rsvpStatus || 'confirmed').toUpperCase();

      const row = [
        regId,
        r.eventId || eventId,
        r.fullName || '',
        r.email || '',
        r.ticketType || 'standard',
        r.attendees || 1,
        rsvpText,
        statusText,
        checkIn,
        r.markedBy || 'N/A',
        r.notes || '',
        r.createdAt ? new Date(r.createdAt).toISOString() : 'N/A'
      ];

      csvRows.push(row.map(cleanCsvCell).join(','));
    });

    const csvContent = csvRows.join('\r\n');
    const filename = `attendance-${eventId}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:id/attendance/audit-logs
 * Fetch audit logs for an event.
 */
const getAttendanceAuditLogs = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;

    if (isConnectedToMongoDB()) {
      const event = await loadManagedEvent(req, res);
      if (!event) return;
      const logs = await AuditLog.find({ eventId }).sort({ createdAt: -1 }).limit(50);
      return res.json({ success: true, count: logs.length, data: logs });
    }

    const logs = memoryAuditLogs.filter((l) => l.eventId === eventId || !l.eventId);
    return res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEventAttendance,
  updateEventAttendance,
  exportEventAttendance,
  getAttendanceAuditLogs
};
