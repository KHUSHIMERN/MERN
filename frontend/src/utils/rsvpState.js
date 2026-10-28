/**
 * rsvpState.js
 * Pure utility functions for computing RSVP status from event data.
 * No side-effects; safe to use in components and unit tests.
 * Supports both DEV-AMRITA (rsvpedUsers/attendees arrays) and QA
 * (userRegistrationStatus / confirmedCount fields) data shapes.
 */

/**
 * Returns the current user's RSVP status for the event:
 *  'confirmed' | 'waitlist' | 'none'
 *
 * Requires the event to have been enriched server-side with
 * `userRsvpStatus` or `userRegistrationStatus`.
 */
export function rsvpStatus(evt) {
  if (!evt) return 'none';
  const status = evt.userRsvpStatus || evt.userRegistrationStatus;
  if (status === 'confirmed') return 'confirmed';
  if (status === 'waitlist') return 'waitlist';
  return 'none';
}

/**
 * Returns the number of confirmed (non-waitlist) attendees for an event.
 * Supports both the new `rsvpedUsers` array and the legacy `attendees` array.
 */
export function confirmedCount(evt) {
  if (!evt) return 0;

  // QA shape: explicit confirmedCount field
  if (typeof evt.confirmedCount === 'number') return evt.confirmedCount;

  // Prefer the explicit attendeesCount field when it is set
  if (typeof evt.attendeesCount === 'number' && evt.attendeesCount > 0) {
    return evt.attendeesCount;
  }

  // rsvpedUsers is the primary confirmed-RSVPs array
  if (Array.isArray(evt.rsvpedUsers)) {
    return evt.rsvpedUsers.length;
  }

  // Legacy attendees sub-documents
  if (Array.isArray(evt.attendees)) {
    return evt.attendees.filter(
      (a) => !a.rsvpStatus || a.rsvpStatus === 'confirmed'
    ).length;
  }

  return 0;
}

/**
 * Returns the number of waitlisted attendees.
 */
export function waitlistCount(evt) {
  if (!evt) return 0;
  if (typeof evt.waitlistCount === 'number') return evt.waitlistCount;
  if (Array.isArray(evt.waitlistUsers)) return evt.waitlistUsers.length;
  if (Array.isArray(evt.attendees)) {
    return evt.attendees.filter((a) => a.rsvpStatus === 'waitlist').length;
  }
  return 0;
}

/**
 * Returns true when the event has reached capacity (confirmed >= capacity).
 */
export function isEventFull(evt) {
  if (!evt) return false;
  const cap = evt.capacity ?? 100;
  return confirmedCount(evt) >= cap;
}

/**
 * Returns true if the current user has an active RSVP (confirmed or waitlist).
 */
export function hasActiveRsvp(evt) {
  const s = rsvpStatus(evt);
  return s === 'confirmed' || s === 'waitlist';
}

/**
 * Returns the label for the RSVP action button.
 */
export function rsvpLabel(evt) {
  const status = rsvpStatus(evt);
  if (status === 'confirmed') return 'Cancel RSVP';
  if (status === 'waitlist') return 'Cancel RSVP';
  return isEventFull(evt) ? 'Join Waitlist' : 'RSVP';
}

/**
 * Returns a human-readable status label for the RSVP badge on an event card.
 */
export function rsvpStatusLabel(evt) {
  const status = rsvpStatus(evt);
  const full = isEventFull(evt);

  if (status === 'confirmed') return '✅ Registered';
  if (status === 'waitlist') return `⏳ Waitlisted — Position ${evt.userWaitlistPosition || '?'}`;
  if (full) return '🔴 Full';
  return '';
}
