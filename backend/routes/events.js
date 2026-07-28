const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const { auth, requireVerified, requireRole } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/events
// @desc    Get all events with filters (category, city, tier, search)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, city, tier, search, language } = req.query;
    const filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (city && city !== 'All') {
      filter.city = new RegExp(city, 'i');
    }

    if (tier && tier !== 'All') {
      filter.tier = tier;
    }

    if (language && language !== 'All') {
      filter.language = language;
    }

    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { location: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
      ];
    }

    const events = await Event.find(filter)
      .populate('organizer', 'name email role city')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: events.length,
      events,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ message: 'Server error fetching events.', error: error.message });
  }
});

// @route   GET /api/events/:id
// @desc    Get single event by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email role city')
      .populate('attendees.user', 'name email city role');

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.status(200).json({ event });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving event.', error: error.message });
  }
});

// @route   POST /api/events
// @desc    Create new event (Organizer / Admin only, Verified required)
// @access  Private (Organizer/Admin, Verified)
router.post('/', auth, requireVerified, requireRole('organizer', 'admin'), async (req, res) => {
  try {
    const { title, description, category, city, tier, location, date, time, capacity, image, tags, language } = req.body;

    if (!title || !description || !category || !location || !date || !time) {
      return res.status(400).json({ message: 'Please provide title, description, category, location, date, and time.' });
    }

    const newEvent = new Event({
      title: title.trim(),
      description: description.trim(),
      category,
      city: city || req.user.city || 'Indore',
      tier: tier || 'Tier 2',
      location: location.trim(),
      date,
      time,
      organizer: req.user._id,
      organizerName: req.user.name,
      capacity: capacity ? parseInt(capacity, 10) : 100,
      image: image || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      tags: tags || [category, city || 'Indore'],
      language: language || 'en',
    });

    await newEvent.save();

    return res.status(201).json({
      message: 'Event created successfully!',
      event: newEvent,
    });
  } catch (error) {
    console.error('Create Event Error:', error);
    return res.status(500).json({ message: 'Server error creating event.', error: error.message });
  }
});

// @route   PUT /api/events/:id
// @desc    Update existing event
// @access  Private (Organizer Owner / Admin)
router.put('/:id', auth, requireVerified, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Authorization check
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this event.' });
    }

    const fieldsToUpdate = ['title', 'description', 'category', 'city', 'tier', 'location', 'date', 'time', 'capacity', 'image', 'tags', 'language', 'isFeatured'];
    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    await event.save();

    return res.status(200).json({
      message: 'Event updated successfully!',
      event,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating event.', error: error.message });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private (Organizer Owner / Admin)
router.delete('/:id', auth, requireVerified, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this event.' });
    }

    await Event.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: 'Event deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting event.' });
  }
});

// @route   POST /api/events/:id/rsvp
// @desc    Register / RSVP for an event
// @access  Private (Verified user)
router.post('/:id/rsvp', auth, requireVerified, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Check capacity
    if (event.attendees.length >= event.capacity) {
      return res.status(400).json({ message: 'Event capacity reached. Cannot register.' });
    }

    // Check if already registered
    const alreadyRegistered = event.attendees.some(
      (att) => att.user.toString() === req.user._id.toString()
    );

    if (alreadyRegistered) {
      return res.status(400).json({ message: 'You have already registered for this event.' });
    }

    // Add attendee
    event.attendees.push({ user: req.user._id, registeredAt: new Date() });
    await event.save();

    // Update user's rsvpedEvents
    const user = await User.findById(req.user._id);
    if (!user.rsvpedEvents.includes(event._id)) {
      user.rsvpedEvents.push(event._id);
      await user.save();
    }

    return res.status(200).json({
      message: 'Successfully registered for event!',
      event,
    });
  } catch (error) {
    return res.status(500).json({ message: 'RSVP registration failed.', error: error.message });
  }
});

// @route   DELETE /api/events/:id/rsvp
// @desc    Cancel RSVP for an event
// @access  Private (Verified user)
router.delete('/:id/rsvp', auth, requireVerified, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Remove from event attendees
    event.attendees = event.attendees.filter(
      (att) => att.user.toString() !== req.user._id.toString()
    );
    await event.save();

    // Remove from user rsvpedEvents
    const user = await User.findById(req.user._id);
    user.rsvpedEvents = user.rsvpedEvents.filter(
      (eId) => eId.toString() !== event._id.toString()
    );
    await user.save();

    return res.status(200).json({
      message: 'RSVP cancelled successfully.',
      event,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to cancel RSVP.', error: error.message });
  }
});

// @route   GET /api/events/:id/attendees
// @desc    Get attendee list for organizer
// @access  Private (Organizer owner / Admin)
router.get('/:id/attendees', auth, requireVerified, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('attendees.user', 'name email city role createdAt');

    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view attendee list.' });
    }

    return res.status(200).json({
      totalCount: event.attendees.length,
      capacity: event.capacity,
      attendees: event.attendees,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving attendees.' });
  }
});

module.exports = router;
