const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  rsvpEvent
} = require('../controllers/eventController');

router.route('/')
  .get(getEvents)
  .post(createEvent);

router.route('/:id/rsvp')
  .post(rsvpEvent);

router.route('/:id')
  .get(getEventById)
  .put(updateEvent)
  .delete(deleteEvent);

module.exports = router;
