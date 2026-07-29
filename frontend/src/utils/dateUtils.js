/**
 * Locale and Timezone Utility functions using native Intl.DateTimeFormat
 */

// Detect user's current browser locale (e.g., 'en-IN', 'en-US', 'hi-IN')
export const getUserBrowserLocale = () => {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US';
};

// Detect user's current browser timezone (e.g., 'Asia/Kolkata', 'America/New_York')
export const getUserBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch (e) {
    return 'Asia/Kolkata';
  }
};

/**
 * Calculates a human-readable timezone offset label (e.g., "IST (UTC+5:30)" or "EDT (UTC-4:00)")
 */
export const getTimezoneOffsetLabel = (timezone, dateObj = new Date()) => {
  try {
    const d = new Date(dateObj);
    
    // Get formatted timezone abbreviation (e.g., IST, EST, GMT)
    const shortTzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    const parts = shortTzFormatter.formatToParts(d);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    const tzName = tzPart ? tzPart.value : timezone;

    // Calculate numeric UTC offset for target date
    const utcDate = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(d.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMinutes = Math.round((tzDate - utcDate) / (1000 * 60));

    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const mins = String(absMinutes % 60).padStart(2, '0');

    const offsetString = `UTC${sign}${hours}:${mins}`;

    return tzName.includes('GMT') || tzName.includes('UTC')
      ? `${offsetString}`
      : `${tzName} (${offsetString})`;
  } catch (err) {
    return timezone || 'UTC';
  }
};

/**
 * Core formatting utility: takes an event date and outputs localized date/time strings
 */
export const formatEventDateTime = (
  dateInput,
  originTimezone = 'Asia/Kolkata',
  targetTimezone = null,
  locale = null
) => {
  if (!dateInput) {
    return {
      formattedDate: 'N/A',
      formattedTime: 'N/A',
      fullDateTime: 'N/A',
      timezoneLabel: '',
      isCrossTimezone: false
    };
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return {
      formattedDate: 'Invalid Date',
      formattedTime: '',
      fullDateTime: 'Invalid Date',
      timezoneLabel: '',
      isCrossTimezone: false
    };
  }

  const activeLocale = locale || getUserBrowserLocale();
  const activeTargetTimezone = targetTimezone || getUserBrowserTimezone();

  // Date formatter according to user locale & target timezone
  const dateFormatter = new Intl.DateTimeFormat(activeLocale, {
    timeZone: activeTargetTimezone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Time formatter according to user locale & target timezone
  const timeFormatter = new Intl.DateTimeFormat(activeLocale, {
    timeZone: activeTargetTimezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const formattedDate = dateFormatter.format(d);
  const formattedTime = timeFormatter.format(d);
  const fullDateTime = `${formattedDate} at ${formattedTime}`;
  const timezoneLabel = getTimezoneOffsetLabel(activeTargetTimezone, d);

  const isCrossTimezone = originTimezone && originTimezone !== activeTargetTimezone;

  return {
    formattedDate,
    formattedTime,
    fullDateTime,
    timezoneLabel,
    activeTargetTimezone,
    originTimezone,
    isCrossTimezone
  };
};
