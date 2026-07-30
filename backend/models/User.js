const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    // Authentication fields (QA)
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: ['attendee', 'resident', 'organizer', 'admin'],
      default: 'attendee',
    },
    // Email verification fields (QA)
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpires: {
      type: Date,
      default: null,
    },
    city: {
      type: String,
      default: 'Jaipur',
    },
    interests: {
      type: [String],
      default: ['Career & Jobs', 'Health & Wellness', 'Skill Workshops'],
    },
    // IANA timezone preference (DEV-KHUSHI)
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
        message: props => `${props.value} is not a valid IANA timezone identifier`,
      },
    },
    // Language preference (DEV-KHUSHI)
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en',
    },
    // Language field (QA alias)
    language: {
      type: String,
      default: 'en',
    },
    // Contact info (QA)
    contact: {
      type: String,
      default: '',
      trim: true,
    },
    // Organizer role request workflow (QA)
    organizerRoleRequest: {
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      description: {
        type: String,
        default: '',
        trim: true,
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      adminNote: {
        type: String,
        default: '',
      },
    },
    rsvpedEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to sanitize user output (exclude password and token) — QA
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  delete user.verificationToken;
  delete user.verificationTokenExpires;
  return user;
};

module.exports = mongoose.model('User', userSchema);
