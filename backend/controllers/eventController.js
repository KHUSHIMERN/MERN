import mongoose from 'mongoose';
import { isConnectedToMongoDB } from '../config/db.js';
import Event from '../models/Event.js';
import { INITIAL_EVENTS } from '../data/seedEvents.js';

/**
 * GET /api/events
 * Fetch all events with category, tags, date range, published, and search filter support.
 */
export const getEvents = async (req, res, next) => {
  try {
    const { category, tags, published, startDate, endDate, search } = req.query;

    if (isConnectedToMongoDB) {
      const query = {};

      if (category && category !== 'all') {
        query.category = category;
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
          { 'location.placeName': regex }
        ];
      }

      const events = await Event.find(query).sort({ startDate: 1, createdAt: -1 });
      return res.json({ success: true, count: events.length, data: events });
    }

    // In-memory fallback store mode
    let results = [...INITIAL_EVENTS];

    if (category && category !== 'all') {
      results = results.filter((e) => e.category === category);
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

    return res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/search?q=<query>
 * Dedicated keyword search endpoint matching title, description, or tags (case-insensitive).
 */
export const searchEvents = async (req, res, next) => {
  try {
    const q = req.query.q || req.query.search || req.query.query || '';
    const queryTerm = String(q).trim();

    if (!queryTerm) {
      if (isConnectedToMongoDB) {
        const allEvents = await Event.find({ published: true }).sort({ startDate: 1 });
        return res.json({ success: true, query: '', count: allEvents.length, data: allEvents });
      }
      const allEvents = INITIAL_EVENTS.filter((e) => Boolean(e.published));
      return res.json({ success: true, query: '', count: allEvents.length, data: allEvents });
    }

    if (isConnectedToMongoDB) {
      const escapedTerm = queryTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedTerm, 'i');
      const mongoQuery = {
        $or: [
          { title: regex },
          { description: regex },
          { tags: { $in: [regex] } },
          { 'location.placeName': regex }
        ]
      };

      const events = await Event.find(mongoQuery).sort({ startDate: 1, createdAt: -1 });
      return res.json({ success: true, query: queryTerm, count: events.length, data: events });
    }

    // In-memory fallback mode
    const term = queryTerm.toLowerCase();
    const results = INITIAL_EVENTS.filter((e) => {
      const titleMatch = e.title && e.title.toLowerCase().includes(term);
      const descMatch = e.description && e.description.toLowerCase().includes(term);
      const tagMatch = Array.isArray(e.tags) && e.tags.some((t) => t.toLowerCase().includes(term));
      const locString = typeof e.location === 'object' ? e.location.placeName : String(e.location);
      const locMatch = locString && locString.toLowerCase().includes(term);

      return titleMatch || descMatch || tagMatch || locMatch;
    });

    return res.json({ success: true, query: queryTerm, count: results.length, data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:id
 * Fetch single event by ID or itemKey.
 */
export const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isConnectedToMongoDB) {
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
      return res.json({ success: true, data: event });
    }

    const event = INITIAL_EVENTS.find((e) => e.id === id || e.itemKey === id || e._id === id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    return res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events
 * Create a new event with input validation (required fields & date range sanity).
 */
export const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      organizerId,
      category,
      tags,
      startDate,
      endDate,
      location,
      published,
      image,
      itemKey,
      date,
      seatsLeft
    } = req.body;

    // Required fields validation
    if (!title || !title.trim() || !organizerId || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Required fields title, organizerId, and startDate must be provided.'
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
    let locationObj = { placeName: '', latitude: null, longitude: null };
    if (typeof location === 'object' && location !== null) {
      locationObj = {
        placeName: location.placeName || '',
        latitude: location.latitude !== undefined ? Number(location.latitude) : null,
        longitude: location.longitude !== undefined ? Number(location.longitude) : null
      };
    } else if (typeof location === 'string') {
      locationObj.placeName = location;
    }

    const formattedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const newEventData = {
      id: `evt-${Date.now()}`,
      itemKey: itemKey || `evt_${Date.now()}`,
      title: title.trim(),
      description: description || '',
      organizerId: organizerId.trim(),
      category: category || 'general',
      tags: formattedTags,
      startDate: parsedStart,
      endDate: parsedEnd,
      location: locationObj,
      published: Boolean(published),
      image: image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      date: date || parsedStart.toISOString().split('T')[0],
      seatsLeft: seatsLeft !== undefined ? Number(seatsLeft) : 50,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (isConnectedToMongoDB) {
      const createdEvent = await Event.create(newEventData);
      return res.status(201).json({
        success: true,
        message: 'Event created successfully.',
        id: createdEvent._id.toString(),
        data: createdEvent
      });
    }

    INITIAL_EVENTS.push(newEventData);
    return res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      id: newEventData.id,
      data: newEventData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/events/:id
 * Full update of an event by ID with validation.
 */
export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = { ...req.body };

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

    if (isConnectedToMongoDB) {
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
    const index = INITIAL_EVENTS.findIndex((e) => e.id === id || e.itemKey === id || e._id === id);
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
    next(error);
  }
};

/**
 * DELETE /api/events/:id
 * Delete event by ID.
 */
export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isConnectedToMongoDB) {
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
    const index = INITIAL_EVENTS.findIndex((e) => e.id === id || e.itemKey === id || e._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Event not found for deletion' });
    }

    INITIAL_EVENTS.splice(index, 1);
    return res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/events/:id/publish
 * Change published boolean status and update updatedAt.
 * Ensures ONLY the published field (and updatedAt timestamp) is mutated.
 */
export const publishEvent = async (req, res, next) => {
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

    if (isConnectedToMongoDB) {
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

      // Ensure ONLY published field is modified
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
    const index = INITIAL_EVENTS.findIndex((e) => e.id === id || e.itemKey === id || e._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Event not found for publish update' });
    }

    if (targetPublished === undefined) {
      targetPublished = !Boolean(INITIAL_EVENTS[index].published);
    }

    // Mutate ONLY published and updatedAt
    INITIAL_EVENTS[index].published = targetPublished;
    INITIAL_EVENTS[index].updatedAt = new Date();

    return res.json({
      success: true,
      message: `Event ${targetPublished ? 'published' : 'unpublished'} successfully.`,
      published: targetPublished,
      data: INITIAL_EVENTS[index]
    });
  } catch (error) {
    next(error);
  }
};
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');

// @desc    Get all events
// @route   GET /api/events
exports.getEvents = async (req, res) => {
  try {
    const { category, search, city } = req.query;
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (city && city !== 'all') {
      query.city = city;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query).sort({ startDate: 1 });
    res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new event (Organizer feature)
// @route   POST /api/events
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      title_hi,
      description,
      description_hi,
      category,
      location,
      city,
      startDate,
      endDate,
      timezone,
      organizer,
      capacity,
      tags,
      imageUrl,
      imageUrlAlt
    } = req.body;

    const eventTimezone = timezone || 'Asia/Kolkata';
    try {
      Intl.DateTimeFormat(undefined, { timeZone: eventTimezone });
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: `Invalid IANA timezone identifier: '${eventTimezone}'`
      });
    }

    const event = await Event.create({
      title,
      title_hi,
      description,
      description_hi,
      category: category || 'general',
      location,
      city: city || 'Jaipur',
      startDate,
      endDate,
      timezone: eventTimezone,
      organizer: organizer || 'Community Organizer',
      capacity: capacity || 100,
      tags: tags || [],
      imageUrl: imageUrl || '',
      imageUrlAlt: imageUrlAlt || (title ? `Banner image for ${title}` : 'Event banner image')
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    RSVP for an event (Attendee feature)
// @route   POST /api/events/:id/rsvp
exports.rsvpEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.attendeesCount >= event.capacity) {
      return res.status(400).json({ success: false, message: 'Event is fully booked' });
    }

    event.attendeesCount += 1;
    await event.save();

    res.json({
      success: true,
      message: 'RSVP confirmed successfully',
      attendeesCount: event.attendeesCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
exports.updateEvent = async (req, res) => {
  try {
    const { timezone } = req.body;
    if (timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: `Invalid IANA timezone identifier: '${timezone}'`
        });
      }
    }

    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, message: 'Event removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance metrics for an organizer (Task 1 of Story 3)
// @route   GET /organizer/:id/attendance-metrics
exports.getOrganizerAttendanceMetrics = async (req, res) => {
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
              else: "0%"
            }
          }
        }
      }
    );

    const metrics = await Event.aggregate(pipeline);

    res.json({
      success: true,
      count: metrics.length,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export attendance metrics as CSV for an organizer (Task 3 of Story 3)
// @route   GET /organizer/:id/attendance-metrics/export
exports.exportOrganizerAttendanceMetricsCSV = async (req, res) => {
  try {
    const { id } = req.params;
    const limitVal = req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 0;

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
              else: "0%"
            }
          }
        }
      }
    );

    let metrics = [];
    try {
      metrics = await Event.aggregate(pipeline);
    } catch (e) {
      metrics = [];
    }

    const headers = ['Event ID', 'Event Title', 'Date', 'Capacity', 'Confirmed', 'Waitlist', 'Checked-In', 'No-Show', 'Attendance Rate (%)'];
    const csvRows = [headers.join(',')];

    const escapeCsvField = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    metrics.forEach(m => {
      const formattedDate = m.date || m.startDate ? new Date(m.date || m.startDate).toISOString() : '';
      const ratePct = m.attendanceRate !== undefined
        ? (m.attendanceRate === '0%' ? '0%' : (m.attendanceRate * 100).toFixed(1))
        : '0.0';
      const row = [
        escapeCsvField(m.eventId || m._id),
        escapeCsvField(m.title),
        escapeCsvField(formattedDate),
        escapeCsvField(m.capacity ?? 0),
        escapeCsvField(m.confirmed ?? 0),
        escapeCsvField(m.waitlist ?? 0),
        escapeCsvField(m.checkedIn ?? 0),
        escapeCsvField(m.noShow ?? 0),
        escapeCsvField(ratePct)
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-metrics-${id}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


