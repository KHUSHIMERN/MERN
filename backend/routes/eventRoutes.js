const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  searchEvents
} = require('../controllers/eventController');
const {
  getEventAttendance,
  updateEventAttendance,
  exportEventAttendance,
  getAttendanceAuditLogs
} = require('../controllers/attendanceController');
const { auth, requireVerified, requireRole } = require('../middleware/auth');
const privileged = [auth, requireVerified, requireRole('organizer', 'admin')];

// General Event REST API Endpoints
router.get('/', getEvents);
router.post('/', ...privileged, createEvent);
router.get('/search', searchEvents);
router.get('/:id', getEventById);
router.put('/:id', ...privileged, updateEvent);
router.delete('/:id', ...privileged, deleteEvent);
router.patch('/:id/publish', ...privileged, publishEvent);

// Organizer-only Attendance Tracking & Check-in Endpoints
router.get('/:id/attendance', ...privileged, getEventAttendance);
router.patch('/:id/attendance', ...privileged, updateEventAttendance);
router.get('/:id/attendance/export', ...privileged, exportEventAttendance);
router.get('/:id/attendance/audit-logs', ...privileged, getAttendanceAuditLogs);

module.exports = router;
