import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // 'ATTENDANCE_UPDATE' or 'BULK_ATTENDANCE_UPDATE'
    eventId: { type: String, required: true },
    registrationId: { type: String, required: true },
    attendeeName: { type: String },
    attendeeEmail: { type: String },
    statusPresent: { type: Boolean, required: true },
    checkInAt: { type: Date, default: null },
    performedBy: { type: String, default: 'Organizer Admin' },
    userRole: { type: String, default: 'organizer' },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

module.exports = mongoose.model('AuditLog', auditLogSchema);
