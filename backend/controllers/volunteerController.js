const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { INITIAL_EVENTS } = require('../data/seedEvents');

const isConnectedToMongoDB = () => mongoose.connection.readyState === 1;

/**
 * GET /api/volunteer/recommendations
 * Recommends relevant volunteering opportunities, skill workshops, and community events
 * based on user's registered skills, personal interests, preferred categories, and city.
 */
const getVolunteerMatches = async (req, res) => {
  try {
    let user = req.user;

    // Fallback if userId passed in query or optional auth
    if (!user && req.query.userId) {
      if (isConnectedToMongoDB()) {
        try {
          user = await User.findById(req.query.userId);
        } catch {
          user = null;
        }
      }
    }

    // Extract skills and interests
    let userSkills = [];
    let userInterests = [];
    let userCity = '';

    if (user) {
      userSkills = Array.isArray(user.skills) ? user.skills : [];
      userInterests = Array.isArray(user.interests) ? user.interests : [];
      userCity = user.city || '';
    }

    // Allow query overrides for testing or guest skill explorer
    if (req.query.skills) {
      const qSkills = req.query.skills.split(',').map((s) => s.trim()).filter(Boolean);
      userSkills = Array.from(new Set([...userSkills, ...qSkills]));
    }
    if (req.query.interests) {
      const qInterests = req.query.interests.split(',').map((i) => i.trim()).filter(Boolean);
      userInterests = Array.from(new Set([...userInterests, ...qInterests]));
    }
    if (req.query.city) {
      userCity = req.query.city;
    }

    const normSkills = userSkills.map((s) => s.toLowerCase());
    const normInterests = userInterests.map((i) => i.toLowerCase());
    const onlyVolunteering = req.query.onlyVolunteering === 'true';

    // Fetch published events
    let allEvents = [];
    if (isConnectedToMongoDB()) {
      allEvents = await Event.find({ published: { $ne: false }, verificationStatus: { $ne: 'rejected' } }).lean();
    } else {
      allEvents = (INITIAL_EVENTS || []).filter(
        (e) => e.published !== false && e.verificationStatus !== 'rejected'
      );
    }

    // Compute Skill Matching Score for each event
    const scoredMatches = allEvents.map((evt) => {
      const reqSkills = Array.isArray(evt.requiredSkills) ? evt.requiredSkills : [];
      const evtCategory = (evt.category || '').toLowerCase();
      const evtTags = (evt.tags || []).map((t) => t.toLowerCase());

      // 1. Skill Overlap Calculation
      const matchedSkills = [];
      reqSkills.forEach((rSkill) => {
        const normR = rSkill.toLowerCase();
        const found = normSkills.some(
          (uSkill) => normR.includes(uSkill) || uSkill.includes(normR)
        );
        if (found) {
          matchedSkills.push(rSkill);
        }
      });

      // 2. Base & Skill score
      let score = 30; // base potential score
      const skillCount = matchedSkills.length;

      if (skillCount > 0) {
        score += 35 + Math.min(30, skillCount * 15);
      }

      // 3. Category & Interest alignment bonus
      const matchesInterest = normInterests.some(
        (i) => evtCategory.includes(i) || evtTags.some((t) => t.includes(i))
      );
      if (matchesInterest) {
        score += 15;
      }

      // 4. Dedicated volunteering opportunity bonus
      if (evt.isVolunteerOpportunity) {
        score += 10;
      }

      // 5. City proximity bonus
      if (userCity && evt.city && evt.city.toLowerCase() === userCity.toLowerCase()) {
        score += 8;
      }

      // Cap match score cleanly at [20, 99]
      const finalScore = Math.min(99, Math.max(20, Math.round(score)));

      // Human-readable whyRecommended reason
      let whyRecommended = '';
      if (matchedSkills.length > 0) {
        whyRecommended = `Matches your skills in ${matchedSkills.slice(0, 2).join(' & ')}${matchedSkills.length > 2 ? ` +${matchedSkills.length - 2} more` : ''}`;
      } else if (evt.isVolunteerOpportunity) {
        whyRecommended = 'Open community volunteer opportunity looking for enthusiastic contributors';
      } else if (matchesInterest) {
        whyRecommended = `Aligned with your personal interest in ${evt.category}`;
      } else {
        whyRecommended = 'Popular upcoming skill workshop in your region';
      }

      return {
        eventId: evt._id || evt.id,
        event: evt,
        matchScore: finalScore,
        matchedSkills,
        requiredSkills: reqSkills,
        isVolunteerOpportunity: Boolean(evt.isVolunteerOpportunity),
        whyRecommended,
        category: evt.category,
        city: evt.city || (typeof evt.location === 'object' ? evt.location?.placeName : evt.location),
        date: evt.date || evt.startDate,
      };
    });

    // Filter if onlyVolunteering requested
    let filtered = scoredMatches;
    if (onlyVolunteering) {
      filtered = filtered.filter((m) => m.isVolunteerOpportunity);
    }

    // Sort descending by matchScore
    filtered.sort((a, b) => b.matchScore - a.matchScore);

    const limit = Math.max(1, parseInt(req.query.limit, 10) || 12);
    const results = filtered.slice(0, limit);

    return res.status(200).json({
      success: true,
      count: results.length,
      userSkills,
      userInterests,
      matches: results,
    });
  } catch (error) {
    console.error('Error in getVolunteerMatches:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate volunteer and skill matches.',
      error: error.message,
    });
  }
};

/**
 * POST /api/events/:id/volunteer
 * Resident registers as a volunteer for an event
 */
const registerAsVolunteer = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { roleName, notes } = req.body;

    const userId = req.user?._id?.toString() || req.user?.id?.toString() || req.body.userId;
    const userName = req.user?.name || req.body.userName || 'Community Volunteer';
    const userEmail = req.user?.email || req.body.userEmail || '';
    const userSkills = req.user?.skills || req.body.skills || [];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to sign up as a volunteer.',
      });
    }

    let foundEvent = null;

    if (isConnectedToMongoDB()) {
      foundEvent = mongoose.Types.ObjectId.isValid(eventId)
        ? await Event.findById(eventId)
        : await Event.findOne({ $or: [{ id: eventId }, { itemKey: eventId }] });
    } else {
      foundEvent = (INITIAL_EVENTS || []).find(
        (e) => String(e.id) === String(eventId) || String(e._id) === String(eventId)
      );
    }

    if (!foundEvent) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Check duplicate volunteer registration
    const existingVolunteers = foundEvent.volunteers || [];
    const isAlreadyRegistered = existingVolunteers.some(
      (v) => (v.user?.toString && v.user.toString() === userId) || v.userId === userId || v.email === userEmail
    );

    if (isAlreadyRegistered) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        message: 'You are already registered as a volunteer for this event.',
      });
    }

    const volunteerRecord = {
      user: userId,
      userId,
      name: userName,
      email: userEmail,
      skills: userSkills,
      roleName: roleName || 'General Volunteer',
      notes: (notes || '').trim(),
      registeredAt: new Date().toISOString(),
    };

    if (isConnectedToMongoDB()) {
      await Event.findByIdAndUpdate(foundEvent._id, {
        $push: { volunteers: volunteerRecord },
        $set: { isVolunteerOpportunity: true },
      });
    } else {
      if (!foundEvent.volunteers) foundEvent.volunteers = [];
      foundEvent.volunteers.push(volunteerRecord);
      foundEvent.isVolunteerOpportunity = true;
    }

    return res.status(201).json({
      success: true,
      message: `Successfully registered as a volunteer for '${foundEvent.title}'!`,
      volunteer: volunteerRecord,
      eventId,
    });
  } catch (error) {
    console.error('Error registering volunteer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete volunteer registration.',
      error: error.message,
    });
  }
};

/**
 * GET /api/events/:id/volunteers
 * Organizer & Admin can view list of registered volunteers for an event
 */
const getEventVolunteers = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    let foundEvent = null;

    if (isConnectedToMongoDB()) {
      foundEvent = mongoose.Types.ObjectId.isValid(eventId)
        ? await Event.findById(eventId).lean()
        : await Event.findOne({ $or: [{ id: eventId }, { itemKey: eventId }] }).lean();
    } else {
      foundEvent = (INITIAL_EVENTS || []).find(
        (e) => String(e.id) === String(eventId) || String(e._id) === String(eventId)
      );
    }

    if (!foundEvent) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const volunteers = foundEvent.volunteers || [];

    return res.status(200).json({
      success: true,
      eventId,
      count: volunteers.length,
      volunteers,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getVolunteerMatches,
  registerAsVolunteer,
  getEventVolunteers,
};
