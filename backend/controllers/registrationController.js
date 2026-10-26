const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const { memoryRegistrations } = require('../data/seedEvents');
const isConnectedToMongoDB = () => mongoose.connection.readyState === 1;

/**
 * POST /api/registrations
 * Submit a registration for an event.
 */
const registerForEvent = async (req, res, next) => {
  try {
    const { eventId, fullName, email, ticketType, attendees, notes, agreeTerms } = req.body;

    if (!fullName || !fullName.trim() || !email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Full name and email address are required.' });
    }

    if (!agreeTerms) {
      return res.status(400).json({ success: false, message: 'You must agree to the terms and code of conduct.' });
    }

    const regRecord = {
      id: `reg-${Date.now()}`,
      eventId: eventId || 'general',
      fullName,
      email,
      ticketType: ticketType || 'standard',
      attendees: Number(attendees) || 1,
      notes: notes || '',
      agreeTerms: Boolean(agreeTerms),
      createdAt: new Date().toISOString()
    };

    if (isConnectedToMongoDB()) {
      const dbRegistration = await Registration.create(regRecord);
      return res.status(201).json({
        success: true,
        message: 'Registration successful! Details sent to your email.',
        data: dbRegistration
      });
    }

    memoryRegistrations.push(regRecord);
    return res.status(201).json({
      success: true,
      message: 'Registration successful! Details sent to your email.',
      data: regRecord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/registrations
 * Retrieve all registrations.
 */
const getRegistrations = async (req, res, next) => {
  try {
    if (isConnectedToMongoDB()) {
      const records = await Registration.find({}).sort({ createdAt: -1 });
      return res.json({ success: true, count: records.length, data: records });
    }

    return res.json({ success: true, count: memoryRegistrations.length, data: memoryRegistrations });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerForEvent,
  getRegistrations
};
