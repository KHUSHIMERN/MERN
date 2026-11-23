const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Event ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'User ID is required'],
      index: true,
    },
    userName: {
      type: String,
      default: 'Community Member',
      trim: true,
    },
    userEmail: {
      type: String,
      default: '',
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      default: '',
    },
    isVerifiedAttendee: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee one feedback entry per user per event
feedbackSchema.index({ eventId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
