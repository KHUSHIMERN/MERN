const express = require('express');
const router = express.Router();
const { getOrganizerAttendanceMetrics } = require('../controllers/eventController');

// GET /organizer/:id/attendance-metrics
router.get('/:id/attendance-metrics', getOrganizerAttendanceMetrics);

module.exports = router;
