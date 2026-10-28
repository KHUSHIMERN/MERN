const mongoose = require('mongoose');

const userInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
      index: true,
    },
    interactionType: {
      type: String,
      enum: ['view', 'rsvp', 'filter', 'search', 'click'],
      required: true,
      default: 'view',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    language: {
      type: String,
      trim: true,
      default: 'en',
    },
    weight: {
      type: Number,
      default: 1.0, // view = 1.0, click = 1.5, filter/search = 2.0, rsvp = 5.0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

userInteractionSchema.index({ userId: 1, timestamp: -1 });
userInteractionSchema.index({ userId: 1, interactionType: 1 });
userInteractionSchema.index({ eventId: 1, interactionType: 1 });

const UserInteraction =
  mongoose.models.UserInteraction || mongoose.model('UserInteraction', userInteractionSchema);

module.exports = UserInteraction;
