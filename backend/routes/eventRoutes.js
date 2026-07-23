const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  getOrganizerAttendanceMetrics,
  exportOrganizerAttendanceMetricsCSV
} = require('../controllers/eventController');

router.get('/organizer/:id/attendance-metrics/export', exportOrganizerAttendanceMetricsCSV);
router.get('/organizer/:id/attendance-metrics', getOrganizerAttendanceMetrics);

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
