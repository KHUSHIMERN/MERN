const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { getUserProfile, updateUserProfile } = require('../controllers/userController');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile via controller (DEV-KHUSHI route)
// @access  Private
router.route('/profile')
  .get(getUserProfile)
  .patch(updateUserProfile);

// @route   GET /api/users/me
// @desc    Read profile of currently authenticated user (QA route)
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('rsvpedEvents');
    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }
    return res.status(200).json({ user: user.toSafeObject() });
  } catch (error) {
    console.error('GET /api/users/me Error:', error);
    return res.status(500).json({ message: 'Server error fetching user profile.', error: error.message });
  }
});

// @route   PUT /api/users/me
// @desc    Update profile fields (name, contact, language, city, interests). Role field explicitly ignored to prevent escalation.
// @access  Private
router.put('/me', auth, async (req, res) => {
  try {
    const { name, contact, language, city, interests, preferredTimezone, role } = req.body;
    const user = req.user;

    // Security check: Ignore role field if passed to prevent privilege escalation via PUT
    if (role !== undefined && role !== user.role) {
      console.warn(`🔒 Ignored attempted role escalation attempt by user ${user._id} to role: ${role}`);
    }

    // Input Validation
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Name cannot be empty.' });
      }
      user.name = name.trim();
    }

    if (contact !== undefined) {
      user.contact = contact.trim();
    }

    if (language !== undefined) {
      user.language = language;
    }

    if (city !== undefined) {
      user.city = city;
    }

    if (interests && Array.isArray(interests)) {
      user.interests = interests;
    }

    if (preferredTimezone !== undefined) {
      if (preferredTimezone) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: preferredTimezone });
        } catch {
          return res.status(400).json({ message: 'Invalid IANA timezone identifier.' });
        }
      }
      user.preferredTimezone = preferredTimezone || null;
    }

    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully!',
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('PUT /api/users/me Error:', error);
    return res.status(500).json({ message: 'Failed to update user profile.', error: error.message });
  }
});

module.exports = router;
