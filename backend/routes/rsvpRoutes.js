const express = require('express');
const router = express.Router();
const { requireAuth, requireVerified } = require('../middleware/auth');
const verified = [requireAuth, requireVerified];
const {
  rsvpEvent,
  cancelRSVP,
  getCurrentUserRsvp,
  getEventRSVPs,
} = require('../controllers/rsvpController');

// GET /api/events/:id/rsvps - Retrieve registrations list and capacity details
router.get('/:id/rsvps', ...verified, getEventRSVPs);
router.get('/:id/rsvp', ...verified, getCurrentUserRsvp);

// POST /api/events/:id/rsvp - Register for event (or join waitlist)
router.post('/:id/rsvp', ...verified, rsvpEvent);

// DELETE /api/events/:id/rsvp - Cancel RSVP registration
router.delete('/:id/rsvp', ...verified, cancelRSVP);

module.exports = router;
