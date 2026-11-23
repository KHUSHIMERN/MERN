/**
 * Reminder Routes — Feature 5: Smart Calendar and Reminders
 * Exposes endpoints to schedule/send event reminders and fetch
 * user's registered calendar events.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { sendEventReminder, triggerAutomatedReminders } = require('../services/reminderService');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const { INITIAL_EVENTS } = require('../data/seedEvents');

const isConnectedToMongoDB = () => mongoose.connection.readyState === 1;

// @desc    Fetch events formatted for the interactive Smart Calendar
// @route   GET /api/reminders/calendar-events
router.get('/calendar-events', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?._id;
    const filterOnlyRegistered = req.query.registeredOnly === 'true';

    let allEvents = [];
    if (isConnectedToMongoDB()) {
      allEvents = await Event.find({ published: true }).lean();
    }
    if (!allEvents.length) {
      allEvents = INITIAL_EVENTS.filter((e) => Boolean(e.published)).map((e) => ({ ...e }));
    }

    let userRsvpMap = new Map();
    if (userId && isConnectedToMongoDB()) {
      const rsvps = await RSVP.find({ user: userId });
      rsvps.forEach((r) => {
        userRsvpMap.set(String(r.event), r.status);
      });
    }

    const calendarItems = allEvents
      .map((evt) => {
        const evtId = String(evt._id || evt.id);
        const rsvpStatus = userRsvpMap.get(evtId) || (evt.userRegistrationStatus || null);
        const isRegistered = Boolean(rsvpStatus);

        const startDate = evt.startDate ? new Date(evt.startDate) : evt.date ? new Date(evt.date) : new Date();
        const endDate = evt.endDate ? new Date(evt.endDate) : new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

        // Category color code
        const categoryColors = {
          tech: '#6366f1',
          career: '#3b82f6',
          workshop: '#10b981',
          culture: '#f59e0b',
          charity: '#ec4899',
          health: '#14b8a6',
        };
        const catKey = String(evt.category || 'general').toLowerCase();
        const color = categoryColors[catKey] || '#8b5cf6';

        return {
          id: evtId,
          title: evt.title,
          title_hi: evt.title_hi,
          title_kn: evt.title_kn,
          description: evt.description,
          description_hi: evt.description_hi,
          description_kn: evt.description_kn,
          category: evt.category,
          city: evt.city || (typeof evt.location === 'object' ? evt.location?.placeName : evt.location),
          startDate,
          endDate,
          date: evt.date || startDate.toISOString().split('T')[0],
          time: evt.time || '10:00 AM',
          timezone: evt.timezone || 'Asia/Kolkata',
          isRegistered,
          rsvpStatus: rsvpStatus || 'none',
          color,
          location: typeof evt.location === 'object' ? evt.location?.placeName : evt.location,
        };
      })
      .filter((item) => {
        if (filterOnlyRegistered) {
          return item.isRegistered;
        }
        return true;
      });

    return res.status(200).json({
      success: true,
      count: calendarItems.length,
      events: calendarItems,
    });
  } catch (error) {
    console.error('Calendar Events Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar events.',
      error: error.message,
    });
  }
});

// @desc    Send an event reminder (in-app and/or email)
// @route   POST /api/reminders/send
router.post('/send', optionalAuth, async (req, res) => {
  try {
    const { eventId, channel = 'in-app', userEmail } = req.body;
    const userId = req.user?._id || req.body.userId || 'usr-guest-test';

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'eventId is required to send reminder.',
      });
    }

    const result = await sendEventReminder({
      userId,
      eventId,
      channel,
      userEmail: userEmail || req.user?.email,
    });

    return res.status(200).json({
      success: true,
      message: `Reminder sent successfully via ${channel}.`,
      data: result,
    });
  } catch (error) {
    console.error('Send Reminder Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to dispatch reminder.',
    });
  }
});

// @desc    Trigger automated batch reminder check
// @route   POST /api/reminders/trigger-check
router.post('/trigger-check', optionalAuth, async (req, res) => {
  try {
    const hoursAhead = Number(req.body.hoursAhead) || 72;
    const result = await triggerAutomatedReminders(hoursAhead);

    return res.status(200).json({
      success: true,
      message: 'Automated reminders check executed.',
      data: result,
    });
  } catch (error) {
    console.error('Trigger Reminders Check Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
