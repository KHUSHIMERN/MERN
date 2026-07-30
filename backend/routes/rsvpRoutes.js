const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { rsvpEvent, cancelRSVP, getEventRSVPs } = require('../controllers/rsvpController');

// All RSVP endpoints require authentication
router.use(requireAuth);

// GET /api/events/:id/rsvps - Retrieve registrations list and capacity details
router.get('/:id/rsvps', getEventRSVPs);

// POST /api/events/:id/rsvp - Register for event (or join waitlist)
router.post('/:id/rsvp', rsvpEvent);

// DELETE /api/events/:id/rsvp - Cancel RSVP registration
router.delete('/:id/rsvp', cancelRSVP);

module.exports = router;
