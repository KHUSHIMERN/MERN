const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  searchEvents,
  rsvpEvent,
  getOrganizerAttendanceMetrics,
  exportOrganizerAttendanceMetricsCSV
} = require('../controllers/eventController');
const {
  getEventAttendance,
  updateEventAttendance,
  exportEventAttendance,
  getAttendanceAuditLogs
} = require('../controllers/attendanceController');
const { requireOrganizer } = require('../middleware/authRole');

// General Event REST API Endpoints
router.get('/', getEvents);
router.post('/', createEvent);
router.get('/search', searchEvents);
router.get('/organizer/:id/attendance-metrics/export', exportOrganizerAttendanceMetricsCSV);
router.get('/organizer/:id/attendance-metrics', getOrganizerAttendanceMetrics);

router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.patch('/:id/publish', publishEvent);
router.post('/:id/rsvp', rsvpEvent);

// Organizer-only Attendance Tracking & Check-in Endpoints
router.get('/:id/attendance', requireOrganizer, getEventAttendance);
router.patch('/:id/attendance', requireOrganizer, updateEventAttendance);
router.get('/:id/attendance/export', requireOrganizer, exportEventAttendance);
router.get('/:id/attendance/audit-logs', requireOrganizer, getAttendanceAuditLogs);

module.exports = router;
