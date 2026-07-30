const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  rsvpEvent,
  cancelRSVP,
  getCurrentUserRsvp,
  getEventRSVPs,
} = require('../controllers/rsvpController');

// GET /api/events/:id/rsvps - Retrieve registrations list and capacity details
router.get('/:id/rsvps', requireAuth, getEventRSVPs);
router.get('/:id/rsvp', requireAuth, getCurrentUserRsvp);

// POST /api/events/:id/rsvp - Register for event (or join waitlist)
router.post('/:id/rsvp', requireAuth, rsvpEvent);

// DELETE /api/events/:id/rsvp - Cancel RSVP registration
router.delete('/:id/rsvp', requireAuth, cancelRSVP);

module.exports = router;
