import express from 'express';
import { getEvents, getEventById, createEvent } from '../controllers/eventController.js';
import {
  getEventAttendance,
  updateEventAttendance,
  exportEventAttendance,
  getAttendanceAuditLogs
} from '../controllers/attendanceController.js';
import { requireOrganizer } from '../middleware/authRole.js';

const router = express.Router();

// General Event Routes
router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', createEvent);

// Organizer-only Attendance Tracking & Check-in Endpoints
router.get('/:id/attendance', requireOrganizer, getEventAttendance);
router.patch('/:id/attendance', requireOrganizer, updateEventAttendance);
router.get('/:id/attendance/export', requireOrganizer, exportEventAttendance);
router.get('/:id/attendance/audit-logs', requireOrganizer, getAttendanceAuditLogs);

export default router;
