const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const { auth, requireVerified } = require('../middleware/auth');

const router = express.Router();

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
    if (event.attendees && event.attendees.length >= event.capacity) {
      return res.status(400).json({ message: 'Event capacity reached. Cannot register.' });
    }

    // Check if already registered
    const alreadyRegistered = event.attendees && event.attendees.some(
      (att) => att.user.toString() === req.user._id.toString()
    );

    if (alreadyRegistered) {
      return res.status(400).json({ message: 'You have already registered for this event.' });
    }

    // Add attendee
    if (!event.attendees) event.attendees = [];
    event.attendees.push({ user: req.user._id, registeredAt: new Date() });
    await event.save();

    // Update user's rsvpedEvents
    const user = await User.findById(req.user._id);
    if (user && !user.rsvpedEvents.includes(event._id)) {
      user.rsvpedEvents.push(event._id);
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully registered for event!',
      event,
    });
  } catch (error) {
    console.error('RSVP POST error:', error);
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
    if (event.attendees) {
      event.attendees = event.attendees.filter(
        (att) => att.user.toString() !== req.user._id.toString()
      );
    }
    await event.save();

    // Remove from user rsvpedEvents
    const user = await User.findById(req.user._id);
    if (user) {
      user.rsvpedEvents = user.rsvpedEvents.filter(
        (eId) => eId.toString() !== event._id.toString()
      );
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'RSVP cancelled successfully.',
      event,
    });
  } catch (error) {
    console.error('RSVP DELETE error:', error);
    return res.status(500).json({ message: 'Failed to cancel RSVP.', error: error.message });
  }
});

module.exports = router;
