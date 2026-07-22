const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true
    },
    role: {
      type: String,
      enum: ['attendee', 'organizer'],
      default: 'attendee'
    },
    city: {
      type: String,
      default: 'Jaipur'
    },
    interests: {
      type: [String],
      default: ['career', 'workshop']
    },
    preferredTimezone: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          if (!v) return true;
          try {
            Intl.DateTimeFormat(undefined, { timeZone: v });
            return true;
          } catch (e) {
            return false;
          }
        },
        message: props => `${props.value} is not a valid IANA timezone identifier`
      }
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en'
    },
    rsvpedEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
