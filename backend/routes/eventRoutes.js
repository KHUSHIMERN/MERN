const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const { requireAuth, requireRole } = require('../middleware/auth');

// Create event - Restricted to Organizers and Admins
router.post('/', requireAuth, requireRole(['organizer', 'admin']), async (req, res) => {
  try {
    const { title, description, location, date, capacity } = req.body;

    if (!title || !location || !date || !capacity) {
      return res.status(400).json({ message: 'Title, location, date, and capacity are required.' });
    }

    const event = new Event({
      title,
      description,
      location,
      date: new Date(date),
      organizer: req.user._id,
      capacity: Number(capacity)
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
