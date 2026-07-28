const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Career & Jobs',
        'Health & Wellness',
        'Cultural Festivals',
        'Skill Workshops',
        'Civic & Community',
        'Sports & Youth',
      ],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      default: 'Indore',
    },
    tier: {
      type: String,
      enum: ['Tier 2', 'Tier 3', 'Tier 4'],
      default: 'Tier 2',
    },
    location: {
      type: String,
      required: [true, 'Location address is required'],
    },
    date: {
      type: String,
      required: [true, 'Event date is required'],
    },
    time: {
      type: String,
      required: [true, 'Event time is required'],
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizerName: {
      type: String,
      default: 'Local Community Board',
    },
    capacity: {
      type: Number,
      default: 100,
    },
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
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    },
    tags: [String],
    language: {
      type: String,
      default: 'en',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Event', eventSchema);
