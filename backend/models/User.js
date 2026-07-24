const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
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
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: ['resident', 'organizer', 'admin'],
      default: 'resident',
    },
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
    interests: {
      type: [String],
      default: ['Career & Jobs', 'Health & Wellness', 'Skill Workshops'],
    },
    city: {
      type: String,
      default: 'Indore',
    },
    language: {
      type: String,
      default: 'en',
    },
    contact: {
      type: String,
      default: '',
      trim: true,
    },
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

// Method to sanitize user output (exclude password and token)
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  delete user.verificationToken;
  delete user.verificationTokenExpires;
  return user;
};

module.exports = mongoose.model('User', userSchema);
