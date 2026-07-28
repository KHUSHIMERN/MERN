const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    // Hindi localization field (DEV-KHUSHI)
    title_hi: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },
    // Hindi localization field (DEV-KHUSHI)
    description_hi: {
      type: String,
      trim: true,
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
        'career',
        'health',
        'culture',
        'workshop',
        'general',
      ],
      default: 'general',
    },
    location: {
      type: String,
      required: [true, 'Location address is required'],
      default: 'Online',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      default: 'Jaipur',
    },
    // City tier classification (QA)
    tier: {
      type: String,
      enum: ['Tier 2', 'Tier 3', 'Tier 4'],
      default: 'Tier 2',
    },
    // ISO date/time fields (DEV-KHUSHI) — structured date handling
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
    },
    // Human-readable date/time string fields (QA)
    date: {
      type: String,
    },
    time: {
      type: String,
    },
    // Timezone (IANA identifier) for the event (DEV-KHUSHI)
    timezone: {
      type: String,
      required: false,
      default: 'Asia/Kolkata',
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          try {
            Intl.DateTimeFormat(undefined, { timeZone: v });
            return true;
          } catch (err) {
            return false;
          }
        },
        message: props => `${props.value} is not a valid IANA timezone identifier`,
      },
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    // Human-readable organizer name (QA)
    organizerName: {
      type: String,
      default: 'Community Organizer',
    },
    // Legacy string organizer field (DEV-KHUSHI) stored as organizerLabel
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    capacity: {
      type: Number,
      default: 100,
    },
    attendeesCount: {
      type: Number,
      default: 0,
    },
    // Simple RSVP user list (DEV-KHUSHI)
    rsvpedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Rich attendees sub-document with registration timestamp (QA)
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
    tags: {
      type: [String],
      default: [],
    },
    // Primary image URL (DEV-KHUSHI)
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      trim: true,
    },
    // Alt text for accessibility (DEV-KHUSHI)
    imageUrlAlt: {
      type: String,
      default: '',
      trim: true,
    },
    // Alias image field (QA)
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    },
    // Content language (QA)
    language: {
      type: String,
      default: 'en',
    },
    // Feature flag for highlighting events (QA)
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
