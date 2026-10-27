const mongoose = require('mongoose');
const { isConnectedToMongoDB } = require('../config/db');
const Event = require('../models/Event');
const { INITIAL_EVENTS } = require('../data/seedEvents');

const getCategoryMatchPatterns = (cat) => {
  if (!cat || String(cat).toLowerCase() === 'all') return [];
  const c = String(cat).toLowerCase();
  if (c.includes('career') || c.includes('job') || c.includes('tech')) {
    return ['tech', 'career', 'job', 'Career & Jobs', 'Tech & AI'];
  }
  if (c.includes('workshop') || c.includes('skill')) {
    return ['workshop', 'skill', 'Skill Workshops', 'Workshops'];
  }
  if (c.includes('culture') || c.includes('cultural') || c.includes('festival')) {
    return ['culture', 'cultural', 'festival', 'Cultural Festivals', 'Culture & Heritage'];
  }
  if (c.includes('charity') || c.includes('civic') || c.includes('community')) {
    return ['charity', 'civic', 'community', 'Civic & Community', 'Charity & Volunteer'];
  }
  if (c.includes('health') || c.includes('wellness') || c.includes('sport') || c.includes('fitness')) {
    return ['health', 'wellness', 'sports', 'marathon', 'fitness', 'Health & Wellness', 'charity'];
  }
  return [cat];
};

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * GET /api/events
 * Fetch all events with category, tags, date range, published, search, organizerId, geo-radius, and pagination.
 */
const getEvents = async (req, res, next) => {
  try {
    const {
      category,
      tags,
      published,
      startDate,
      endDate,
      search,
      organizerId,
      organizer,
      lat,
      latitude,
      lng,
      longitude,
      radius,
      radiusKm,
      page,
      limit,
      pageSize
    } = req.query;

    const orgFilter = (organizerId || organizer || '').toString().trim();
    const centerLat = lat !== undefined ? Number(lat) : latitude !== undefined ? Number(latitude) : null;
    const centerLng = lng !== undefined ? Number(lng) : longitude !== undefined ? Number(longitude) : null;
    const maxRadius = radius !== undefined ? Number(radius) : radiusKm !== undefined ? Number(radiusKm) : null;

    if (isConnectedToMongoDB) {
      const query = {};

      if (category && String(category).toLowerCase() !== 'all') {
        const patterns = getCategoryMatchPatterns(category);
        const regexList = patterns.map((p) => new RegExp(p, 'i'));
        query.$or = [
          { category: { $in: regexList } },
          { title: { $in: regexList } },
          { tags: { $in: regexList } }
        ];
      }

      if (published !== undefined && published !== 'all') {
        query.published = String(published).toLowerCase() === 'true';
      }

      if (orgFilter) {
        const orgOr = [{ organizerId: orgFilter }, { organizerName: orgFilter }];
        if (mongoose.Types.ObjectId.isValid(orgFilter)) {
          orgOr.push({ organizer: new mongoose.Types.ObjectId(orgFilter) });
          orgOr.push({ organizerId: new mongoose.Types.ObjectId(orgFilter) });
        }
        if (query.$and) {
          query.$and.push({ $or: orgOr });
        } else if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: orgOr }];
          delete query.$or;
        } else {
          query.$or = orgOr;
        }
      }

      if (tags) {
        const tagList = Array.isArray(tags)
          ? tags
          : String(tags)
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
        if (tagList.length > 0) {
          const tagRegexes = tagList.map((t) => new RegExp(`^${t}$`, 'i'));
          query.tags = { $in: tagRegexes };
        }
      }

      if (startDate || endDate) {
        query.startDate = {};
        if (startDate) query.startDate.$gte = new Date(startDate);
        if (endDate) {
          let eDate = new Date(endDate);
          if (typeof endDate === 'string' && endDate.length === 10) {
            eDate = new Date(`${endDate}T23:59:59.999Z`);
          }
          query.startDate.$lte = eDate;
        }
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        const searchCond = [
          { title: regex },
          { description: regex },
          { 'location.placeName': regex },
          { city: regex },
          { tags: regex }
        ];
        if (query.$and) {
          query.$and.push({ $or: searchCond });
        } else if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: searchCond }];
          delete query.$or;
        } else {
          query.$or = searchCond;
        }
      }

      let events = await Event.find(query).sort({ startDate: 1, createdAt: -1 });

      if (centerLat !== null && centerLng !== null && maxRadius !== null && !isNaN(maxRadius)) {
        events = events.filter((e) => {
          const eLat = e.location?.latitude ?? (e.latitude != null ? Number(e.latitude) : null);
          const eLng = e.location?.longitude ?? (e.longitude != null ? Number(e.longitude) : null);
          if (eLat == null || eLng == null) return false;
          const dist = calculateDistanceKm(centerLat, centerLng, eLat, eLng);
          return dist !== null && dist <= maxRadius;
        });
      }

      const totalCount = events.length;
      const reqLimit = parseInt(limit || pageSize, 10);
      const reqPage = Math.max(1, parseInt(page, 10) || 1);

      let paginated = events;
      let totalPages = 1;
      if (reqLimit > 0) {
        totalPages = Math.ceil(totalCount / reqLimit) || 1;
        const startIndex = (reqPage - 1) * reqLimit;
        paginated = events.slice(startIndex, startIndex + reqLimit);
      }

      return res.json({
        success: true,
        count: totalCount,
        page: reqPage,
        totalPages,
        data: paginated,
        events: paginated
      });
    }

    // In-memory fallback store mode
    let results = [...INITIAL_EVENTS];

    if (category && String(category).toLowerCase() !== 'all') {
      const patterns = getCategoryMatchPatterns(category);
      const regexes = patterns.map((p) => new RegExp(p, 'i'));
      results = results.filter((e) =>
        regexes.some(
          (r) =>
            r.test(e.category) ||
            r.test(e.title) ||
            (Array.isArray(e.tags) && e.tags.some((t) => r.test(t)))
        )
      );
    }

    if (published !== undefined && published !== 'all') {
      const isPub = String(published).toLowerCase() === 'true';
      results = results.filter((e) => Boolean(e.published) === isPub);
    }

    if (orgFilter) {
      results = results.filter(
        (e) =>
          String(e.organizerId || '').toLowerCase() === orgFilter.toLowerCase() ||
          String(e.organizer || '').toLowerCase() === orgFilter.toLowerCase() ||
          String(e.organizerName || '').toLowerCase() === orgFilter.toLowerCase()
      );
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
          (e) => Array.isArray(e.tags) && e.tags.some((t) => tagList.includes(String(t).toLowerCase()))
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
      let eDate = new Date(endDate);
      if (typeof endDate === 'string' && endDate.length === 10) {
        eDate = new Date(`${endDate}T23:59:59.999Z`);
      }
      const end = eDate.getTime();
      results = results.filter((e) => e.startDate && new Date(e.startDate).getTime() <= end);
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter((e) => {
        const titleMatch = e.title && e.title.toLowerCase().includes(term);
        const descMatch = e.description && e.description.toLowerCase().includes(term);
        const locString = typeof e.location === 'object' ? (e.location?.placeName || '') : String(e.location || '');
        const locMatch = locString && locString.toLowerCase().includes(term);
        const tagMatch = Array.isArray(e.tags) && e.tags.some((t) => String(t).toLowerCase().includes(term));
        return titleMatch || descMatch || locMatch || tagMatch;
      });
    }

    if (centerLat !== null && centerLng !== null && maxRadius !== null && !isNaN(maxRadius)) {
      results = results.filter((e) => {
        const eLat = e.location?.latitude ?? (e.latitude != null ? Number(e.latitude) : null);
        const eLng = e.location?.longitude ?? (e.longitude != null ? Number(e.longitude) : null);
        if (eLat == null || eLng == null) return false;
        const dist = calculateDistanceKm(centerLat, centerLng, eLat, eLng);
        return dist !== null && dist <= maxRadius;
      });
    }

    const totalCount = results.length;
    const reqLimit = parseInt(limit || pageSize, 10);
    const reqPage = Math.max(1, parseInt(page, 10) || 1);

    let paginated = results;
    let totalPages = 1;
    if (reqLimit > 0) {
      totalPages = Math.ceil(totalCount / reqLimit) || 1;
      const startIndex = (reqPage - 1) * reqLimit;
      paginated = results.slice(startIndex, startIndex + reqLimit);
    }

    return res.json({
      success: true,
      count: totalCount,
      page: reqPage,
      totalPages,
      data: paginated,
      events: paginated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/search?q=<query>
 * Dedicated keyword search endpoint matching title, description, or tags (case-insensitive).
 */
const searchEvents = async (req, res, next) => {
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
const getEventById = async (req, res, next) => {
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
const createEvent = async (req, res, next) => {
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

    const resolvedOrganizerId =
      (organizerId && String(organizerId).trim()) ||
      (req.user && (req.user._id || req.user.id)?.toString()) ||
      (req.body.organizer && String(req.body.organizer).trim()) ||
      'organizer-default';

    // Required fields validation (title and startDate)
    if (!title || !title.trim() || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Required fields title and startDate must be provided.'
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
      organizerId: resolvedOrganizerId,
      organizer: mongoose.Types.ObjectId.isValid(resolvedOrganizerId) ? resolvedOrganizerId : undefined,
      organizerName: req.body.organizerName || req.user?.name || 'Community Organizer',
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
const updateEvent = async (req, res, next) => {
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

    if (updatePayload.tags !== undefined) {
      updatePayload.tags = Array.isArray(updatePayload.tags)
        ? updatePayload.tags
        : typeof updatePayload.tags === 'string'
        ? updatePayload.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
    }

    if (updatePayload.location !== undefined) {
      if (typeof updatePayload.location === 'object' && updatePayload.location !== null) {
        updatePayload.location = {
          placeName: updatePayload.location.placeName || '',
          latitude: updatePayload.location.latitude !== undefined ? Number(updatePayload.location.latitude) : null,
          longitude: updatePayload.location.longitude !== undefined ? Number(updatePayload.location.longitude) : null
        };
      } else if (typeof updatePayload.location === 'string') {
        updatePayload.location = { placeName: updatePayload.location, latitude: null, longitude: null };
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
const deleteEvent = async (req, res, next) => {
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
const publishEvent = async (req, res, next) => {
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
const rsvpEvent = async (req, res) => {
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

// @desc    Get attendance metrics for an organizer (Task 1 of Story 3)
// @route   GET /organizer/:id/attendance-metrics
const getOrganizerAttendanceMetrics = async (req, res) => {
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
const exportOrganizerAttendanceMetricsCSV = async (req, res) => {
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

module.exports = {
  getEvents,
  searchEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  rsvpEvent,
  getOrganizerAttendanceMetrics,
  exportOrganizerAttendanceMetricsCSV
};


