const crypto = require('crypto');
const { OpenAI } = require('openai');
const UserInteraction = require('../models/UserInteraction');
const EventEmbedding = require('../models/EventEmbedding');
const Event = require('../models/Event');

// ---------------------------------------------------------------------------
// 1. Instrumentation & Metrics State
// ---------------------------------------------------------------------------
const metrics = {
  totalRequests: 0,
  aiCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  rateLimitedCalls: 0,
  fallbacksTriggered: 0,
  totalLatencyMs: 0,
  errors: 0,
};

// ---------------------------------------------------------------------------
// 2. Rate Limiting Configuration & Sliding Window Limiter
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_CALLS_PER_WINDOW = parseInt(process.env.OPENAI_RATE_LIMIT_PER_MINUTE, 10) || 60;
const callTimestamps = [];

const isRateLimited = () => {
  const now = Date.now();
  // Clear timestamps older than sliding window
  while (callTimestamps.length > 0 && callTimestamps[0] <= now - RATE_LIMIT_WINDOW_MS) {
    callTimestamps.shift();
  }
  return callTimestamps.length >= MAX_CALLS_PER_WINDOW;
};

const recordCallTimestamp = () => {
  callTimestamps.push(Date.now());
};

// ---------------------------------------------------------------------------
// 3. Mathematical Vector Helpers: Cosine Similarity & Normalization
// ---------------------------------------------------------------------------
const cosineSimilarity = (vecA, vecB) => {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }
  const length = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i++) {
    const a = vecA[i] || 0;
    const b = vecB[i] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Bound to [0, 1] for normalized embeddings
  return Math.max(0, Math.min(1, similarity));
};

const normalizeVector = (vec) => {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
};

// Deterministic semantic feature hashing vector generator (Dimensions: 64)
// Used when OpenAI key is absent or as a high-speed fallback
const generateFeatureVector = (text, dimensions = 64) => {
  const clean = String(text || '').toLowerCase().trim();
  const vector = new Array(dimensions).fill(0);
  if (!clean) return vector;

  const tokens = clean.split(/[\s,./#!$%^&*;:{}=\-_`~()]+/);
  tokens.forEach((token, idx) => {
    if (!token) return;
    const hash = crypto.createHash('md5').update(token).digest('hex');
    const index = parseInt(hash.slice(0, 4), 16) % dimensions;
    const weight = 1 + (idx === 0 ? 0.5 : 0);
    vector[index] += weight;
  });

  return normalizeVector(vector);
};

// ---------------------------------------------------------------------------
// 4. Embedding Generation & Caching Pipeline
// ---------------------------------------------------------------------------
const hashContent = (text) => crypto.createHash('sha256').update(String(text)).digest('hex');

const inMemoryEmbeddingCache = new Map();

const getEventTextContent = (event) => {
  const parts = [
    event.title || '',
    event.title_hi || '',
    event.category || '',
    event.description || '',
    event.description_hi || '',
    event.city || '',
    Array.isArray(event.tags) ? event.tags.join(' ') : '',
    event.language || 'en',
  ];
  return parts.filter(Boolean).join(' ');
};

const getOrGenerateEventEmbedding = async (event) => {
  const textContent = getEventTextContent(event);
  const contentHash = hashContent(textContent);
  const eventIdStr = (event._id || event.id || '').toString();

  // 1. Check in-memory cache
  if (inMemoryEmbeddingCache.has(eventIdStr)) {
    const cached = inMemoryEmbeddingCache.get(eventIdStr);
    if (cached.contentHash === contentHash) {
      metrics.cacheHits++;
      return cached.vector;
    }
  }

  // 2. Check MongoDB EventEmbedding model if available
  try {
    const dbCached = await EventEmbedding.findOne({ eventId: event._id });
    if (dbCached && dbCached.contentHash === contentHash && Array.isArray(dbCached.vector)) {
      metrics.cacheHits++;
      inMemoryEmbeddingCache.set(eventIdStr, { contentHash, vector: dbCached.vector });
      return dbCached.vector;
    }
  } catch (err) {
    // MongoDB offline or model uninitialized; continue to generate
  }

  metrics.cacheMisses++;
  let vector = null;

  // 3. Attempt OpenAI Embeddings if configured and not rate-limited
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey !== 'YOUR_OPENAI_API_KEY' && !isRateLimited()) {
    try {
      recordCallTimestamp();
      metrics.aiCalls++;
      const startTime = Date.now();
      const openai = new OpenAI({ apiKey });
      const resp = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textContent.slice(0, 8000),
      });
      metrics.totalLatencyMs += Date.now() - startTime;
      if (resp?.data?.[0]?.embedding) {
        vector = resp.data[0].embedding;
      }
    } catch (apiErr) {
      metrics.errors++;
      console.warn('OpenAI embedding call failed, falling back to local semantic vector:', apiErr.message);
    }
  } else if (isRateLimited()) {
    metrics.rateLimitedCalls++;
  }

  // 4. Local deterministic semantic vector fallback
  if (!vector) {
    vector = generateFeatureVector(textContent, 64);
  }

  // 5. Store in caches
  inMemoryEmbeddingCache.set(eventIdStr, { contentHash, vector });
  try {
    if (event._id) {
      await EventEmbedding.findOneAndUpdate(
        { eventId: event._id },
        { contentHash, vector, dimensions: vector.length, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }
  } catch (saveErr) {
    // Non-fatal if DB write fails
  }

  return vector;
};

// ---------------------------------------------------------------------------
// 5. User Interaction Recording
// ---------------------------------------------------------------------------
const recordInteraction = async ({
  userId,
  eventId = null,
  interactionType = 'view',
  category = '',
  city = '',
  language = 'en',
  metadata = {},
}) => {
  if (!userId) return null;

  const weights = {
    view: 1.0,
    click: 1.5,
    filter: 2.0,
    search: 2.0,
    rsvp: 5.0,
  };

  const weight = weights[interactionType] || 1.0;

  try {
    const interaction = await UserInteraction.create({
      userId,
      eventId,
      interactionType,
      category,
      city,
      language,
      weight,
      metadata,
      timestamp: new Date(),
    });
    return interaction;
  } catch (err) {
    console.warn('Could not record user interaction:', err.message);
    return null;
  }
};

// ---------------------------------------------------------------------------
// 6. Recommendation Algorithms: Personalized vs. Popularity + Locality
// ---------------------------------------------------------------------------

/**
 * Popularity + Locality Fallback for guest users or users with insufficient interaction history.
 */
const getPopularityAndLocalityRecommendations = (events, targetCity = 'Jaipur', limit = 4, targetLanguage = 'en') => {
  metrics.fallbacksTriggered++;

  const scored = events.map((event) => {
    let score = 0;
    const reasons = [];

    // Locality: City match (40 pts)
    const evCity = String(event.city || '').toLowerCase();
    const desiredCity = String(targetCity || 'Jaipur').toLowerCase();
    if (evCity === desiredCity) {
      score += 40;
      reasons.push(`Popular local event in ${event.city}`);
    } else if (['Tier 2', 'Tier 3', 'Tier 4'].includes(event.tier)) {
      score += 20;
      reasons.push(`Regional community event for ${event.tier} cities`);
    }

    // Popularity: Attendees / fill ratio / confirmed RSVPs (35 pts)
    const attendeeCount = Number(event.attendeesCount || event.confirmedCount || event.rsvpedUsers?.length || 0);
    const capacity = Number(event.capacity || 100);
    const fillRatio = capacity > 0 ? attendeeCount / capacity : 0;
    if (fillRatio >= 0.5 || attendeeCount >= 20) {
      score += 35;
      reasons.push('High community participation');
    } else if (attendeeCount > 0) {
      score += 20;
      reasons.push('Trending community event');
    }

    // Language affinity (15 pts)
    const evLang = String(event.language || 'en').toLowerCase();
    const userLang = String(targetLanguage || 'en').toLowerCase();
    if (evLang === userLang || (userLang === 'hi' && event.title_hi)) {
      score += 15;
      reasons.push(`Available in your language (${userLang.toUpperCase()})`);
    }

    // Recency / Upcoming date (10 pts)
    const now = Date.now();
    const start = event.startDate ? new Date(event.startDate).getTime() : now;
    if (start >= now && start <= now + 30 * 24 * 60 * 60 * 1000) {
      score += 10;
      reasons.push('Happening this month');
    }

    return {
      event,
      matchScore: Math.min(98, Math.max(50, Math.round(score + Math.random() * 5))),
      reason: reasons.join(' • ') || 'Featured local event in your area',
      isRsvped: false,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, limit);
};

/**
 * Personalized Recommendation Engine using Vector Similarity, Past Interactions & User Preferences.
 */
const getPersonalizedRecommendations = async ({
  user = null,
  events = [],
  limit = 4,
  targetCity = '',
  targetLanguage = '',
}) => {
  const startTime = Date.now();
  metrics.totalRequests++;

  if (!events || events.length === 0) {
    return { recommendations: [], source: 'empty', metrics: getMetrics() };
  }

  // Determine user context & target preferences
  const userCity = targetCity || user?.city || 'Jaipur';
  const userLanguage = targetLanguage || user?.preferredLanguage || user?.language || 'en';
  const userInterests = user?.interests || [];
  const rsvpedEventIds = (user?.rsvpedEvents || []).map((id) => (typeof id === 'object' ? id._id?.toString() : id?.toString()));

  // 1. Fetch user's stored interaction history (views, RSVPs, searches, category filters)
  let userInteractions = [];
  if (user?._id) {
    try {
      userInteractions = await UserInteraction.find({ userId: user._id })
        .sort({ timestamp: -1 })
        .limit(50);
    } catch (e) {
      userInteractions = [];
    }
  }

  // 2. Check for Sufficiency of User History
  const hasInteractions = userInteractions.length > 0;
  const hasRsvps = rsvpedEventIds.length > 0;
  const hasInterests = userInterests.length > 0;
  const hasSufficientHistory = hasInteractions || hasRsvps || hasInterests;

  if (!hasSufficientHistory) {
    // Insufficient history: gracefully fall back to Popularity + Locality
    const fallbackList = getPopularityAndLocalityRecommendations(events, userCity, limit, userLanguage);
    metrics.totalLatencyMs += Date.now() - startTime;
    return {
      recommendations: fallbackList,
      source: 'popularity-locality',
      isFallback: true,
      metrics: getMetrics(),
    };
  }

  // 3. Build Rich User Profile Text Representation
  const profileTokens = [];
  if (userInterests.length > 0) {
    profileTokens.push(`Interests: ${userInterests.join(' ')}`);
  }
  if (userCity) {
    profileTokens.push(`City: ${userCity}`);
  }
  if (userLanguage) {
    profileTokens.push(`Language: ${userLanguage}`);
  }

  // Factor in category weights from recent interactions
  const categoryWeights = {};
  userInteractions.forEach((interaction) => {
    if (interaction.category) {
      categoryWeights[interaction.category] = (categoryWeights[interaction.category] || 0) + (interaction.weight || 1);
    }
    if (interaction.interactionType === 'search' && interaction.metadata?.query) {
      profileTokens.push(interaction.metadata.query);
    }
  });

  Object.entries(categoryWeights).forEach(([cat, w]) => {
    for (let i = 0; i < Math.min(w, 5); i++) {
      profileTokens.push(cat);
    }
  });

  const userProfileString = profileTokens.join(' ');
  const userVector = generateFeatureVector(userProfileString, 64);

  // 4. Compute Embedding Similarity for Each Candidate Event
  const now = Date.now();
  const scoredEvents = await Promise.all(
    events.map(async (event) => {
      const eventVector = await getOrGenerateEventEmbedding(event);
      const similarity = cosineSimilarity(userVector, eventVector);

      let score = 0;
      const reasons = [];

      // A. Vector Similarity Score (Weight: 45 points)
      const simPoints = Math.round(similarity * 45);
      score += simPoints;
      if (simPoints >= 25) {
        reasons.push('High match with your profile & interests');
      }

      // B. Category Interaction Affinity (Weight: 20 points)
      if (userInterests.includes(event.category) || categoryWeights[event.category]) {
        score += 20;
        reasons.push(`Matches interest in ${event.category}`);
      }

      // C. Locality / City Match (Weight: 20 points)
      const evCity = String(event.city || '').toLowerCase();
      if (evCity === userCity.toLowerCase()) {
        score += 20;
        reasons.push(`Local event in ${event.city}`);
      } else if (['Tier 2', 'Tier 3', 'Tier 4'].includes(event.tier)) {
        score += 10;
        reasons.push(`${event.tier} community event`);
      }

      // D. Language Awareness (Weight: 10 points)
      const evLang = String(event.language || 'en').toLowerCase();
      if (evLang === userLanguage.toLowerCase() || (userLanguage.toLowerCase() === 'hi' && event.title_hi)) {
        score += 10;
        reasons.push(`Offered in your language (${userLanguage.toUpperCase()})`);
      }

      // E. Date Recency / Upcoming Boost (Weight: 5 points)
      const eventTime = event.startDate ? new Date(event.startDate).getTime() : now;
      if (eventTime >= now && eventTime <= now + 45 * 24 * 60 * 60 * 1000) {
        score += 5;
      }

      const isRsvped = rsvpedEventIds.includes((event._id || event.id)?.toString());

      return {
        event,
        matchScore: Math.min(99, Math.max(45, score)),
        similarityScore: Number(similarity.toFixed(4)),
        reason: reasons.join(' • ') || 'Personalized match based on your recent activity',
        isRsvped,
      };
    })
  );

  // Sort descending by match score
  scoredEvents.sort((a, b) => b.matchScore - a.matchScore);
  const topRecommendations = scoredEvents.slice(0, limit);

  metrics.totalLatencyMs += Date.now() - startTime;

  return {
    recommendations: topRecommendations,
    source: 'ai-embedding',
    isFallback: false,
    metrics: getMetrics(),
  };
};

// ---------------------------------------------------------------------------
// 7. Metrics & Instrumentation Accessors
// ---------------------------------------------------------------------------
const getMetrics = () => {
  const avgLatency =
    metrics.totalRequests > 0 ? Math.round(metrics.totalLatencyMs / metrics.totalRequests) : 0;
  return {
    ...metrics,
    averageLatencyMs: avgLatency,
    rateLimitRemaining: Math.max(0, MAX_CALLS_PER_WINDOW - callTimestamps.length),
  };
};

const resetMetrics = () => {
  metrics.totalRequests = 0;
  metrics.aiCalls = 0;
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.rateLimitedCalls = 0;
  metrics.fallbacksTriggered = 0;
  metrics.totalLatencyMs = 0;
  metrics.errors = 0;
  callTimestamps.length = 0;
  inMemoryEmbeddingCache.clear();
};

module.exports = {
  cosineSimilarity,
  normalizeVector,
  generateFeatureVector,
  getOrGenerateEventEmbedding,
  recordInteraction,
  getPopularityAndLocalityRecommendations,
  getPersonalizedRecommendations,
  getMetrics,
  resetMetrics,
  isRateLimited,
};
