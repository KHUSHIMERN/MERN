const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const SuggestionAnalytics = require('../models/SuggestionAnalytics');
const {
  auth,
  optionalAuth,
  requireVerified,
  requireRole,
  JWT_SECRET: AUTH_JWT_SECRET
} = require('../middleware/auth');
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  searchEvents,
  getOrganizerAttendanceMetrics,
  exportOrganizerAttendanceMetricsCSV
} = require('../controllers/eventController');

const {
  getEventAttendance,
  updateEventAttendance,
  exportEventAttendance,
  getAttendanceAuditLogs
} = require('../controllers/attendanceController');


const privileged = [auth, requireVerified, requireRole('organizer', 'admin')];
const JWT_SECRET = AUTH_JWT_SECRET || process.env.JWT_SECRET || 'supersecretkey';

// Helper to safely extract optional authenticated user
const getOptionalUser = (req) => {
  if (req.user) return req.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && (decoded.id || decoded._id)) {
        return { _id: decoded.id || decoded._id, id: decoded.id || decoded._id };
      }
    } catch (_) {
      // Ignore token verification failures for optional routes
    }
  }
  return null;
};

// Helper to escape regex special characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Search and suggestion endpoint for Typeahead
// Returns up to 10 deduplicated suggestions by searching titles and tags,
// ordered by language preference (if specified), popularity (confirmed RSVPs), and recency.
router.get('/suggest', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const lang = (req.query.lang || '').trim().toLowerCase();
    if (!q || q.length === 0) {
      return res.status(200).json({ query: '', count: 0, suggestions: [] });
    }

    const escaped = escapeRegex(q);
    const regex = new RegExp(escaped, 'i');

    // Aggregation pipeline: match partial strings on title or tags,
    // lookup confirmed RSVPs to calculate popularity score,
    // prioritize matching events in the user's preferred language, and sort by popularity and recency
    const pipeline = [
      {
        $match: {
          $or: [
            { title: { $regex: regex } },
            { tags: { $regex: regex } }
          ]
        }
      },
      {
        $lookup: {
          from: 'rsvps',
          let: { eventId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$eventId', '$$eventId'] },
                    { $eq: ['$status', 'confirmed'] }
                  ]
                }
              }
            }
          ],
          as: 'confirmedRsvps'
        }
      },
      {
        $addFields: {
          rsvpCount: { $size: '$confirmedRsvps' },
          isPreferredLang: lang
            ? { $cond: [{ $eq: ['$language', lang] }, 1, 0] }
            : 0
        }
      },
      {
        $sort: {
          isPreferredLang: -1,
          rsvpCount: -1,
          date: 1,
          createdAt: -1
        }
      }
    ];

    const matchedEvents = await Event.aggregate(pipeline);

    const suggestions = [];
    const seen = new Set();

    for (const evt of matchedEvents) {
      const eventLang = evt.language || 'en';
      const eventPopularity = evt.rsvpCount || 0;

      // 1. Title match
      if (evt.title && regex.test(evt.title)) {
        const titleKey = `title:${evt.title.trim().toLowerCase()}`;
        if (!seen.has(titleKey)) {
          seen.add(titleKey);
          suggestions.push({
            id: `title-${evt._id}`,
            text: evt.title,
            type: 'title',
            language: eventLang,
            eventId: evt._id,
            popularity: eventPopularity,
            date: evt.date
          });
          if (suggestions.length >= 10) break;
        }
      }

      // 2. Tags match
      if (Array.isArray(evt.tags)) {
        for (const tag of evt.tags) {
          if (tag && regex.test(tag)) {
            const tagKey = `tag:${tag.trim().toLowerCase()}`;
            if (!seen.has(tagKey)) {
              seen.add(tagKey);
              suggestions.push({
                id: `tag-${tag.trim().toLowerCase()}`,
                text: tag,
                type: 'tag',
                language: eventLang,
                eventId: evt._id,
                popularity: eventPopularity,
                date: evt.date
              });
              if (suggestions.length >= 10) break;
            }
          }
        }
      }

      if (suggestions.length >= 10) break;
    }

    return res.status(200).json({
      query: q,
      count: suggestions.length,
      suggestions: suggestions.slice(0, 10)
    });
  } catch (error) {
    console.error('Suggest Events Error:', error);
    return res.status(500).json({ message: 'Failed to fetch suggestions', error: error.message });
  }
});

// Analytics tracking endpoint for suggestion impressions and clicks
router.post('/suggest/analytics', async (req, res) => {
  try {
    const { eventType, query, suggestion, suggestions } = req.body;
    const optionalUser = getOptionalUser(req);
    const userId = optionalUser ? (optionalUser._id || optionalUser.id) : null;

    if (!eventType || !['impression', 'click'].includes(eventType)) {
      return res.status(400).json({ message: 'Valid eventType (impression or click) is required.' });
    }

    if (eventType === 'impression') {
      const items = Array.isArray(suggestions) ? suggestions : (suggestion ? [suggestion] : []);
      if (items.length === 0) {
        return res.status(200).json({ message: 'No impression items to record', count: 0 });
      }

      const records = items.map(item => ({
        userId,
        eventType: 'impression',
        query: query ? String(query).trim() : '',
        suggestion: {
          id: item.id || null,
          text: item.text || '',
          type: item.type || 'title',
          language: item.language || 'en',
          eventId: item.eventId || null
        },
        timestamp: new Date()
      }));

      await SuggestionAnalytics.insertMany(records);
      return res.status(201).json({ message: 'Impressions logged successfully', count: records.length });
    }

    if (eventType === 'click') {
      if (!suggestion || !suggestion.text) {
        return res.status(400).json({ message: 'suggestion with at least text is required for click event.' });
      }

      const record = new SuggestionAnalytics({
        userId,
        eventType: 'click',
        query: query ? String(query).trim() : '',
        suggestion: {
          id: suggestion.id || null,
          text: suggestion.text,
          type: suggestion.type || 'title',
          language: suggestion.language || 'en',
          eventId: suggestion.eventId || null
        },
        timestamp: new Date()
      });

      await record.save();
      return res.status(201).json({ message: 'Click logged successfully', record });
    }
  } catch (error) {
    console.error('Suggestion Analytics Error:', error);
    return res.status(500).json({ message: 'Failed to record analytics', error: error.message });
  }
});

// General Event REST API Endpoints
router.get('/', optionalAuth, getEvents);
router.post('/', ...privileged, createEvent);
router.get('/search', searchEvents);

// Organizer attendance metrics endpoints
router.get('/organizer/:id/attendance-metrics/export', exportOrganizerAttendanceMetricsCSV);
router.get('/organizer/:id/attendance-metrics', getOrganizerAttendanceMetrics);

router.get('/:id', optionalAuth, getEventById);
router.put('/:id', ...privileged, updateEvent);
router.delete('/:id', ...privileged, deleteEvent);
router.patch('/:id/publish', ...privileged, publishEvent);

// Organizer-only Attendance Tracking & Check-in Endpoints
router.get('/:id/attendance', ...privileged, getEventAttendance);
router.patch('/:id/attendance', ...privileged, updateEventAttendance);
router.get('/:id/attendance/export', ...privileged, exportEventAttendance);
router.get('/:id/attendance/audit-logs', ...privileged, getAttendanceAuditLogs);

module.exports = router;
