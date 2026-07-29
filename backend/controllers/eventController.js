const mongoose = require('mongoose');
const connectDB = require('../config/db.js');
const Event = require('../models/Event.js');
const { INITIAL_EVENTS } = require('../data/seedEvents.js');

const isConnectedToMongoDB = () => connectDB.isConnectedToMongoDB;

/**
 * GET /api/events
 * Fetch all events with category, tags, date range, published, and search filter support.
 */
exports.getEvents = async (req, res, next) => {
  try {
    const { category, tags, published, startDate, endDate, search, city } = req.query;

    if (isConnectedToMongoDB()) {
      const query = {};

      if (category && category !== 'all') {
        query.category = category;
      }

      if (city && city !== 'all') {
        query.city = new RegExp(city, 'i');
      }

      if (published !== undefined && published !== 'all') {
        query.published = String(published).toLowerCase() === 'true';
      }

      if (tags) {
        const tagList = Array.isArray(tags)
          ? tags
          : String(tags)
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
        if (tagList.length > 0) {
          query.tags = { $in: tagList };
        }
      }

      if (startDate || endDate) {
        query.startDate = {};
        if (startDate) query.startDate.$gte = new Date(startDate);
        if (endDate) query.startDate.$lte = new Date(endDate);
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { title: regex },
          { description: regex },
          { 'location.placeName': regex },
          { location: regex },
          { city: regex }
        ];
      }

      const events = await Event.find(query).sort({ startDate: 1, createdAt: -1 });
      return res.json({ success: true, count: events.length, data: events, events });
    }

    // In-memory fallback store mode
    let results = [...(INITIAL_EVENTS || [])];

    if (category && category !== 'all') {
      results = results.filter((e) => e.category === category);
    }

    if (city && city !== 'all') {
      results = results.filter((e) => e.city && e.city.toLowerCase() === city.toLowerCase());
    }

    if (published !== undefined && published !== 'all') {
      const isPub = String(published).toLowerCase() === 'true';
      results = results.filter((e) => Boolean(e.published) === isPub);
    }

    if (tags) {
      const tagList = Array.isArray(tags)
        ? tags
        : String(tags)
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);
      if (tagList.length > 0) {
        results = results.filter(
          (e) => Array.isArray(e.tags) && e.tags.some((t) => tagList.includes(t.toLowerCase()))
        );
      }
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      results = results.filter(
        (e) => e.startDate && new Date(e.startDate).getTime() >= start
      );
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      results = results.filter((e) => e.startDate && new Date(e.startDate).getTime() <= end);
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter((e) => {
        const titleMatch = e.title && e.title.toLowerCase().includes(term);
        const descMatch = e.description && e.description.toLowerCase().includes(term);
        const locString = typeof e.location === 'object' ? e.location.placeName : String(e.location);
        const locMatch = locString && locString.toLowerCase().includes(term);
        return titleMatch || descMatch || locMatch;
      });
    }

    return res.json({ success: true, count: results.length, data: results, events: results });
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/events/search?q=<query>
 * Dedicated keyword search endpoint matching title, description, or tags (case-insensitive).
 */
exports.searchEvents = async (req, res, next) => {
  try {
    const q = req.query.q || req.query.search || req.query.query || '';
    const queryTerm = String(q).trim();

    if (!queryTerm) {
      if (isConnectedToMongoDB()) {
        const allEvents = await Event.find({ published: true }).sort({ startDate: 1 });
        return res.json({ success: true, query: '', count: allEvents.length, data: allEvents, events: allEvents });
      }
      const allEvents = (INITIAL_EVENTS || []).filter((e) => Boolean(e.published));
      return res.json({ success: true, query: '', count: allEvents.length, data: allEvents, events: allEvents });
    }

    if (isConnectedToMongoDB()) {
      const escapedTerm = queryTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedTerm, 'i');
      const mongoQuery = {
        $or: [
          { title: regex },
          { description: regex },
          { tags: { $in: [regex] } },
          { 'location.placeName': regex },
          { location: regex }
        ]
      };

      const events = await Event.find(mongoQuery).sort({ startDate: 1, createdAt: -1 });
      return res.json({ success: true, query: queryTerm, count: events.length, data: events, events });
    }

    // In-memory fallback mode
    const term = queryTerm.toLowerCase();
    const results = (INITIAL_EVENTS || []).filter((e) => {
      const titleMatch = e.title && e.title.toLowerCase().includes(term);
      const descMatch = e.description && e.description.toLowerCase().includes(term);
      const tagMatch = Array.isArray(e.tags) && e.tags.some((t) => t.toLowerCase().includes(term));
      const locString = typeof e.location === 'object' ? e.location.placeName : String(e.location);
      const locMatch = locString && locString.toLowerCase().includes(term);

      return titleMatch || descMatch || tagMatch || locMatch;
    });

    return res.json({ success: true, query: queryTerm, count: results.length, data: results, events: results });
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/events/:id
 * Fetch single event by ID or itemKey.
 */
exports.getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isConnectedToMongoDB()) {
      let event = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        event = await Event.findById(id);
      }
      if (!event) {
        event = await Event.findOne({ $or: [{ id }, { itemKey: id }] });
      }

      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      return res.json({ success: true, data: event, event });
    }

    const event = (INITIAL_EVENTS || []).find((e) => e.id === id || e.itemKey === id || e._id === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.json({ success: true, data: event, event });
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/events
 * Create a new event with input validation (required fields & date range sanity).
 */
exports.createEvent = async (req, res, next) => {
  try {
    const {
      title,
      title_hi,
      description,
      description_hi,
      organizerId,
      organizer,
      category,
      tags,
      startDate,
      endDate,
      timezone,
      location,
      city,
      published,
      image,
      imageUrl,
      imageUrlAlt,
      itemKey,
      date,
      seatsLeft,
      capacity
    } = req.body;

    const org = organizerId || organizer;

    // Required fields validation
    if (!title || !title.trim() || !org || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Required fields title, organizerId, and startDate must be provided.'
      });
    }

    const eventTimezone = timezone || 'Asia/Kolkata';
    try {
      Intl.DateTimeFormat(undefined, { timeZone: eventTimezone });
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: `Invalid IANA timezone identifier: '${eventTimezone}'`
      });
    }

    const parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Invalid startDate timestamp format.'
      });
    }

    let parsedEnd = null;
    if (endDate) {
      parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Invalid endDate timestamp format.'
        });
      }

      // Date range sanity check: startDate <= endDate
      if (parsedStart > parsedEnd) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: startDate cannot be after endDate.'
        });
      }
    }

    // Format location object
    let locationObj = location || { placeName: '', latitude: null, longitude: null };

    const formattedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const newEventData = {
      id: `evt-${Date.now()}`,
      itemKey: itemKey || `evt_${Date.now()}`,
      title: title.trim(),
      title_hi: title_hi || '',
      description: description || '',
      description_hi: description_hi || '',
      organizerId: org,
      organizerName: typeof org === 'string' ? org : 'Community Organizer',
      category: category || 'general',
      city: city || 'Jaipur',
      tags: formattedTags,
      startDate: parsedStart,
      endDate: parsedEnd,
      timezone: eventTimezone,
      location: locationObj,
      capacity: capacity ? Number(capacity) : 100,
      published: published !== undefined ? Boolean(published) : true,
      image: image || imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      imageUrl: imageUrl || image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      imageUrlAlt: imageUrlAlt || (title ? `Banner image for ${title}` : 'Event banner image'),
      date: date || parsedStart.toISOString().split('T')[0],
      seatsLeft: seatsLeft !== undefined ? Number(seatsLeft) : 50,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (isConnectedToMongoDB()) {
      const createdEvent = await Event.create(newEventData);
      return res.status(201).json({
        success: true,
        message: 'Event created successfully.',
        id: createdEvent._id.toString(),
        data: createdEvent
      });
    }

    if (INITIAL_EVENTS) INITIAL_EVENTS.push(newEventData);
    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      id: newEventData.id,
      data: newEventData
    });
  } catch (error) {
    if (next) return next(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/events/:id
 * Full update of an event by ID with validation.
 */
exports.updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = { ...req.body };

    if (updatePayload.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: updatePayload.timezone });
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: `Invalid IANA timezone identifier: '${updatePayload.timezone}'`
        });
      }
    }

    // Validate startDate <= endDate if both are updated
    if (updatePayload.startDate || updatePayload.endDate) {
      const start = updatePayload.startDate ? new Date(updatePayload.startDate) : null;
      const end = updatePayload.endDate ? new Date(updatePayload.endDate) : null;

      if (start && isNaN(start.getTime())) {
        return res.status(400).json({ success: false, message: 'Validation Error: Invalid startDate.' });
      }
      if (end && isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: 'Validation Error: Invalid endDate.' });
      }

      if (start && end && start > end) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: startDate cannot be after endDate.'
        });
      }
    }

    if (isConnectedToMongoDB()) {
      let updated = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        updated = await Event.findByIdAndUpdate(id, { $set: updatePayload }, { new: true, runValidators: true });
      }
      if (!updated) {
        updated = await Event.findOneAndUpdate(
          { $or: [{ id }, { itemKey: id }] },
          { $set: updatePayload },
          { new: true, runValidators: true }
        );
      }

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Event not found for update' });
      }

      return res.json({
        success: true,
        message: 'Event updated successfully.',
        data: updated
      });
    }

    // In-memory fallback
    const index = (INITIAL_EVENTS || []).findIndex((e) => e.id === id || e.itemKey === id || e._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Event not found for update' });
    }

    INITIAL_EVENTS[index] = {
      ...INITIAL_EVENTS[index],
      ...updatePayload,
      updatedAt: new Date()
    };

    return res.json({
      success: true,
      message: 'Event updated successfully.',
      data: INITIAL_EVENTS[index]
    });
  } catch (error) {
    if (next) return next(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/events/:id
 * Delete event by ID.
 */
exports.deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isConnectedToMongoDB()) {
      let deleted = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        deleted = await Event.findByIdAndDelete(id);
      }
      if (!deleted) {
        deleted = await Event.findOneAndDelete({ $or: [{ id }, { itemKey: id }] });
      }

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Event not found for deletion' });
      }

      return res.json({ success: true, message: 'Event deleted successfully.' });
    }

    // In-memory fallback
    const index = (INITIAL_EVENTS || []).findIndex((e) => e.id === id || e.itemKey === id || e._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Event not found for deletion' });
    }

    INITIAL_EVENTS.splice(index, 1);
    return res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/events/:id/publish
 * Change published boolean status and update updatedAt.
 * Ensures ONLY the published field (and updatedAt timestamp) is mutated.
 */
exports.publishEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { published, isPublished } = req.body || {};

    const rawPublished = published !== undefined ? published : isPublished;

    let targetPublished;
    if (rawPublished !== undefined) {
      if (typeof rawPublished === 'boolean') {
        targetPublished = rawPublished;
      } else if (String(rawPublished).toLowerCase() === 'true') {
        targetPublished = true;
      } else if (String(rawPublished).toLowerCase() === 'false') {
        targetPublished = false;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: published field must be a boolean value.'
        });
      }
    }

    if (isConnectedToMongoDB()) {
      let event = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        event = await Event.findById(id);
      }
      if (!event) {
        event = await Event.findOne({ $or: [{ id }, { itemKey: id }] });
      }

      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found for publish update' });
      }

      if (targetPublished === undefined) {
        targetPublished = !event.published;
      }

      event.published = targetPublished;
      const updatedEvent = await event.save();

      return res.json({
        success: true,
        message: `Event ${targetPublished ? 'published' : 'unpublished'} successfully.`,
        published: targetPublished,
        data: updatedEvent
      });
    }

    // In-memory fallback mode
    const index = (INITIAL_EVENTS || []).findIndex((e) => e.id === id || e.itemKey === id || e._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Event not found for publish update' });
    }

    if (targetPublished === undefined) {
      targetPublished = !Boolean(INITIAL_EVENTS[index].published);
    }

    INITIAL_EVENTS[index].published = targetPublished;
    INITIAL_EVENTS[index].updatedAt = new Date();

    return res.json({
      success: true,
      message: `Event ${targetPublished ? 'published' : 'unpublished'} successfully.`,
      published: targetPublished,
      data: INITIAL_EVENTS[index]
    });
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/events/:id/rsvp
 * RSVP for an event.
 */
exports.rsvpEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const User = require('../models/User.js');
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth.js');

    let authenticatedUser = req.user || null;
    if (!authenticatedUser) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
          if (decoded && decoded.id) {
            authenticatedUser = await User.findById(decoded.id);
          }
        } catch (e) {
          // Continue as guest
        }
      }
    }

    if (isConnectedToMongoDB()) {
      let event = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        event = await Event.findById(id);
      }
      if (!event) {
        event = await Event.findOne({ $or: [{ id }, { itemKey: id }] });
      }
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      if (event.attendeesCount >= event.capacity) {
        return res.status(400).json({ success: false, message: 'Event is fully booked' });
      }

      event.attendeesCount += 1;

      if (authenticatedUser) {
        const alreadyInAttendees = event.attendees && event.attendees.some(a => a.user && a.user.toString() === authenticatedUser._id.toString());
        if (!alreadyInAttendees) {
          event.attendees.push({ user: authenticatedUser._id, registeredAt: new Date() });
        }
        if (!authenticatedUser.rsvpedEvents.includes(event._id)) {
          authenticatedUser.rsvpedEvents.push(event._id);
          await authenticatedUser.save();
        }
      }

      await event.save();

      return res.json({
        success: true,
        message: 'RSVP confirmed successfully',
        attendeesCount: event.attendeesCount
      });
    }

    const event = (INITIAL_EVENTS || []).find((e) => e.id === id || e.itemKey === id || e._id === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    event.attendeesCount = (event.attendeesCount || 0) + 1;
    return res.json({
      success: true,
      message: 'RSVP confirmed successfully',
      attendeesCount: event.attendeesCount
    });
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /organizer/:id/attendance-metrics
 * Get attendance metrics for an organizer (Task 1 of Story 3)
 */
exports.getOrganizerAttendanceMetrics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limitVal = req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 6;

    const { startDate, endDate, from, to } = req.query;
    const dateFrom = startDate || from;
    const dateTo = endDate || to;

    const matchQuery = {};

    if (mongoose.Types.ObjectId.isValid(id)) {
      const objId = new mongoose.Types.ObjectId(id);
      matchQuery.$or = [
        { organizerId: objId },
        { organizerId: id }
      ];
    } else {
      matchQuery.organizerId = id;
    }

    if (dateFrom || dateTo) {
      matchQuery.startDate = {};
      if (dateFrom) matchQuery.startDate.$gte = new Date(dateFrom);
      if (dateTo) matchQuery.startDate.$lte = new Date(dateTo);
    }

    const now = new Date();

    if (isConnectedToMongoDB()) {
      const pipeline = [
        { $match: matchQuery },
        { $sort: { startDate: -1 } }
      ];

      if (!isNaN(limitVal) && limitVal > 0) {
        pipeline.push({ $limit: limitVal });
      }

      pipeline.push(
        {
          $project: {
            eventId: '$_id',
            title: 1,
            date: '$startDate',
            startDate: 1,
            endDate: 1,
            capacity: { $ifNull: ['$capacity', 100] },
            confirmed: {
              $max: [
                {
                  $cond: {
                    if: { $isArray: '$rsvpedUsers' },
                    then: { $size: '$rsvpedUsers' },
                    else: 0
                  }
                },
                { $ifNull: ['$attendeesCount', 0] }
              ]
            },
            waitlist: {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ['$waitlistUsers', []] } }, 0] },
                then: { $size: '$waitlistUsers' },
                else: { $ifNull: ['$waitlistCount', 0] }
              }
            },
            checkedIn: {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ['$checkedInUsers', []] } }, 0] },
                then: { $size: '$checkedInUsers' },
                else: { $ifNull: ['$checkedInCount', 0] }
              }
            }
          }
        },
        {
          $project: {
            eventId: 1,
            title: 1,
            date: 1,
            startDate: 1,
            endDate: 1,
            capacity: 1,
            confirmed: 1,
            waitlist: {
              $max: [
                '$waitlist',
                { $max: [0, { $subtract: ['$confirmed', '$capacity'] }] }
              ]
            },
            checkedIn: 1,
            noShow: {
              $cond: {
                if: { $lt: [{ $ifNull: ['$endDate', '$startDate'] }, now] },
                then: { $max: [0, { $subtract: ['$confirmed', '$checkedIn'] }] },
                else: 0
              }
            },
            attendanceRate: {
              $cond: {
                if: { $gt: ['$confirmed', 0] },
                then: { $round: [{ $divide: ['$checkedIn', '$confirmed'] }, 4] },
                else: 0
              }
            }
          }
        }
      );

      const metrics = await Event.aggregate(pipeline);
      return res.json({
        success: true,
        count: metrics.length,
        data: metrics
      });
    }

    // In-memory fallback mode
    const mockMetrics = (INITIAL_EVENTS || []).slice(0, limitVal).map(e => ({
      eventId: e._id || e.id,
      title: e.title,
      date: e.startDate || new Date(),
      startDate: e.startDate || new Date(),
      capacity: e.capacity || 100,
      confirmed: e.attendeesCount || 40,
      checkedIn: e.checkedInCount || 30,
      waitlist: e.waitlistCount || 5,
      noShow: Math.max(0, (e.attendeesCount || 40) - (e.checkedInCount || 30)),
      attendanceRate: (e.attendeesCount || 40) > 0 ? Number(((e.checkedInCount || 30) / (e.attendeesCount || 40)).toFixed(4)) : 0
    }));

    return res.json({
      success: true,
      count: mockMetrics.length,
      data: mockMetrics
    });
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /organizer/:id/attendance-metrics/export
 * Export attendance metrics as CSV (Task 3 of Story 3)
 */
exports.exportOrganizerAttendanceMetricsCSV = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limitVal = req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 5;

    let metrics = [];

    if (isConnectedToMongoDB()) {
      const matchQuery = {};
      if (mongoose.Types.ObjectId.isValid(id)) {
        const objId = new mongoose.Types.ObjectId(id);
        matchQuery.$or = [{ organizerId: objId }, { organizerId: id }];
      } else {
        matchQuery.organizerId = id;
      }

      const events = await Event.find(matchQuery).sort({ startDate: -1 }).limit(limitVal);
      metrics = events.map(e => {
        const confirmed = (e.rsvpedUsers && e.rsvpedUsers.length) || e.attendeesCount || 0;
        const checkedIn = (e.checkedInUsers && e.checkedInUsers.length) || e.checkedInCount || 0;
        const waitlist = (e.waitlistUsers && e.waitlistUsers.length) || e.waitlistCount || 0;
        const noShow = Math.max(0, confirmed - checkedIn);
        const rate = confirmed > 0 ? (checkedIn / confirmed).toFixed(4) : '0%';
        return {
          title: e.title,
          date: e.startDate ? new Date(e.startDate).toISOString() : 'N/A',
          capacity: e.capacity || 100,
          confirmed,
          checkedIn,
          waitlist,
          noShow,
          attendanceRate: rate
        };
      });
    } else {
      metrics = (INITIAL_EVENTS || []).slice(0, limitVal).map(e => ({
        title: e.title,
        date: e.startDate ? new Date(e.startDate).toISOString() : new Date().toISOString(),
        capacity: e.capacity || 100,
        confirmed: e.attendeesCount || 40,
        checkedIn: e.checkedInCount || 30,
        waitlist: e.waitlistCount || 5,
        noShow: Math.max(0, (e.attendeesCount || 40) - (e.checkedInCount || 30)),
        attendanceRate: (e.attendeesCount || 40) > 0 ? ((e.checkedInCount || 30) / (e.attendeesCount || 40)).toFixed(4) : '0%'
      }));
    }

    const headers = ['Event Title', 'Date', 'Capacity', 'Confirmed RSVPs', 'Checked In', 'Waitlist', 'No Show', 'Attendance Rate'];
    const rows = [headers.join(',')];

    metrics.forEach(m => {
      rows.push([
        `"${String(m.title).replace(/"/g, '""')}"`,
        `"${m.date}"`,
        m.capacity,
        m.confirmed,
        m.checkedIn,
        m.waitlist,
        m.noShow,
        `"${m.attendanceRate}"`
      ].join(','));
    });

    const csvContent = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-metrics.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
