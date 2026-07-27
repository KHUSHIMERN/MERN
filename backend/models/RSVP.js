const mongoose = require('mongoose');

const RSVPSchema = new mongoose.Schema({
  // Reference to the user who RSVP'd
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Reference to the event being registered for
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  // Status of registration: 'confirmed' or 'waitlist'
  status: {
    type: String,
    enum: ['confirmed', 'waitlist'],
    required: true,
    default: 'confirmed'
  },
  // Time when user was promoted from waitlist to confirmed
  promotedAt: {
    type: Date
  }
}, {
  // Automatically manages 'createdAt' and 'updatedAt' timestamps
  timestamps: true
});

// INDEXES

// 1. Compound index on eventId + status
// Helps quickly retrieve all RSVPs for an event by status (e.g., counting confirmed reservations).
RSVPSchema.index({ eventId: 1, status: 1 });

// 2. Compound index on eventId + createdAt
// Crucial for waitlist operations to fetch waitlisted users in chronological (FIFO) order.
RSVPSchema.index({ eventId: 1, createdAt: 1 });

// 3. Unique compound index on eventId + userId
// Prevents duplicate RSVP entries for the same event by the same user.
RSVPSchema.index({ eventId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('RSVP', RSVPSchema);
