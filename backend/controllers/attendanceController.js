const connectDB = require('../config/db');
const Registration = require('../models/Registration');
const AuditLog = require('../models/AuditLog');
const { memoryRegistrations, memoryAuditLogs } = require('../data/seedEvents');

const isConnectedToMongoDB = () => Boolean(connectDB.isConnectedToMongoDB);

/**
 * Helper to sync seed data to MongoDB if collection is empty
 */
const ensureMongoSeeded = async (eventId) => {
  if (!isConnectedToMongoDB()) return;
  try {
    const count = await Registration.countDocuments({ eventId });
    if (count === 0 && Array.isArray(memoryRegistrations)) {
      const defaultForEvent = memoryRegistrations.filter((r) => r.eventId === eventId);
      if (defaultForEvent.length > 0) {
        await Registration.insertMany(
          defaultForEvent.map(({ id, ...rest }) => ({
            ...rest,
            _id: id && id.startsWith('reg-') ? undefined : id
          }))
        );
      }
    }
  } catch (err) {
    console.warn('[Mongo Seed Check] Error:', err.message);
  }
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
      await ensureMongoSeeded(eventId);

      // Compute overall summary stats for the event
      const allEventRecords = await Registration.find({ eventId });
      const summary = {
        totalRegistrations: allEventRecords.length,
        confirmedCount: allEventRecords.filter((r) => r.rsvpStatus !== 'waitlist').length,
        waitlistCount: allEventRecords.filter((r) => r.rsvpStatus === 'waitlist').length,
        presentCount: allEventRecords.filter((r) => r.statusPresent).length,
        absentCount: allEventRecords.filter((r) => !r.statusPresent).length,
        attendancePercentage: allEventRecords.length > 0
          ? Math.round((allEventRecords.filter((r) => r.statusPresent).length / allEventRecords.length) * 100)
          : 0
      };

      // Build MongoDB query
      const query = { eventId };

      if (search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [{ fullName: regex }, { email: regex }, { ticketType: regex }];
      }

      if (rsvpStatus && rsvpStatus !== 'all') {
        query.rsvpStatus = rsvpStatus;
      }

      if (attendanceStatus && attendanceStatus !== 'all') {
        if (attendanceStatus === 'present') query.statusPresent = true;
        if (attendanceStatus === 'absent') query.statusPresent = false;
      }

      const sortDir = sortOrder === 'asc' ? 1 : -1;
      const sortOptions = {};
      sortOptions[sortBy] = sortDir;

      const totalFiltered = await Registration.countDocuments(query);
      const totalPages = Math.ceil(totalFiltered / limitNum) || 1;

      const records = await Registration.find(query)
        .sort(sortOptions)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

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
    let allRecords = (memoryRegistrations || []).filter((r) => r.eventId === eventId);
    if (allRecords.length === 0 && (eventId === 'evt-1' || eventId === 'evt-2')) {
      allRecords = memoryRegistrations || [];
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
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
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
      for (const item of itemsToUpdate) {
        const checkInAtValue = item.statusPresent ? now : null;

        const reg = await Registration.findOneAndUpdate(
          { $or: [{ _id: item.registrationId }, { id: item.registrationId }] },
          {
            $set: {
              statusPresent: item.statusPresent,
              checkInAt: checkInAtValue,
              markedBy: performer.identity
            }
          },
          { new: true }
        );

        if (reg) {
          updatedRecords.push(reg);

          // Save Audit Log
          const audit = await AuditLog.create({
            action: item.statusPresent ? 'ATTENDANCE_CHECKIN' : 'ATTENDANCE_CHECKOUT',
            eventId: eventId || reg.eventId,
            registrationId: reg._id ? reg._id.toString() : reg.id,
            attendeeName: reg.fullName,
            attendeeEmail: reg.email,
            statusPresent: item.statusPresent,
            checkInAt: checkInAtValue,
            performedBy: performer.identity,
            userRole: 'organizer',
            timestamp: now
          });
          auditEntries.push(audit);
        }
      }

      return res.json({
        success: true,
        message: `Successfully updated attendance status for ${updatedRecords.length} registrant(s).`,
        count: updatedRecords.length,
        data: updatedRecords,
        auditLogs: auditEntries
      });
    }

    // In-Memory Update & Audit Logging
    for (const item of itemsToUpdate) {
      const idx = (memoryRegistrations || []).findIndex(
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
        if (memoryAuditLogs) memoryAuditLogs.unshift(auditItem);
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
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
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
      await ensureMongoSeeded(eventId);
      const query = { eventId };

      if (search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [{ fullName: regex }, { email: regex }, { ticketType: regex }];
      }

      if (rsvpStatus && rsvpStatus !== 'all') {
        query.rsvpStatus = rsvpStatus;
      }

      if (attendanceStatus && attendanceStatus !== 'all') {
        if (attendanceStatus === 'present') query.statusPresent = true;
        if (attendanceStatus === 'absent') query.statusPresent = false;
      }

      records = await Registration.find(query).sort({ fullName: 1 });
    } else {
      records = (memoryRegistrations || []).filter((r) => r.eventId === eventId);
      if (records.length === 0 && (eventId === 'evt-1' || eventId === 'evt-2')) {
        records = memoryRegistrations || [];
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
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
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
      const logs = await AuditLog.find({ eventId }).sort({ createdAt: -1 }).limit(50);
      return res.json({ success: true, count: logs.length, data: logs });
    }

    const logs = (memoryAuditLogs || []).filter((l) => l.eventId === eventId || !l.eventId);
    return res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEventAttendance,
  updateEventAttendance,
  exportEventAttendance,
  getAttendanceAuditLogs
};
