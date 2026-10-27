const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// Helper to extract user from token if available
const getAuthenticatedUser = async (req) => {
  if (req.user) return req.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      if (decoded && decoded.id) {
        const found = await User.findById(decoded.id);
        if (found) return found;
      }
    } catch (e) {
      // Continue to fallback
    }
  }
  return null;
};

// @desc    Get mock/current user profile
// @route   GET /api/users/profile
exports.getUserProfile = async (req, res) => {
  try {
    let user = await getAuthenticatedUser(req);
    if (!user) {
      user = await User.findOne({});
      if (!user) {
        user = await User.create({ name: 'Local Resident', email: 'resident@tier2.org', preferredTimezone: null });
      }
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user preferred timezone
// @route   PATCH /api/users/profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { preferredTimezone } = req.body;

    if (preferredTimezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: preferredTimezone });
      } catch (e) {
        return res.status(400).json({ success: false, message: `Invalid IANA timezone identifier: '${preferredTimezone}'` });
      }
    }

    let user = await getAuthenticatedUser(req);
    if (!user) {
      user = await User.findOne({});
      if (!user) {
        user = await User.create({ name: 'Local Resident', email: 'resident@tier2.org', preferredTimezone });
      } else {
        user.preferredTimezone = preferredTimezone || null;
        await user.save();
      }
    } else {
      user.preferredTimezone = preferredTimezone || null;
      await user.save();
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
