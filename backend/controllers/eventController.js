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
