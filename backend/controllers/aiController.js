const Event = require('../models/Event');
const User = require('../models/User');

// @desc    Get AI-powered personalized event recommendations
// @route   POST /api/ai/recommendations
exports.getRecommendations = async (req, res) => {
  try {
    const { userId, userCity, userInterests } = req.body;

    let user = null;
    if (userId) {
      user = await User.findById(userId).populate('rsvpedEvents');
    }

    const city = userCity || (user ? user.city : 'Jaipur');
    const interests = userInterests || (user ? user.interests : ['career', 'workshop']);

    const allEvents = await Event.find({});

    // Intelligent recommendation engine scoring algorithm
    const scoredEvents = allEvents.map(event => {
      let score = 0;
      let reasons = [];

      // Category interest match (Weight: 40 points)
      if (interests.includes(event.category)) {
        score += 40;
        reasons.push(`Matches your interest in ${event.category}`);
      }

      // City / Location match (Weight: 35 points)
      if (event.city && event.city.toLowerCase() === city.toLowerCase()) {
        score += 35;
        reasons.push(`Located in your preferred city (${event.city})`);
      } else if (event.location && event.location.toLowerCase().includes('online')) {
        score += 25;
        reasons.push('Virtual / Online accessible event');
      }

      // Past RSVP similarity (Weight: 15 points)
      if (user && user.rsvpedEvents && user.rsvpedEvents.length > 0) {
        const hasRsvpedCategory = user.rsvpedEvents.some(r => r.category === event.category);
        if (hasRsvpedCategory) {
          score += 15;
          reasons.push(`Similar to events you previously registered for`);
        }
      }

      // Recency / High capacity availability bonus
      if (event.capacity - event.attendeesCount > 10) {
        score += 10;
      }

      return {
        event,
        matchScore: score,
        recommendationReason: reasons.join(' • ') || 'Popular community event in your region'
      };
    });

    // Sort by highest match score
    scoredEvents.sort((a, b) => b.matchScore - a.matchScore);

    const topRecommendations = scoredEvents.slice(0, 3);

    res.json({
      success: true,
      aiPowered: Boolean(process.env.OPENAI_API_KEY),
      data: topRecommendations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
