const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    eventId: {
      type: String,
    },
    registrationId: {
      type: String,
    },
    attendeeName: {
      type: String,
      default: '',
    },
    attendeeEmail: {
      type: String,
      default: '',
    },
    statusPresent: {
      type: Boolean,
      default: false,
    },
    checkInAt: {
      type: Date,
      default: null,
    },
    performedBy: {
      type: String,
      default: 'Organizer Admin',
    },
    userRole: {
      type: String,
      default: 'organizer',
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    details: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
