const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    ticketType: { type: String, default: 'standard' },
    attendees: { type: Number, default: 1 },
    notes: { type: String, default: '' },
    agreeTerms: { type: Boolean, required: true },
    statusPresent: { type: Boolean, default: false },
    checkInAt: { type: Date, default: null },
    rsvpStatus: { type: String, enum: ['confirmed', 'waitlist'], default: 'confirmed' },
    markedBy: { type: String, default: null }
  },
  { timestamps: true }
);

const Registration = mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
module.exports = Registration;
