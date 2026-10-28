/**
 * recommendationApi.js
 * Thin wrapper for recording user interaction signals
 * sent to the recommendations endpoint.
 *
 * Fire-and-forget: errors are swallowed so they never
 * interrupt the main UI flow.
 */
import axios from 'axios';

/**
 * Record a user interaction (click, filter, RSVP, view) for recommendation training.
 *
 * @param {Object} payload
 * @param {string} payload.userId        - MongoDB ObjectId of the acting user
 * @param {string} [payload.eventId]     - MongoDB ObjectId of the target event (optional)
 * @param {string} payload.interactionType - 'click' | 'rsvp' | 'filter' | 'view'
 * @param {string} [payload.category]    - Event category
 * @param {string} [payload.city]        - City context
 * @param {string} [payload.language]    - Language code ('en', 'hi', …)
 * @param {Object} [payload.metadata]    - Any extra key/value pairs
 */
export async function recordInteraction(payload) {
  if (!payload?.userId) return; // Never fire for anonymous users

  try {
    await axios.post('/api/recommendations/interactions', payload);
  } catch {
    // Silently ignore — interaction recording is best-effort
  }
}

export default recordInteraction;
