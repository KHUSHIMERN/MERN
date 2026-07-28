const express = require('express');
const { OpenAI } = require('openai');
const Event = require('../models/Event');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Helper fallback recommendation algorithm when OpenAI key is missing or calls fail
const getRuleBasedRecommendations = (user, events) => {
  const userInterests = user ? user.interests || [] : ['Career & Jobs', 'Health & Wellness'];
  const userCity = user ? user.city || 'Indore' : 'Indore';
  const userRsvps = user && user.rsvpedEvents ? user.rsvpedEvents.map((id) => id.toString()) : [];

  const scoredEvents = events.map((event) => {
    let score = 0;
    let matchReasons = [];

    // Category interest match (40 pts)
    if (userInterests.includes(event.category)) {
      score += 40;
      matchReasons.push(`Matches your interest in ${event.category}`);
    }

    // City match (30 pts)
    if (event.city.toLowerCase() === userCity.toLowerCase()) {
      score += 30;
      matchReasons.push(`Local event in ${event.city}`);
    }

    // Tier 2/3/4 highlight (15 pts)
    if (['Tier 2', 'Tier 3', 'Tier 4'].includes(event.tier)) {
      score += 15;
      matchReasons.push(`Community initiative for ${event.tier} cities`);
    }

    // High participation bonus (15 pts)
    const fillRatio = event.capacity > 0 ? event.attendees.length / event.capacity : 0;
    if (fillRatio > 0.5) {
      score += 15;
      matchReasons.push('Popular community event');
    }

    // Already RSVPed check
    const isRsvped = userRsvps.includes(event._id.toString());

    if (matchReasons.length === 0) {
      matchReasons.push('Discover upcoming local opportunities in your region');
    }

    return {
      event,
      matchScore: Math.min(Math.round(score + Math.random() * 10), 99),
      reason: matchReasons.join(' • '),
      isRsvped,
    };
  });

  // Sort by match score descending
  return scoredEvents.sort((a, b) => b.matchScore - a.matchScore);
};

// @route   GET /api/recommendations
// @desc    Get AI-powered personalized event recommendations for user
// @access  Public / Private (enhanced when logged in)
router.get('/', async (req, res) => {
  try {
    let user = null;

    // Optional auth extraction
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        user = await User.findById(decoded.id).populate('rsvpedEvents');
      } catch (err) {
        // Continue as guest user
      }
    }

    const events = await Event.find().populate('organizer', 'name email role');

    if (!events.length) {
      return res.status(200).json({ recommendations: [], source: 'empty' });
    }

    // If OpenAI API Key is available, use GPT for recommendation reasoning
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY') {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const userProfileStr = user
          ? `User Interests: ${user.interests.join(', ')}, City: ${user.city}, Role: ${user.role}`
          : `General resident interested in local Tier 2-4 city opportunities (career, health, workshops).`;

        const eventsSummaryStr = events
          .map((e) => `ID: ${e._id}, Title: ${e.title}, Category: ${e.category}, City: ${e.city}, Tier: ${e.tier}`)
          .join('\n');

        const prompt = `You are an AI Event Recommendation Engine for local residents in Tier 2, 3, and 4 Indian cities.
Given this user profile: ${userProfileStr}

And these events:
${eventsSummaryStr}

Select the top 4 most relevant event IDs and provide a 1-sentence personalized recommendation reason for each.
Return strictly a valid JSON array of objects with keys: "eventId", "matchScore" (0-100), "reason".`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        });

        const aiText = completion.choices[0].message.content;
        const parsed = JSON.parse(aiText);

        const aiRecommendations = parsed.map((item) => {
          const matchedEvent = events.find((e) => e._id.toString() === item.eventId.toString());
          return {
            event: matchedEvent,
            matchScore: item.matchScore || 90,
            reason: item.reason || 'AI recommended based on your preferences.',
            isRsvped: user ? user.rsvpedEvents.some((r) => r._id.toString() === item.eventId.toString()) : false,
          };
        }).filter(item => item.event);

        return res.status(200).json({
          recommendations: aiRecommendations,
          source: 'openai',
        });
      } catch (aiErr) {
        console.warn('OpenAI Recommendation error (using rule-based engine):', aiErr.message);
      }
    }

    // Rule-based fallback recommendation engine
    const recommendations = getRuleBasedRecommendations(user, events);

    return res.status(200).json({
      recommendations,
      source: 'rule-engine',
    });
  } catch (error) {
    console.error('Recommendation Route Error:', error);
    return res.status(500).json({ message: 'Error generating recommendations.', error: error.message });
  }
});

module.exports = router;
