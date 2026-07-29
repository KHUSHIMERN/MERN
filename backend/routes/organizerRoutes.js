const express = require('express');
const router = express.Router();
const { getOrganizerAttendanceMetrics, exportOrganizerAttendanceMetricsCSV } = require('../controllers/eventController');

// GET /organizer/:id/attendance-metrics/export
router.get('/:id/attendance-metrics/export', exportOrganizerAttendanceMetricsCSV);

// GET /organizer/:id/attendance-metrics
router.get('/:id/attendance-metrics', getOrganizerAttendanceMetrics);

module.exports = router;
