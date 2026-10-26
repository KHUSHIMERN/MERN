/**
 * recommendationApi.js
 * Thin client for the /api/recommendations microservice.
 * All calls reuse the shared axios instance (with auto-refreshed Bearer token).
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
 * Record a user interaction event so future recommendations improve.
 *
 * @param {object} interaction
 * @param {string} interaction.userId          - MongoDB ObjectId string
 * @param {string} [interaction.eventId]       - MongoDB ObjectId string (null for search/filter)
 * @param {'view'|'click'|'rsvp'|'filter'|'search'} interaction.interactionType
 * @param {string} [interaction.category]
 * @param {string} [interaction.city]
 * @param {string} [interaction.language]      - 'en' | 'hi' | 'kn' …
 * @param {object} [interaction.metadata]      - arbitrary extra payload
 */
export async function recordInteraction(interaction) {
  try {
    await axios.post('/api/recommendations/interactions', interaction);
  } catch (err) {
    // Interaction tracking is non-critical — never surface to user
    console.warn('[recommendations] recordInteraction failed silently:', err?.message);
  }
}
