const express = require('express');
const router = express.Router();
const { optionalAuth, auth } = require('../middleware/auth');
const {
  getVolunteerMatches,
  registerAsVolunteer,
  getEventVolunteers,
} = require('../controllers/volunteerController');

// @route   GET /api/volunteer/recommendations
// @desc    Get skill & volunteer matched events and workshops
// @access  Public / Optional Auth
router.get('/recommendations', optionalAuth, getVolunteerMatches);
router.get('/matches', optionalAuth, getVolunteerMatches);

// @route   POST /api/volunteer/:id/register
// @desc    Register as a volunteer for an event
// @access  Private / Auth required
router.post('/:id/register', optionalAuth, registerAsVolunteer);

// @route   GET /api/volunteer/:id/volunteers
// @desc    View volunteers for an event
// @access  Private
router.get('/:id/volunteers', optionalAuth, getEventVolunteers);

module.exports = router;
