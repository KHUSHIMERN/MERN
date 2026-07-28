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
 * Toggle or update publish status of an event.
 */
export const publishEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { published } = req.body;

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

      const targetPublished = published !== undefined ? Boolean(published) : !event.published;
      event.published = targetPublished;
      await event.save();

      return res.json({
        success: true,
        message: `Event ${targetPublished ? 'published' : 'unpublished'} successfully.`,
        published: targetPublished,
        data: event
      });
    }

    // In-memory fallback
    const index = INITIAL_EVENTS.findIndex((e) => e.id === id || e.itemKey === id || e._id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Event not found for publish update' });
    }

    const currentPublished = Boolean(INITIAL_EVENTS[index].published);
    const targetPublished = published !== undefined ? Boolean(published) : !currentPublished;

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
