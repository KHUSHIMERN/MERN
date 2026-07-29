const connectDB = require('../config/db.js');
const Registration = require('../models/Registration.js');
const { memoryRegistrations } = require('../data/seedEvents.js');

const isConnectedToMongoDB = () => connectDB.isConnectedToMongoDB;

/**
 * POST /api/registrations
 * Submit a registration for an event.
 */
exports.registerForEvent = async (req, res, next) => {
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

    if (memoryRegistrations) memoryRegistrations.push(regRecord);
    return res.status(201).json({
      success: true,
      message: 'Registration successful! Details sent to your email.',
      data: regRecord
    });
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/registrations
 * Retrieve all registrations.
 */
exports.getRegistrations = async (req, res, next) => {
  try {
    if (isConnectedToMongoDB()) {
      const records = await Registration.find({}).sort({ createdAt: -1 });
      return res.json({ success: true, count: records.length, data: records });
    }

    return res.json({ success: true, count: (memoryRegistrations || []).length, data: memoryRegistrations || [] });
  } catch (error) {
    if (next) return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
