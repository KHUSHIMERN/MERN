const mongoose = require('mongoose');

const eventEmbeddingSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      unique: true,
      index: true,
    },
    contentHash: {
      type: String,
      required: true,
      index: true,
    },
    vector: {
      type: [Number],
      required: true,
    },
    dimensions: {
      type: Number,
      default: 64,
    },
    model: {
      type: String,
      default: 'text-embedding-3-small',
    },
    language: {
      type: String,
      default: 'en',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

eventEmbeddingSchema.index({ eventId: 1, contentHash: 1 });

const EventEmbedding =
  mongoose.models.EventEmbedding || mongoose.model('EventEmbedding', eventEmbeddingSchema);

module.exports = EventEmbedding;
