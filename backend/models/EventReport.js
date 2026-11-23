const mongoose = require('mongoose');

const eventReportSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Event ID is required for reporting'],
      index: true,
    },
    eventTitle: {
      type: String,
      default: '',
      trim: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Reporter user ID is required'],
      index: true,
    },
    reporterName: {
      type: String,
      default: 'Community Resident',
      trim: true,
    },
    reporterEmail: {
      type: String,
      default: '',
      trim: true,
    },
    reason: {
      type: String,
      required: [true, 'Report reason category is required'],
      enum: ['spam', 'inappropriate', 'misleading', 'safety_concern', 'scam', 'other'],
    },
    details: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed', 'action_taken'],
      default: 'pending',
      index: true,
    },
    actionTaken: {
      type: String,
      enum: ['none', 'dismissed', 'unverified', 'unpublish', 'event_deleted'],
      default: 'none',
    },
    adminNotes: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to help check duplicate user reports for an event quickly
eventReportSchema.index({ eventId: 1, reporterId: 1 });

module.exports = mongoose.model('EventReport', eventReportSchema);
