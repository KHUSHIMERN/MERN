const express = require('express');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');
const { INITIAL_EVENTS } = require('../data/seedEvents');
const {
  getPersonalizedRecommendations,
  recordInteraction,
  getMetrics,
  resetMetrics,
} = require('../services/recommendationService');

const router = express.Router();

const isConnectedToMongoDB = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

// Helper: extract authenticated user from optional Bearer token
const extractUser = async (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id && isConnectedToMongoDB()) {
        const user = await User.findById(decoded.id).populate('rsvpedEvents');
        return user;
      }
    } catch (err) {
      // Invalid/expired token -> treat as guest
    }
  }
  return null;
};

/**
 * @route   GET /api/recommendations
 * @desc    Get AI-powered personalized event recommendations with embedding similarity,
 *          user interaction history, language awareness, and popularity/locality fallback.
 * @access  Public / Private (Enhanced for authenticated users)
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 4);
    const targetCity = req.query.city || '';
    const targetLanguage = req.query.language || '';

    const user = await extractUser(req);

    // Fetch candidate events from MongoDB or fallback to in-memory seeds
    let events = [];
    if (isConnectedToMongoDB()) {
      events = await Event.find({ published: true }).populate('organizer', 'name email role');
    }
    if (!events.length) {
      events = [...INITIAL_EVENTS];
    }

    if (!events.length) {
      return res.status(200).json({
        success: true,
        recommendations: [],
        source: 'empty',
        metrics: getMetrics(),
      });
    }

    // Call recommendations microservice
    const result = await getPersonalizedRecommendations({
      user,
      events,
      limit,
      targetCity,
      targetLanguage,
    });

    return res.status(200).json({
      success: true,
      recommendations: result.recommendations,
      source: result.source,
      isFallback: result.isFallback,
      metrics: result.metrics,
      userContext: {
        authenticated: Boolean(user),
        city: targetCity || user?.city || 'Jaipur',
        language: targetLanguage || user?.preferredLanguage || user?.language || 'en',
      },
    });
  } catch (error) {
    console.error('Recommendation Route Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating recommendations.',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/recommendations/interactions
 * @desc    Record user interaction (view, click, rsvp, filter, search) to refine future AI recommendations
 * @access  Public / Private
 */
router.post('/interactions', async (req, res) => {
  try {
    const { userId: reqUserId, eventId, interactionType, category, city, language, metadata } = req.body;

    let targetUserId = reqUserId;
    if (!targetUserId) {
      const user = await extractUser(req);
      targetUserId = user?._id;
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required to record user interaction.',
      });
    }

    const interaction = await recordInteraction({
      userId: targetUserId,
      eventId: eventId || null,
      interactionType: interactionType || 'view',
      category: category || '',
      city: city || '',
      language: language || 'en',
      metadata: metadata || {},
    });

    return res.status(201).json({
      success: true,
      message: 'Interaction recorded successfully.',
      data: interaction,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record interaction.',
      error: err.message,
    });
  }
});

/**
 * @route   GET /api/recommendations/metrics
 * @desc    Get instrumentation, rate limiting, and cache performance metrics
 * @access  Public / Monitor
 */
router.get('/metrics', (req, res) => {
  return res.status(200).json({
    success: true,
    metrics: getMetrics(),
  });
});

/**
 * @route   POST /api/recommendations/metrics/reset
 * @desc    Reset instrumentation metrics (testing utility)
 * @access  Private / Testing
 */
router.post('/metrics/reset', (req, res) => {
  resetMetrics();
  return res.status(200).json({
    success: true,
    message: 'Instrumentation metrics reset.',
    metrics: getMetrics(),
  });
});

module.exports = router;
