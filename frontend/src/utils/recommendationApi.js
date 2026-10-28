/**
 * recommendationApi.js
 * Thin client for the /api/recommendations microservice.
 * All calls reuse the shared axios instance.
 *
 * Fire-and-forget for interaction recording: errors are swallowed so they never
 * interrupt the main UI flow.
 */
import axios from 'axios';

/**
 * Fetch personalized recommendations for the currently-authenticated user.
 * Falls back gracefully: unauthenticated requests still get popularity-locality results.
 *
 * @param {object} opts
 * @param {string} [opts.city]     - Override city (defaults to user.city on the server)
 * @param {string} [opts.language] - Override language code (e.g. 'hi', 'en')
 * @param {number} [opts.limit]    - Max results (default 4)
 * @returns {Promise<{ recommendations: Array, source: string, isFallback: boolean }>}
 */
export async function fetchRecommendations({ city = '', language = '', limit = 4 } = {}) {
  const params = { limit };
  if (city) params.city = city;
  if (language) params.language = language;

  const res = await axios.get('/api/recommendations', { params });
  return res.data;
}

/**
 * Record a user interaction (click, filter, RSVP, view) for recommendation training.
 *
 * @param {Object} payload
 * @param {string} payload.userId          - MongoDB ObjectId of the acting user
 * @param {string} [payload.eventId]       - MongoDB ObjectId of the target event (optional)
 * @param {string} payload.interactionType - 'click' | 'rsvp' | 'filter' | 'view' | 'search'
 * @param {string} [payload.category]      - Event category
 * @param {string} [payload.city]          - City context
 * @param {string} [payload.language]      - Language code ('en', 'hi', …)
 * @param {Object} [payload.metadata]      - Any extra key/value pairs
 */
export async function recordInteraction(payload) {
  if (!payload?.userId) return; // Never fire for anonymous users

  try {
    await axios.post('/api/recommendations/interactions', payload);
  } catch (err) {
    // Silently ignore — interaction recording is best-effort
    console.warn('[recommendations] recordInteraction failed silently:', err?.message);
  }
}

export default recordInteraction;
