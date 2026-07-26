const mongoose = require('mongoose');
const RSVP = require('../models/RSVP');
const Event = require('../models/Event');
const User = require('../models/User');

// Create RSVP or join waitlist
const rsvpEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if event ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate user authentication in the controller
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user._id;

    // Validate user role - restrict RSVP to 'resident' (or allow others for demo, but check role)
    if (req.user.role !== 'resident') {
      return res.status(403).json({ 
        message: 'Only residents can RSVP for events.' 
      });
    }

    // 1. Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // 2. Check if user already RSVP'd
    const existingRSVP = await RSVP.findOne({ eventId: id, userId });
    if (existingRSVP) {
      return res.status(400).json({ 
        message: 'You have already registered for this event.',
        status: existingRSVP.status 
      });
    }

    // 3. Count confirmed RSVPs
    const confirmedCount = await RSVP.countDocuments({ eventId: id, status: 'confirmed' });

    let status = 'confirmed';
    if (confirmedCount >= event.capacity) {
      status = 'waitlist';
    }

    // 4. Save RSVP
    const newRSVP = new RSVP({
      userId,
      eventId: id,
      status
    });
    await newRSVP.save();

    if (status === 'confirmed') {
      return res.status(201).json({
        message: 'RSVP confirmed successfully!',
        rsvp: newRSVP,
        status: 'confirmed'
      });
    } else {
      // Calculate waitlist position (1-based index)
      const waitlistPosition = await RSVP.countDocuments({
        eventId: id,
        status: 'waitlist',
        createdAt: { $lte: newRSVP.createdAt }
      });

      return res.status(201).json({
        message: 'Event is at capacity. Added to the waitlist.',
        rsvp: newRSVP,
        status: 'waitlist',
        waitlistPosition
      });
    }

  } catch (error) {
    console.error('RSVP Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Cancel RSVP and promote waitlisted user
const cancelRSVP = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if event ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate user authentication in the controller
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user._id;

    // Validate user role - restrict RSVP cancel to 'resident'
    if (req.user.role !== 'resident') {
      return res.status(403).json({ 
        message: 'Only residents can cancel RSVPs.' 
      });
    }

    // Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Find the RSVP entry
    const rsvpToDelete = await RSVP.findOne({ eventId: id, userId });
    if (!rsvpToDelete) {
      return res.status(404).json({ message: 'No registration record found for this event.' });
    }

    const previousStatus = rsvpToDelete.status;
    await RSVP.deleteOne({ _id: rsvpToDelete._id });

    let slotFreed = false;
    let promotedUser = null;

    // If a confirmed user cancels, check if we need to promote a waitlisted user
    if (previousStatus === 'confirmed') {
      slotFreed = true;
      // Get the oldest waitlisted user (FIFO)
      const oldestWaitlisted = await RSVP.findOne({ eventId: id, status: 'waitlist' }).sort({ createdAt: 1 });
      if (oldestWaitlisted) {
        oldestWaitlisted.status = 'confirmed';
        await oldestWaitlisted.save();
        
        // Fetch user details for the promoted user response
        promotedUser = await User.findById(oldestWaitlisted.userId).select('name email');
      }
    }

    return res.status(200).json({
      message: 'Registration successfully cancelled.',
      slotFreed,
      promotedUser: promotedUser ? { id: promotedUser._id, name: promotedUser.name, email: promotedUser.email } : null
    });

  } catch (error) {
    console.error('Cancel RSVP Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get event RSVPs and waitlist positions
const getEventRSVPs = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if event ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate user authentication in the controller
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Find the event to check its capacity
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get all RSVPs for this event, populated with user info
    const rsvps = await RSVP.find({ eventId: id })
      .populate('userId', 'name email role')
      .sort({ createdAt: 1 });

    const confirmedList = rsvps.filter(r => r.status === 'confirmed');
    const waitlistList = rsvps.filter(r => r.status === 'waitlist');

    // Calculate current user's RSVP status & waitlist position
    let currentUserStatus = 'none';
    let currentUserWaitlistPosition = 0;

    if (req.user) {
      const userRSVP = rsvps.find(r => r.userId._id.toString() === req.user._id.toString());
      if (userRSVP) {
        currentUserStatus = userRSVP.status;
        if (currentUserStatus === 'waitlist') {
          // Find index in waitlist array (1-based index)
          currentUserWaitlistPosition = waitlistList.findIndex(r => r.userId._id.toString() === req.user._id.toString()) + 1;
        }
      }
    }

    return res.status(200).json({
      eventId: id,
      capacity: event.capacity,
      confirmedCount: confirmedList.length,
      waitlistCount: waitlistList.length,
      confirmed: confirmedList.map(r => ({
        id: r.userId._id,
        name: r.userId.name,
        email: r.userId.email,
        rsvpId: r._id,
        createdAt: r.createdAt
      })),
      waitlist: waitlistList.map((r, index) => ({
        id: r.userId._id,
        name: r.userId.name,
        email: r.userId.email,
        rsvpId: r._id,
        createdAt: r.createdAt,
        position: index + 1
      })),
      currentUser: {
        status: currentUserStatus,
        waitlistPosition: currentUserWaitlistPosition
      }
    });

  } catch (error) {
    console.error('Get RSVPs Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  rsvpEvent,
  cancelRSVP,
  getEventRSVPs
};
