const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // 'ATTENDANCE_UPDATE', 'ROLE_APPROVE', etc.
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    eventId: { type: String, required: false },
    registrationId: { type: String, required: false },
    attendeeName: { type: String, default: '' },
    attendeeEmail: { type: String, default: '' },
    statusPresent: { type: Boolean, default: false },
    checkInAt: { type: Date, default: null },
    performedBy: { type: String, default: 'Organizer Admin' },
    userRole: { type: String, default: 'organizer' },
    details: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
