const Event = require('../models/Event');
const User = require('../models/User');
const { getPersonalizedRecommendations } = require('../services/recommendationService');
const { INITIAL_EVENTS } = require('../data/seedEvents');

const isConnectedToMongoDB = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

// @desc    Get AI-powered personalized event recommendations
// @route   POST /api/ai/recommendations
exports.getRecommendations = async (req, res) => {
  try {
    const { userId, userCity, userInterests, language, limit } = req.body;

    let user = null;
    if (userId && isConnectedToMongoDB()) {
      user = await User.findById(userId).populate('rsvpedEvents');
    }

    let allEvents = [];
    if (isConnectedToMongoDB()) {
      allEvents = await Event.find({ published: true });
    }
    if (!allEvents.length) {
      allEvents = [...INITIAL_EVENTS];
    }

    const targetCity = userCity || user?.city || 'Jaipur';
    const targetLanguage = language || user?.preferredLanguage || user?.language || 'en';

    // Build synthesized user object if user is not in DB but profile parameters are provided
    const userContext = user || {
      city: targetCity,
      interests: userInterests || ['Career & Jobs', 'Skill Workshops'],
      preferredLanguage: targetLanguage,
      rsvpedEvents: [],
    };

    const result = await getPersonalizedRecommendations({
      user: userContext,
      events: allEvents,
      limit: limit || 3,
      targetCity,
      targetLanguage,
    });

    res.json({
      success: true,
      aiPowered: true,
      source: result.source,
      isFallback: result.isFallback,
      data: result.recommendations.map((r) => ({
        event: r.event,
        matchScore: r.matchScore,
        similarityScore: r.similarityScore,
        recommendationReason: r.reason,
      })),
      recommendations: result.recommendations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
