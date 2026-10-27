export const rsvpStatus = (event) => event?.userRegistrationStatus || 'none';
export const hasActiveRsvp = (event) => ['confirmed', 'waitlist'].includes(rsvpStatus(event));
export const confirmedCount = (event) => event?.confirmedCount ?? event?.attendeesCount ?? event?.attendees?.length ?? 0;
export const isEventFull = (event) => confirmedCount(event) >= (event?.capacity ?? 100);

export const rsvpLabel = (event) => {
  const status = rsvpStatus(event);
  if (status === 'confirmed') return 'Cancel RSVP';
  if (status === 'waitlist') return 'Cancel RSVP';
  return isEventFull(event) ? 'Join Waitlist' : 'RSVP';
};

export const rsvpStatusLabel = (event) => {
  const status = rsvpStatus(event);
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'waitlist') return `Waitlisted • Position ${event.userWaitlistPosition || '?'}`;
  return isEventFull(event) ? 'Full' : 'Open';
};
