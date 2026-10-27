const mongoose = require('mongoose');

const SuggestionAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  eventType: {
    type: String,
    enum: ['impression', 'click'],
    required: true
  },
  query: {
    type: String,
    trim: true,
    default: ''
  },
  suggestion: {
    id: { type: String },
    text: { type: String, required: true },
    type: { type: String, enum: ['title', 'tag'], default: 'title' },
    language: { type: String, default: 'en' },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient aggregation and time-series querying
SuggestionAnalyticsSchema.index({ eventType: 1, timestamp: -1 });
SuggestionAnalyticsSchema.index({ 'suggestion.text': 1, eventType: 1 });

module.exports = mongoose.model('SuggestionAnalytics', SuggestionAnalyticsSchema);
