const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    title_hi: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },
    description_hi: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      default: 'general',
    },
    location: {
      type: mongoose.Schema.Types.Mixed,
      default: 'Online',
    },
    city: {
      type: String,
      default: 'Jaipur',
    },
    tier: {
      type: String,
      enum: ['Tier 2', 'Tier 3', 'Tier 4'],
      default: 'Tier 2',
    },
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
    },
    date: {
      type: String,
    },
    time: {
      type: String,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    organizerName: {
      type: String,
      default: 'Community Organizer',
    },
    organizerId: {
      type: mongoose.Schema.Types.Mixed,
    },
    capacity: {
      type: Number,
      default: 100,
    },
    attendeesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rsvpedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    attendees: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    checkedInCount: {
      type: Number,
      default: 0,
    },
    checkedInUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    waitlistCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    waitlistUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    tags: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      trim: true,
    },
    imageUrlAlt: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    },
    language: {
      type: String,
      default: 'en',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    published: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ tags: 1 });

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
module.exports = Event;
