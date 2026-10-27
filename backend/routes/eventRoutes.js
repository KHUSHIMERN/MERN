const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const SuggestionAnalytics = require('../models/SuggestionAnalytics');
const { requireAuth, requireRole, JWT_SECRET: AUTH_JWT_SECRET } = require('../middleware/auth');

const JWT_SECRET = AUTH_JWT_SECRET || process.env.JWT_SECRET || 'supersecretkey';

// Helper to safely extract optional authenticated user
const getOptionalUser = (req) => {
  if (req.user) return req.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        return { _id: decoded.id, id: decoded.id };
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

// Create event - Restricted to Organizers and Admins
router.post('/', requireAuth, requireRole(['organizer', 'admin']), async (req, res) => {
  try {
    const { title, description, location, date, capacity, tags, language } = req.body;

    if (!title || !location || !date || !capacity) {
      return res.status(400).json({ message: 'Title, location, date, and capacity are required.' });
    }

    const event = new Event({
      title,
      description,
      location,
      date: new Date(date),
      organizer: req.user._id,
      capacity: Number(capacity),
      tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
      language: language ? String(language).trim().toLowerCase() : 'en'
    });

    await event.save();
    return res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    console.error('Create Event Error:', error);
    return res.status(500).json({ message: 'Failed to create event', error: error.message });
  }
});

// List all events
router.get('/', requireAuth, async (req, res) => {
  try {
    const events = await Event.find().populate('organizer', 'name email').sort({ date: 1 });
    
    // Dynamically fetch RSVP details for each event
    const enrichedEvents = await Promise.all(events.map(async (event) => {
      const rsvps = await RSVP.find({ eventId: event._id }).sort({ createdAt: 1 });
      const confirmedCount = rsvps.filter(r => r.status === 'confirmed').length;
      const waitlistCount = rsvps.filter(r => r.status === 'waitlist').length;
      
      let userRegistrationStatus = 'none';
      let userWaitlistPosition = 0;
      
      if (req.user) {
        const userRSVP = rsvps.find(r => r.userId.toString() === req.user._id.toString());
        if (userRSVP) {
          userRegistrationStatus = userRSVP.status;
          if (userRegistrationStatus === 'waitlist') {
            const waitlistList = rsvps.filter(r => r.status === 'waitlist');
            userWaitlistPosition = waitlistList.findIndex(r => r.userId.toString() === req.user._id.toString()) + 1;
          }
        }
      }
      
      const eventObj = event.toJSON();
      return {
        ...eventObj,
        rsvpCount: confirmedCount,
        waitlistCount,
        userRegistrationStatus,
        userWaitlistPosition
      };
    }));

    return res.status(200).json(enrichedEvents);
  } catch (error) {
    console.error('List Events Error:', error);
    return res.status(500).json({ message: 'Failed to list events', error: error.message });
  }
});

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

// Get a single event details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name email');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const rsvps = await RSVP.find({ eventId: event._id }).sort({ createdAt: 1 });
    const confirmedCount = rsvps.filter(r => r.status === 'confirmed').length;
    const waitlistCount = rsvps.filter(r => r.status === 'waitlist').length;
    
    let userRegistrationStatus = 'none';
    let userWaitlistPosition = 0;
    
    if (req.user) {
      const userRSVP = rsvps.find(r => r.userId.toString() === req.user._id.toString());
      if (userRSVP) {
        userRegistrationStatus = userRSVP.status;
        if (userRegistrationStatus === 'waitlist') {
          const waitlistList = rsvps.filter(r => r.status === 'waitlist');
          userWaitlistPosition = waitlistList.findIndex(r => r.userId.toString() === req.user._id.toString()) + 1;
        }
      }
    }
    
    const eventObj = event.toJSON();
    const enrichedEvent = {
      ...eventObj,
      rsvpCount: confirmedCount,
      waitlistCount,
      userRegistrationStatus,
      userWaitlistPosition
    };
    
    return res.status(200).json(enrichedEvent);
  } catch (error) {
    console.error('Get Event Error:', error);
    return res.status(500).json({ message: 'Failed to fetch event details', error: error.message });
  }
});

module.exports = router;
