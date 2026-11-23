const Event = require('../models/Event');
const User = require('../models/User');
const RSVP = require('../models/RSVP');
const { getPersonalizedRecommendations } = require('../services/recommendationService');
const { INITIAL_EVENTS } = require('../data/seedEvents');

const isConnectedToMongoDB = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

// ─── Voice AI Query Parser Helpers ──────────────────────────────────────────

const KNOWN_CITIES = [
  'Patna', 'Bengaluru', 'Bangalore', 'Mysuru', 'Mysore',
  'Jaipur', 'Indore', 'Bhopal', 'Delhi', 'Mumbai', 'Pune',
  'Kolkata', 'Hyderabad', 'Chennai', 'Lucknow', 'Ahmedabad',
  'Whitefield', 'Koramangala', 'Electronic City', 'Chikkaballapur',
];

const parseVoiceQuery = (queryText = '', defaultLocation = '') => {
  const text = String(queryText || '').trim();
  const lower = text.toLowerCase();

  // 1. Detect Intent
  let intent = 'search_events';
  const registerTriggers = ['register', 'book', 'rsvp', 'sign me up', 'join', 'enroll', 'पंजीकरण', 'बुक', 'ನೋಂದಣಿ'];
  const cancelTriggers = ['cancel rsvp', 'unrsvp', 'cancel registration', 'drop out', 'रद्द'];
  const helpTriggers = ['help', 'who are you', 'what can you do', 'how to use', 'मदद'];

  if (cancelTriggers.some((t) => lower.includes(t))) {
    intent = 'cancel_rsvp';
  } else if (registerTriggers.some((t) => lower.includes(t))) {
    intent = 'register_event';
  } else if (helpTriggers.some((t) => lower.includes(t))) {
    intent = 'general_help';
  }

  // 2. Extract City / Location
  let extractedCity = '';
  for (const city of KNOWN_CITIES) {
    const cityLower = city.toLowerCase();
    const regex = new RegExp(`\\b(near|in|around|at)?\\s*${cityLower}\\b`, 'i');
    if (regex.test(lower) || lower.includes(cityLower)) {
      extractedCity = city === 'Bangalore' ? 'Bengaluru' : city === 'Mysore' ? 'Mysuru' : city;
      break;
    }
  }
  if (!extractedCity && (lower.includes('near me') || lower.includes('my city') || lower.includes('around here'))) {
    extractedCity = defaultLocation || 'Jaipur';
  }

  // 3. Extract Category
  let extractedCategory = '';
  if (/\b(career|job|jobs|hiring|expo|fair|fairs|interview|employment)\b/i.test(lower)) {
    extractedCategory = 'career';
  } else if (/\b(workshop|workshops|bootcamp|hands-on|training|python|react|coding\s+workshop)\b/i.test(lower)) {
    extractedCategory = 'workshop';
  } else if (/\b(tech|technology|coding|programming|software|ai|cloud|hackathon|developer)\b/i.test(lower)) {
    extractedCategory = 'tech';
  } else if (/\b(culture|cultural|festival|festivals|music|folk|arts|dance)\b/i.test(lower)) {
    extractedCategory = 'culture';
  } else if (/\b(charity|volunteer|cleanliness|drive|donation|recycling)\b/i.test(lower)) {
    extractedCategory = 'charity';
  } else if (/\b(health|wellness|yoga|fitness|meditation)\b/i.test(lower)) {
    extractedCategory = 'health';
  }

  // 4. Extract Timeframe
  let timeframe = '';
  if (/this weekend|weekend/i.test(lower)) {
    timeframe = 'this weekend';
  } else if (/\btoday\b/i.test(lower)) {
    timeframe = 'today';
  } else if (/\btomorrow\b/i.test(lower)) {
    timeframe = 'tomorrow';
  } else if (/this month/i.test(lower)) {
    timeframe = 'this month';
  } else if (/next week/i.test(lower)) {
    timeframe = 'next week';
  }

  // 5. Price Filter
  const isFree = /\bfree\b|निःशुल्क|ಉಚಿತ/i.test(lower);

  // 6. Keywords
  const stopWords = new Set([
    'find', 'search', 'show', 'tell', 'me', 'about', 'events', 'event', 'near',
    'in', 'around', 'at', 'this', 'for', 'the', 'a', 'an', 'is', 'are', 'there',
    'any', 'i', 'want', 'to', 'can', 'you', 'please', 'with', 'and', 'or', 'of',
  ]);
  const tokens = lower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return {
    rawText: text,
    intent,
    city: extractedCity,
    category: extractedCategory,
    timeframe,
    isFree,
    keywords: tokens,
  };
};

// Helper: match query date with event dates
const isEventWithinTimeframe = (event, timeframe) => {
  if (!timeframe) return true;
  const evDate = event.startDate ? new Date(event.startDate) : (event.date ? new Date(event.date) : null);
  if (!evDate || isNaN(evDate.getTime())) return true;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday

  if (timeframe === 'this weekend') {
    // Current or upcoming Saturday & Sunday
    const daysToSat = (6 - dayOfWeek + 7) % 7;
    const sat = new Date(now);
    sat.setDate(now.getDate() + (daysToSat === 0 && dayOfWeek === 6 ? 0 : daysToSat));
    sat.setHours(0, 0, 0, 0);

    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    sun.setHours(23, 59, 59, 999);

    // If event falls between Saturday and Sunday
    const startWindow = new Date(sat.getTime() - 24 * 60 * 60 * 1000); // Allow Friday evening
    const endWindow = new Date(sun.getTime() + 12 * 60 * 60 * 1000); // Allow Monday morning
    return evDate >= startWindow && evDate <= endWindow;
  }

  if (timeframe === 'today') {
    const start = new Date(now.setHours(0, 0, 0, 0));
    const end = new Date(now.setHours(23, 59, 59, 999));
    return evDate >= start && evDate <= end;
  }

  if (timeframe === 'this month') {
    return evDate.getMonth() === now.getMonth() && evDate.getFullYear() === now.getFullYear();
  }

  return true;
};

// @desc    Process natural language voice AI queries
// @route   POST /api/ai/voice-assistant
exports.processVoiceQuery = async (req, res) => {
  try {
    const { query, language = 'en', userLocation = '', confirmed = false, action = null } = req.body;

    if (!query || !String(query).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Query transcript text is required.',
      });
    }

    const parsed = parseVoiceQuery(query, userLocation);
    const user = req.user || null;

    // Fetch candidate published events
    let allEvents = [];
    if (isConnectedToMongoDB()) {
      allEvents = await Event.find({ published: true });
    }
    if (!allEvents.length) {
      allEvents = [...INITIAL_EVENTS].filter((e) => e.published !== false);
    }

    // ─── ACTION INTENT: REGISTER EVENT ──────────────────────────────────────────
    if (parsed.intent === 'register_event' || (action && action.type === 'CONFIRM_REGISTRATION')) {
      // Find matching target event
      const targetQuery = action?.eventTitle || action?.eventId || parsed.rawText;
      const targetId = action?.eventId || '';

      let targetEvent = null;
      if (targetId) {
        targetEvent = allEvents.find((e) => (e._id || e.id || '').toString() === targetId.toString());
      }
      if (!targetEvent) {
        // Match by title keywords
        const searchWords = parsed.keywords.filter((w) => !['register', 'rsvp', 'join', 'book'].includes(w));
        targetEvent = allEvents.find((e) => {
          const tLower = (e.title || '').toLowerCase();
          return searchWords.some((w) => tLower.includes(w));
        }) || allEvents[0];
      }

      if (!targetEvent) {
        return res.status(200).json({
          success: true,
          intent: 'register_event',
          confirmationNeeded: false,
          spokenResponse: language === 'hi'
            ? 'क्षमा करें, मुझे पंजीकरण के लिए कोई उपयुक्त कार्यक्रम नहीं मिला।'
            : 'Sorry, I could not find a matching event to register for. Try specifying the event title.',
          events: [],
        });
      }

      // Action Confirmation Guard: require explicit user approval
      if (!confirmed) {
        const confirmMsg = language === 'hi'
          ? `क्या आप "${targetEvent.title_hi || targetEvent.title}" के लिए पंजीकरण की पुष्टि करना चाहते हैं? पुष्टि करने के लिए 'हाँ' कहें या कन्फर्म दबाएं।`
          : `Are you sure you want to register for "${targetEvent.title}"? Please confirm to complete your registration.`;

        return res.status(200).json({
          success: true,
          intent: 'register_event',
          confirmationNeeded: true,
          actionRequired: {
            type: 'CONFIRM_REGISTRATION',
            eventId: targetEvent._id || targetEvent.id,
            eventTitle: targetEvent.title,
            city: targetEvent.city || targetEvent.location?.placeName || '',
          },
          spokenResponse: confirmMsg,
          events: [targetEvent],
        });
      }

      // User has explicitly confirmed! Perform RSVP
      if (!user) {
        return res.status(200).json({
          success: true,
          intent: 'register_event',
          confirmationNeeded: false,
          requiresLogin: true,
          spokenResponse: language === 'hi'
            ? 'पंजीकरण पूरा करने के लिए कृपया पहले अपने खाते में लॉगिन करें।'
            : 'Please log in with your verified account to finalize this registration.',
          events: [targetEvent],
        });
      }

      // Perform registration in database
      const eventId = targetEvent._id || targetEvent.id;
      if (isConnectedToMongoDB()) {
        await RSVP.findOneAndUpdate(
          { eventId, userId: user._id },
          { eventId, userId: user._id, status: 'confirmed', confirmedAt: new Date() },
          { upsert: true, new: true }
        );
        await Event.findByIdAndUpdate(eventId, {
          $addToSet: { rsvpedUsers: user._id, attendees: { user: user._id } },
          $inc: { attendeesCount: 1 },
        });
        await User.findByIdAndUpdate(user._id, {
          $addToSet: { rsvpedEvents: eventId },
        });
      }

      const successMsg = language === 'hi'
        ? `बधाई हो! "${targetEvent.title_hi || targetEvent.title}" के लिए आपका पंजीकरण सफलतापूर्वक कन्फर्म हो गया है।`
        : `Congratulations! Your registration for "${targetEvent.title}" has been confirmed.`;

      return res.status(200).json({
        success: true,
        intent: 'register_event',
        actionExecuted: 'CONFIRM_REGISTRATION',
        confirmationNeeded: false,
        spokenResponse: successMsg,
        events: [targetEvent],
      });
    }

    // ─── ACTION INTENT: GENERAL HELP ────────────────────────────────────────────
    if (parsed.intent === 'general_help') {
      const helpMsg = language === 'hi'
        ? 'मैं कम्युनिटी कनेक्ट वॉयस एआई हूँ। आप बोलकर कार्यक्रम खोज सकते हैं, जैसे "पटना में कोडिंग वर्कशॉप खोजें", या किसी कार्यक्रम में पंजीकरण कर सकते हैं।'
        : 'I am your CommunityConnect Voice AI Assistant. You can ask me to find events, such as "Find coding workshops near Patna this weekend", or ask me to register you for an event.';

      return res.status(200).json({
        success: true,
        intent: 'general_help',
        confirmationNeeded: false,
        spokenResponse: helpMsg,
        events: allEvents.slice(0, 3),
      });
    }

    // ─── SEARCH EVENTS INTENT ───────────────────────────────────────────────────
    const scoredMatches = allEvents.map((evt) => {
      let score = 0;
      const reasons = [];

      const evCity = String(evt.city || evt.location?.placeName || '').toLowerCase();
      const evCat = String(evt.category || '').toLowerCase();
      const evTitle = String(evt.title || '').toLowerCase();
      const evDesc = String(evt.description || '').toLowerCase();
      const evTags = Array.isArray(evt.tags) ? evt.tags.map((t) => String(t).toLowerCase()) : [];

      // City match (35 pts)
      if (parsed.city && (evCity.includes(parsed.city.toLowerCase()) || parsed.city.toLowerCase().includes(evCity))) {
        score += 35;
        reasons.push(`In ${parsed.city}`);
      }

      // Category match (30 pts)
      if (parsed.category) {
        if (evCat.includes(parsed.category) || parsed.category.includes(evCat)) {
          score += 30;
          reasons.push(`Category: ${evt.category}`);
        } else if (parsed.category === 'workshop' && (evCat.includes('skill') || evCat.includes('workshop'))) {
          score += 30;
          reasons.push('Workshop');
        } else if (parsed.category === 'tech' && (evCat.includes('tech') || evTags.includes('coding') || evTags.includes('ai'))) {
          score += 30;
          reasons.push('Technology & Coding');
        } else if (parsed.category === 'culture' && (evCat.includes('culture') || evCat.includes('folk'))) {
          score += 30;
          reasons.push('Cultural Festival');
        }
      }

      // Keyword match (20 pts)
      let keywordHits = 0;
      parsed.keywords.forEach((kw) => {
        if (evTitle.includes(kw) || evDesc.includes(kw) || evTags.includes(kw)) {
          keywordHits++;
        }
      });
      if (keywordHits > 0) {
        score += Math.min(20, keywordHits * 10);
      }

      // Timeframe match (15 pts)
      if (parsed.timeframe) {
        if (isEventWithinTimeframe(evt, parsed.timeframe)) {
          score += 15;
          reasons.push(`Happening ${parsed.timeframe}`);
        }
      }

      return {
        event: evt,
        score,
        reasons,
      };
    });

    // Filter to events with positive relevance score
    let matchingEvents = scoredMatches
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((m) => m.event);

    // If query has specific city but no exact match in that city, provide closest events with explanation
    let isBroadened = false;
    if (matchingEvents.length === 0) {
      isBroadened = true;
      matchingEvents = allEvents.slice(0, 3);
    }

    // Formulate spoken text response
    let spokenResponse = '';
    const topEvent = matchingEvents[0];
    const count = matchingEvents.length;

    if (language === 'hi') {
      if (isBroadened) {
        spokenResponse = `मुझे आपकी खोज से पूरी तरह मेल खाने वाला कोई कार्यक्रम नहीं मिला, लेकिन यहाँ कुछ लोकप्रिय आगामी कार्यक्रम उपलब्ध हैं।`;
      } else {
        spokenResponse = `मुझे ${parsed.city ? parsed.city + ' में ' : ''}${count} कार्यक्रम मिले हैं। सबसे पहला कार्यक्रम "${topEvent.title_hi || topEvent.title}" है।`;
      }
    } else {
      if (isBroadened) {
        spokenResponse = `I couldn't find exact matches for "${query}", but here are upcoming featured community events you might like.`;
      } else {
        const cityStr = parsed.city ? `near ${parsed.city}` : '';
        const catStr = parsed.category ? `${parsed.category} ` : '';
        const timeStr = parsed.timeframe ? `for ${parsed.timeframe}` : '';
        const descStr = [catStr, 'events', cityStr, timeStr].filter(Boolean).join(' ').trim();
        spokenResponse = `I found ${count} ${descStr}. The top event is "${topEvent.title}".`;
      }
    }

    return res.status(200).json({
      success: true,
      query,
      intent: parsed.intent,
      parsed: {
        city: parsed.city,
        category: parsed.category,
        timeframe: parsed.timeframe,
        isFree: parsed.isFree,
        keywords: parsed.keywords,
      },
      confirmationNeeded: false,
      actionRequired: null,
      spokenResponse,
      count,
      events: matchingEvents.slice(0, 5),
    });
  } catch (error) {
    console.error('Voice Assistant Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process voice AI query.',
      error: error.message,
    });
  }
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

// @desc    Natural Language Event Search (Extracts keywords, category, location, timeframe, price)
// @route   POST /api/ai/nl-search
exports.processNaturalLanguageSearch = async (req, res) => {
  try {
    const { query, userLocation = '', language = 'en' } = req.body;
    const queryText = String(query || '').trim();

    if (!queryText) {
      return res.status(400).json({
        success: false,
        message: 'Search query sentence is required.',
      });
    }

    const defaultLoc = userLocation || req.user?.city || 'Jaipur';
    const parsed = parseVoiceQuery(queryText, defaultLoc);

    let allEvents = [];
    if (isConnectedToMongoDB()) {
      allEvents = await Event.find({ published: true }).lean();
    }
    if (!allEvents.length) {
      allEvents = INITIAL_EVENTS.filter((e) => Boolean(e.published)).map((e) => ({ ...e }));
    }

    const scored = allEvents.map((evt) => {
      let score = 0;
      const reasons = [];

      const evCity = String(evt.city || evt.location?.placeName || '').toLowerCase();
      const evCat = String(evt.category || '').toLowerCase();
      const evTitle = String(evt.title || '').toLowerCase();
      const evDesc = String(evt.description || '').toLowerCase();
      const evTags = Array.isArray(evt.tags) ? evt.tags.map((t) => String(t).toLowerCase()) : [];
      const evIsFree = evt.isFree !== false && (evt.price === 0 || !evt.price);

      // 1. City / Location match (35 pts)
      if (parsed.city) {
        const pCity = parsed.city.toLowerCase();
        if (evCity.includes(pCity) || pCity.includes(evCity)) {
          score += 35;
          reasons.push(`In ${parsed.city}`);
        }
      }

      // 2. Category match (30 pts)
      if (parsed.category) {
        if (evCat.includes(parsed.category) || parsed.category.includes(evCat)) {
          score += 30;
          reasons.push(`Category: ${evt.category}`);
        } else if (parsed.category === 'career' && (evCat.includes('career') || evCat.includes('job') || evTags.includes('job') || evTags.includes('hiring') || evTags.includes('career') || evTitle.includes('job') || evTitle.includes('fair'))) {
          score += 30;
          reasons.push('Career & Job Fair');
        } else if (parsed.category === 'workshop' && (evCat.includes('workshop') || evTags.includes('workshop') || evTitle.includes('workshop'))) {
          score += 30;
          reasons.push('Workshop');
        } else if (parsed.category === 'tech' && (evCat.includes('tech') || evTags.includes('tech') || evTags.includes('coding') || evTags.includes('ai'))) {
          score += 30;
          reasons.push('Technology');
        } else if (parsed.category === 'culture' && (evCat.includes('culture') || evTags.includes('culture') || evTags.includes('folk'))) {
          score += 30;
          reasons.push('Cultural Event');
        }
      }

      // 3. Price / Free match (20 pts)
      if (parsed.isFree) {
        if (evIsFree || evTags.includes('free') || evDesc.includes('free') || evTitle.includes('free')) {
          score += 20;
          reasons.push('Free Entry');
        }
      }

      // 4. Timeframe match (15 pts)
      if (parsed.timeframe) {
        if (isEventWithinTimeframe(evt, parsed.timeframe)) {
          score += 15;
          reasons.push(`Happening ${parsed.timeframe}`);
        }
      }

      // 5. Keyword match (up to 20 pts)
      let kwHits = 0;
      parsed.keywords.forEach((kw) => {
        if (evTitle.includes(kw) || evDesc.includes(kw) || evTags.includes(kw)) {
          kwHits++;
        }
      });
      if (kwHits > 0) {
        score += Math.min(20, kwHits * 10);
      }

      return {
        event: {
          ...evt,
          matchScore: score,
          matchReasons: reasons,
        },
        score,
      };
    });

    // Sort descending by score
    const matching = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.event);

    return res.status(200).json({
      success: true,
      query: queryText,
      parsed: {
        category: parsed.category || null,
        city: parsed.city || null,
        timeframe: parsed.timeframe || null,
        isFree: parsed.isFree,
        keywords: parsed.keywords,
      },
      count: matching.length,
      events: matching,
    });
  } catch (error) {
    console.error('Natural Language Search Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process natural language search.',
      error: error.message,
    });
  }
};

exports.parseNaturalLanguageQuery = parseVoiceQuery;
exports.isEventWithinTimeframe = isEventWithinTimeframe;

// @desc    Translate event description to English, Hindi, or Kannada
// @route   POST /api/ai/translate
exports.translateEventDescription = async (req, res) => {
  try {
    const { text, targetLang = 'en', sourceLang = 'en', eventId = null } = req.body;

    if (!text && !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Either text or eventId is required for translation.',
      });
    }

    const target = String(targetLang || 'en').toLowerCase().slice(0, 2);
    if (!['en', 'hi', 'kn'].includes(target)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target language. Supported languages are "en", "hi", "kn".',
      });
    }

    let event = null;
    let textToTranslate = text;

    if (eventId) {
      if (isConnectedToMongoDB()) {
        event = await Event.findById(eventId);
      }
      if (!event) {
        event = INITIAL_EVENTS.find((e) => e.id === eventId || e._id === eventId || e.itemKey === eventId);
      }
      if (event && !textToTranslate) {
        textToTranslate = event.description || '';
      }
    }

    const { translateEventText } = require('../services/translationService');
    const result = await translateEventText(textToTranslate, target, sourceLang, event);

    return res.status(200).json({
      success: true,
      originalText: result.originalText,
      translatedText: result.translatedText,
      targetLanguage: result.targetLanguage,
      sourceLanguage: result.sourceLanguage,
      isOriginal: result.isOriginal,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Translation Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to translate description.',
      error: error.message,
    });
  }
};
