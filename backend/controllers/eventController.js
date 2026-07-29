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
      const catLower = category.toLowerCase().trim();
      const categoryPatterns = {
        career: /career/i,
        workshop: /(workshop|skill)/i,
        health: /health/i,
        culture: /(culture|festival|art)/i,
        civic: /civic/i,
        general: /general/i,
      };
      if (categoryPatterns[catLower]) {
        query.category = categoryPatterns[catLower];
      } else {
        query.category = { $regex: category, $options: 'i' };
      }
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


