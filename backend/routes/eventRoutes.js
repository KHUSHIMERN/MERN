import express from 'express';
import {
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
} from '../controllers/eventController.js';
import {
  getEventAttendance,
  updateEventAttendance,
  exportEventAttendance,
  getAttendanceAuditLogs
} from '../controllers/attendanceController.js';
import { requireOrganizer } from '../middleware/authRole.js';

const router = express.Router();

// General Event REST API Endpoints
router.get('/', getEvents);
router.get('/search', searchEvents);
router.get('/:id', getEventById);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.patch('/:id/publish', publishEvent);

// Organizer-only Attendance Tracking & Check-in Endpoints
router.get('/:id/attendance', requireOrganizer, getEventAttendance);
router.patch('/:id/attendance', requireOrganizer, updateEventAttendance);
router.get('/:id/attendance/export', requireOrganizer, exportEventAttendance);
router.get('/:id/attendance/audit-logs', requireOrganizer, getAttendanceAuditLogs);

export default router;
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
