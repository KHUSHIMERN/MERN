const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const {
  getEventFeedback,
  submitEventFeedback,
  deleteEventFeedback,
} = require('../controllers/feedbackController');

// GET /api/events/:id/feedback - Get rating distribution and reviews
router.get('/:id/feedback', optionalAuth, getEventFeedback);

// POST /api/events/:id/feedback - Submit or update event review
router.post('/:id/feedback', optionalAuth, submitEventFeedback);

// DELETE /api/events/:id/feedback - Remove user feedback
router.delete('/:id/feedback', optionalAuth, deleteEventFeedback);

module.exports = router;
