const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true
    },
    title_hi: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Event description is required']
    },
    description_hi: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['career', 'health', 'culture', 'workshop', 'general'],
      default: 'general'
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      default: 'Online'
    },
    city: {
      type: String,
      default: 'Jaipur'
    },
    startDate: {
      type: Date,
      required: [true, 'Start date and time is required']
    },
    endDate: {
      type: Date
    },
    timezone: {
      type: String,
      required: [true, 'Timezone (IANA identifier) is required'],
      default: 'Asia/Kolkata',
      trim: true,
      validate: {
        validator: function (v) {
          try {
            Intl.DateTimeFormat(undefined, { timeZone: v });
            return true;
          } catch (err) {
            return false;
          }
        },
        message: props => `${props.value} is not a valid IANA timezone identifier`
      }
    },
    organizer: {
      type: String,
      default: 'Community Organizer'
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    capacity: {
      type: Number,
      default: 100
    },
    attendeesCount: {
      type: Number,
      default: 0
    },
    rsvpedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    tags: {
      type: [String],
      default: []
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true
    },
    imageUrlAlt: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Event', eventSchema);
