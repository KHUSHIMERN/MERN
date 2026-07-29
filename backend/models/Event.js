const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    placeName: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  { _id: false }
);

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
      default: '',
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
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      default: null,
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
      default: 'org-admin',
    },
    capacity: {
      type: Number,
      default: 100,
    },
    attendeesCount: {
      type: Number,
      default: 0,
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
    },
    waitlistUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    published: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      trim: true,
    },
    imageUrlAlt: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    },
    language: {
      type: String,
      default: 'en',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    itemKey: {
      type: String,
      default: null,
    },
    id: {
      type: String,
      default: null,
    },
    seatsLeft: {
      type: Number,
      default: 50,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index(
  { title: 'text', description: 'text' },
  { language_override: 'none' }
);
eventSchema.index({ tags: 1 });
eventSchema.index({ published: 1, startDate: 1 });
eventSchema.index({ category: 1, published: 1 });

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

// Ensure legacy text index with default language_override: "language" is dropped if present
if (mongoose.connection) {
  const dropLegacyIndex = async () => {
    try {
      const collection = mongoose.connection.collection('events');
      const indexes = await collection.indexes();
      const legacyTextIndex = indexes.find(
        (idx) => idx.name === 'title_text_description_text' && idx.language_override !== 'none'
      );
      if (legacyTextIndex) {
        await collection.dropIndex('title_text_description_text');
        await Event.syncIndexes();
      }
    } catch (err) {
      // Ignore if index does not exist or collection is not initialized yet
    }
  };

  if (mongoose.connection.readyState === 1) {
    dropLegacyIndex();
  } else {
    mongoose.connection.once('connected', dropLegacyIndex);
  }
}

module.exports = Event;
