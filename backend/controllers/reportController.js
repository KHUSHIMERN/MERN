const mongoose = require('mongoose');
const EventReport = require('../models/EventReport');
const Event = require('../models/Event');
const AuditLog = require('../models/AuditLog');
const { INITIAL_EVENTS, memoryReports, memoryAuditLogs } = require('../data/seedEvents');

const isConnectedToMongoDB = () => mongoose.connection.readyState === 1;

const VALID_REASONS = ['spam', 'inappropriate', 'misleading', 'safety_concern', 'scam', 'other'];
const VALID_VERIFICATION_STATUSES = ['verified', 'rejected', 'pending'];

/**
 * POST /api/events/:id/report
 * Resident/Attendee reports a suspicious or inappropriate event
 */
const createReport = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { reason, details } = req.body;

    const reporterId = req.user?._id?.toString() || req.user?.id?.toString() || req.body.reporterId;
    const reporterName = req.user?.name || req.body.reporterName || 'Community Member';
    const reporterEmail = req.user?.email || req.body.reporterEmail || '';

    if (!reporterId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to report an event.',
      });
    }

    if (!reason || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing reason. Must be one of: ${VALID_REASONS.join(', ')}`,
      });
    }

    // 1. Locate Event
    let eventTitle = '';
    let foundEvent = null;

    if (isConnectedToMongoDB()) {
      try {
        foundEvent = mongoose.Types.ObjectId.isValid(eventId)
          ? await Event.findById(eventId)
          : await Event.findOne({ $or: [{ id: eventId }, { itemKey: eventId }] });
        if (foundEvent) eventTitle = foundEvent.title;
      } catch {
        foundEvent = null;
      }
    }

    if (!foundEvent) {
      foundEvent = INITIAL_EVENTS.find(
        (e) => String(e.id) === String(eventId) || String(e._id) === String(eventId)
      );
      if (foundEvent) eventTitle = foundEvent.title;
    }

    if (!foundEvent) {
      return res.status(404).json({
        success: false,
        message: `Event not found with ID: ${eventId}`,
      });
    }

    // 2. Prevent duplicate active reports by same user on same event
    if (isConnectedToMongoDB()) {
      const existing = await EventReport.findOne({
        eventId: foundEvent._id || eventId,
        reporterId,
        status: { $in: ['pending', 'reviewed'] },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: 'You have already submitted a report for this event. Our moderation team is reviewing it.',
          report: existing,
        });
      }
    } else {
      const existing = (memoryReports || []).find(
        (r) =>
          String(r.eventId) === String(eventId) &&
          String(r.reporterId) === String(reporterId) &&
          ['pending', 'reviewed'].includes(r.status)
      );
      if (existing) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: 'You have already submitted a report for this event. Our moderation team is reviewing it.',
          report: existing,
        });
      }
    }

    // 3. Save report
    let createdReport = null;
    const nowIso = new Date().toISOString();

    if (isConnectedToMongoDB()) {
      createdReport = await EventReport.create({
        eventId: foundEvent._id || eventId,
        eventTitle,
        reporterId,
        reporterName,
        reporterEmail,
        reason,
        details: (details || '').trim(),
        status: 'pending',
      });

      // Increment reportsCount and flag event
      await Event.findByIdAndUpdate(foundEvent._id, {
        $inc: { reportsCount: 1 },
        $set: { isReported: true },
      });
    } else {
      const newReportId = `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      createdReport = {
        _id: newReportId,
        id: newReportId,
        eventId,
        eventTitle,
        reporterId,
        reporterName,
        reporterEmail,
        reason,
        details: (details || '').trim(),
        status: 'pending',
        actionTaken: 'none',
        adminNotes: '',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      memoryReports.unshift(createdReport);

      // Update in-memory event
      foundEvent.reportsCount = (foundEvent.reportsCount || 0) + 1;
      foundEvent.isReported = true;
    }

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our safety team will review this event.',
      report: createdReport,
    });
  } catch (error) {
    console.error('Error creating event report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit report.',
      error: error.message,
    });
  }
};

/**
 * GET /api/events/:id/my-report
 * Check if the current user has already reported this event
 */
const getUserReportForEvent = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const reporterId = req.user?._id?.toString() || req.user?.id?.toString() || req.query.userId;

    if (!reporterId) {
      return res.status(200).json({ success: true, hasReported: false, report: null });
    }

    let report = null;
    if (isConnectedToMongoDB()) {
      report = await EventReport.findOne({
        $or: [{ eventId }, { eventId: mongoose.Types.ObjectId.isValid(eventId) ? new mongoose.Types.ObjectId(eventId) : null }],
        reporterId,
      }).sort({ createdAt: -1 });
    } else {
      report = (memoryReports || []).find(
        (r) => String(r.eventId) === String(eventId) && String(r.reporterId) === String(reporterId)
      );
    }

    return res.status(200).json({
      success: true,
      hasReported: Boolean(report),
      report: report || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/reports
 * Admin view of all reported events (with status filters & pagination)
 */
const getReports = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 15);
    const statusFilter = req.query.status || 'pending';
    const skip = (page - 1) * limit;

    let total = 0;
    let reports = [];

    if (isConnectedToMongoDB()) {
      const query = statusFilter === 'all' ? {} : { status: statusFilter };
      total = await EventReport.countDocuments(query);
      reports = await EventReport.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } else {
      let filtered = (memoryReports || []).slice();
      if (statusFilter !== 'all') {
        filtered = filtered.filter((r) => r.status === statusFilter);
      }
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      total = filtered.length;
      reports = filtered.slice(skip, skip + limit);
    }

    return res.status(200).json({
      success: true,
      count: reports.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      reports,
    });
  } catch (error) {
    console.error('GET /api/admin/reports Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/admin/reports/:id
 * Admin resolves or dismisses an event report
 */
const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action, adminNotes } = req.body;

    const adminId = req.user?._id || req.user?.id || 'admin-1';
    const adminName = req.user?.name || 'Administrator';

    let targetReport = null;

    if (isConnectedToMongoDB()) {
      targetReport = mongoose.Types.ObjectId.isValid(id)
        ? await EventReport.findById(id)
        : await EventReport.findOne({ id });
    } else {
      targetReport = (memoryReports || []).find((r) => String(r._id) === String(id) || String(r.id) === String(id));
    }

    if (!targetReport) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const nextStatus = status || (action === 'dismiss' ? 'dismissed' : 'action_taken');
    const actionTaken = action || (nextStatus === 'dismissed' ? 'dismissed' : 'none');

    targetReport.status = nextStatus;
    targetReport.actionTaken = actionTaken;
    targetReport.adminNotes = (adminNotes || '').trim();
    targetReport.reviewedBy = adminId;
    targetReport.reviewedAt = new Date();

    if (isConnectedToMongoDB()) {
      await targetReport.save();

      // Perform event actions if specified
      if (action === 'unverify') {
        await Event.findByIdAndUpdate(targetReport.eventId, {
          $set: { verificationStatus: 'rejected', isVerified: false },
        });
      } else if (action === 'unpublish') {
        await Event.findByIdAndUpdate(targetReport.eventId, {
          $set: { published: false, verificationStatus: 'rejected', isVerified: false },
        });
      }

      // Log in AuditLog
      try {
        await AuditLog.create({
          action: `REPORT_${nextStatus.toUpperCase()}`,
          adminId,
          details: `Admin ${adminName} resolved report #${targetReport._id} for event '${targetReport.eventTitle}'. Action: ${actionTaken}. Notes: ${adminNotes || 'None'}`,
        });
      } catch (logErr) {
        console.warn('AuditLog save error:', logErr.message);
      }
    } else {
      targetReport.updatedAt = new Date().toISOString();

      // Find in-memory event
      const evt = INITIAL_EVENTS.find((e) => String(e.id) === String(targetReport.eventId) || String(e._id) === String(targetReport.eventId));
      if (evt) {
        if (action === 'unverify') {
          evt.verificationStatus = 'rejected';
          evt.isVerified = false;
        } else if (action === 'unpublish') {
          evt.published = false;
          evt.verificationStatus = 'rejected';
          evt.isVerified = false;
        }
      }

      if (memoryAuditLogs) {
        memoryAuditLogs.unshift({
          action: `REPORT_${nextStatus.toUpperCase()}`,
          performer: adminName,
          details: `Resolved report for ${targetReport.eventTitle} with action: ${actionTaken}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Report marked as '${nextStatus}'. Action: ${actionTaken}`,
      report: targetReport,
    });
  } catch (error) {
    console.error('PATCH /api/admin/reports/:id Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/admin/events/:id/verify
 * Admin approves or rejects event verification
 */
const verifyEvent = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { verificationStatus, adminNotes } = req.body;

    if (!verificationStatus || !VALID_VERIFICATION_STATUSES.includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid verificationStatus. Must be one of: ${VALID_VERIFICATION_STATUSES.join(', ')}`,
      });
    }

    const adminId = req.user?._id || req.user?.id || 'admin-1';
    const adminName = req.user?.name || 'Administrator';
    const isVerified = verificationStatus === 'verified';

    let updatedEvent = null;

    if (isConnectedToMongoDB()) {
      const updateData = {
        verificationStatus,
        isVerified,
        verifiedBy: adminId,
        verifiedAt: new Date(),
      };
      if (verificationStatus === 'rejected') {
        updateData.published = false;
      }

      updatedEvent = mongoose.Types.ObjectId.isValid(eventId)
        ? await Event.findByIdAndUpdate(eventId, { $set: updateData }, { new: true })
        : await Event.findOneAndUpdate({ $or: [{ id: eventId }, { itemKey: eventId }] }, { $set: updateData }, { new: true });

      if (!updatedEvent) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }

      try {
        await AuditLog.create({
          action: `EVENT_VERIFICATION_${verificationStatus.toUpperCase()}`,
          adminId,
          details: `Admin ${adminName} set verification status to '${verificationStatus}' for event '${updatedEvent.title}'. Note: ${adminNotes || 'None'}`,
        });
      } catch (logErr) {
        console.warn('AuditLog save error:', logErr.message);
      }
    } else {
      updatedEvent = INITIAL_EVENTS.find(
        (e) => String(e.id) === String(eventId) || String(e._id) === String(eventId)
      );
      if (!updatedEvent) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }

      updatedEvent.verificationStatus = verificationStatus;
      updatedEvent.isVerified = isVerified;
      updatedEvent.verifiedBy = adminId;
      updatedEvent.verifiedAt = new Date().toISOString();
      if (verificationStatus === 'rejected') {
        updatedEvent.published = false;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Event verification status set to '${verificationStatus}'.`,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('PATCH /api/admin/events/:id/verify Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/events/pending
 * Retrieve events pending admin verification approval
 */
const getPendingEvents = async (req, res) => {
  try {
    let pendingEvents = [];

    if (isConnectedToMongoDB()) {
      pendingEvents = await Event.find({ verificationStatus: 'pending' })
        .sort({ createdAt: -1 })
        .lean();
    } else {
      pendingEvents = (INITIAL_EVENTS || []).filter(
        (e) => e.verificationStatus === 'pending'
      );
    }

    return res.status(200).json({
      success: true,
      count: pendingEvents.length,
      events: pendingEvents,
    });
  } catch (error) {
    console.error('GET /api/admin/events/pending Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createReport,
  getUserReportForEvent,
  getReports,
  resolveReport,
  verifyEvent,
  getPendingEvents,
};
