import {
  formatEventDateTime,
  getTimezoneOffsetLabel,
  getUserBrowserLocale,
  getUserBrowserTimezone
} from './dateUtils.js';

console.log('====================================================');
console.log('   TASK 4: UNIT & INTEGRATION TESTS FOR TIMEZONE & DST');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(` [PASS] ${message}`);
  } else {
    failedTests.push(message);
    console.error(` [FAIL] ${message}`);
  }
}

// ─────────────────────────────────────────────────────────
// SUITE 1: Daylight Saving Time (DST) Transitions
// ─────────────────────────────────────────────────────────
console.log('--- Suite 1: DST Transitions (America/New_York & Europe/London) ---');

const summerUTC = '2026-07-15T14:00:00.000Z';
const winterUTC = '2026-01-15T14:00:00.000Z';

const summerNY = formatEventDateTime(summerUTC, 'America/New_York', 'America/New_York', 'en-US');
const winterNY = formatEventDateTime(winterUTC, 'America/New_York', 'America/New_York', 'en-US');

assert(
  summerNY.timezoneLabel.includes('EDT') || summerNY.timezoneLabel.includes('UTC-04:00'),
  `[DST-1] Summer NY correctly shows EDT (UTC-4): '${summerNY.timezoneLabel}'`
);
assert(
  winterNY.timezoneLabel.includes('EST') || winterNY.timezoneLabel.includes('UTC-05:00'),
  `[DST-2] Winter NY correctly shows EST (UTC-5): '${winterNY.timezoneLabel}'`
);
assert(
  summerNY.formattedTime !== winterNY.formattedTime,
  `[DST-3] Summer vs Winter NY display times differ (DST offset applied)`
);

const summerLondon = formatEventDateTime(summerUTC, 'Europe/London', 'Europe/London', 'en-GB');
const winterLondon = formatEventDateTime(winterUTC, 'Europe/London', 'Europe/London', 'en-GB');

assert(
  summerLondon.timezoneLabel.includes('BST') || summerLondon.timezoneLabel.includes('UTC+01:00'),
  `[DST-4] Summer London correctly shows BST (UTC+1): '${summerLondon.timezoneLabel}'`
);
assert(
  winterLondon.timezoneLabel.includes('GMT') || winterLondon.timezoneLabel.includes('UTC+00:00'),
  `[DST-5] Winter London correctly shows GMT (UTC+0): '${winterLondon.timezoneLabel}'`
);

// ─────────────────────────────────────────────────────────
// SUITE 2: Conversions Across 6 Timezones
// ─────────────────────────────────────────────────────────
console.log('\n--- Suite 2: Conversions Across 6 Timezones ---');

const baseUTC = '2026-08-15T10:00:00.000Z';

const tzTests = [
  { tz: 'Asia/Kolkata',     locale: 'en-IN', expectedOffset: '+05:30' },
  { tz: 'America/New_York', locale: 'en-US', expectedOffset: '-04:00' },
  { tz: 'Europe/London',    locale: 'en-GB', expectedOffset: '+01:00' },
  { tz: 'Asia/Tokyo',       locale: 'ja-JP', expectedOffset: '+09:00' },
  { tz: 'Australia/Sydney', locale: 'en-AU', expectedOffset: '+10:00' },
  { tz: 'UTC',              locale: 'en-US', expectedOffset: '+00:00' },
];

tzTests.forEach(({ tz, locale, expectedOffset }) => {
  const result = formatEventDateTime(baseUTC, 'UTC', tz, locale);
  assert(
    result.timezoneLabel.includes(expectedOffset),
    `[TZ-${tz}] Offset label contains '${expectedOffset}': got '${result.timezoneLabel}'`
  );
  assert(
    result.formattedDate && result.formattedDate !== 'Invalid Date',
    `[TZ-${tz}] [${locale}] Date formatted cleanly: '${result.formattedDate}'`
  );
});

// ─────────────────────────────────────────────────────────
// SUITE 3: Locale-Specific Date Format Patterns
// ─────────────────────────────────────────────────────────
console.log('\n--- Suite 3: Locale-Specific Date Format Patterns ---');

const localeTestDate = '2026-08-15T10:00:00.000Z';

const enIN = formatEventDateTime(localeTestDate, 'Asia/Kolkata', 'Asia/Kolkata', 'en-IN');
assert(
  /\d{1,2}.*Aug/.test(enIN.formattedDate),
  `[LOCALE-1] en-IN has day before month: '${enIN.formattedDate}'`
);

const enUS = formatEventDateTime(localeTestDate, 'UTC', 'America/New_York', 'en-US');
assert(
  /Aug.*\d{1,2}/.test(enUS.formattedDate),
  `[LOCALE-2] en-US has month before day: '${enUS.formattedDate}'`
);

const enGB = formatEventDateTime(localeTestDate, 'UTC', 'Europe/London', 'en-GB');
assert(
  /\d{1,2}.*Aug/.test(enGB.formattedDate),
  `[LOCALE-3] en-GB has day before month: '${enGB.formattedDate}'`
);

assert(
  enIN.formattedTime.length > 0 && enUS.formattedTime.length > 0,
  `[LOCALE-4] Time strings are produced for en-IN ('${enIN.formattedTime}') and en-US ('${enUS.formattedTime}')`
);

// ─────────────────────────────────────────────────────────
// SUITE 4: Cross-Midnight Date Boundary Conversions
// ─────────────────────────────────────────────────────────
console.log('\n--- Suite 4: Cross-Midnight Conversions ---');

// Event at 2:00 AM IST (Aug 16) = 2026-08-15T20:30:00Z UTC
// In New York (EDT, UTC-4): Aug 15 at 4:30 PM
const jaipurLateUTC = '2026-08-15T20:30:00.000Z';

const inJaipur  = formatEventDateTime(jaipurLateUTC, 'Asia/Kolkata', 'Asia/Kolkata', 'en-IN');
const inNewYork = formatEventDateTime(jaipurLateUTC, 'Asia/Kolkata', 'America/New_York', 'en-US');
const inTokyo   = formatEventDateTime(jaipurLateUTC, 'Asia/Kolkata', 'Asia/Tokyo', 'ja-JP');

assert(
  inJaipur.formattedDate.includes('16'),
  `[CROSS-1] Jaipur shows Aug 16: '${inJaipur.formattedDate} at ${inJaipur.formattedTime}'`
);
assert(
  inNewYork.isCrossTimezone === true,
  `[CROSS-2] New York isCrossTimezone is true`
);
assert(
  inNewYork.formattedDate.includes('15'),
  `[CROSS-3] New York shows Aug 15 (cross-midnight): '${inNewYork.formattedDate} at ${inNewYork.formattedTime}'`
);
assert(
  inTokyo.formattedDate.includes('16'),
  `[CROSS-4] Tokyo (UTC+9) shows Aug 16: '${inTokyo.formattedDate}'`
);

// ─────────────────────────────────────────────────────────
// SUITE 5: getTimezoneOffsetLabel() Accuracy
// ─────────────────────────────────────────────────────────
console.log('\n--- Suite 5: getTimezoneOffsetLabel() Precision ---');

const offsetTests = [
  { tz: 'UTC',              date: summerUTC, expected: 'UTC+00:00', label: 'UTC (summer)' },
  { tz: 'Asia/Kolkata',     date: summerUTC, expected: 'UTC+05:30', label: 'IST (no DST)' },
  { tz: 'America/New_York', date: summerUTC, expected: 'UTC-04:00', label: 'EDT (summer)' },
  { tz: 'America/New_York', date: winterUTC, expected: 'UTC-05:00', label: 'EST (winter)' },
  { tz: 'Asia/Tokyo',       date: summerUTC, expected: 'UTC+09:00', label: 'JST (no DST)' },
  { tz: 'Europe/Paris',     date: summerUTC, expected: 'UTC+02:00', label: 'CEST (summer)' },
  { tz: 'Europe/Paris',     date: winterUTC, expected: 'UTC+01:00', label: 'CET (winter)' },
];

offsetTests.forEach(({ tz, date, expected, label }) => {
  const result = getTimezoneOffsetLabel(tz, new Date(date));
  assert(
    result.includes(expected),
    `[OFFSET] ${label} → '${expected}' in label: got '${result}'`
  );
});

// ─────────────────────────────────────────────────────────
// SUITE 6: Edge Cases & Defensive Fallbacks
// ─────────────────────────────────────────────────────────
console.log('\n--- Suite 6: Edge Cases & Defensive Fallbacks ---');

const r1 = formatEventDateTime('not-a-date', 'Asia/Kolkata', 'Asia/Kolkata', 'en-US');
assert(r1.formattedDate === 'Invalid Date', `[EDGE-1] Invalid date string → 'Invalid Date'`);

const r2 = formatEventDateTime(null);
assert(r2.formattedDate === 'N/A', `[EDGE-2] null → 'N/A'`);

const r3 = formatEventDateTime(undefined);
assert(r3.formattedDate === 'N/A', `[EDGE-3] undefined → 'N/A'`);

const r4 = formatEventDateTime('');
assert(r4.formattedDate === 'N/A', `[EDGE-4] empty string → 'N/A'`);

const r5 = formatEventDateTime('2026-12-31T23:59:59.000Z', 'UTC', 'UTC', 'en-US');
assert(
  r5.formattedDate.includes('2026') || r5.formattedDate.includes('Dec'),
  `[EDGE-5] Year-boundary date formats cleanly: '${r5.formattedDate}'`
);

// ─────────────────────────────────────────────────────────
// SUITE 7: isCrossTimezone Flag Logic
// ─────────────────────────────────────────────────────────
console.log('\n--- Suite 7: isCrossTimezone Flag Logic ---');

const same = formatEventDateTime(baseUTC, 'Asia/Kolkata', 'Asia/Kolkata', 'en-IN');
assert(same.isCrossTimezone === false, `[FLAG-1] Same origin & target → isCrossTimezone = false`);

const diff = formatEventDateTime(baseUTC, 'Asia/Kolkata', 'America/New_York', 'en-US');
assert(diff.isCrossTimezone === true, `[FLAG-2] Different timezones → isCrossTimezone = true`);

const utcToIST = formatEventDateTime(baseUTC, 'UTC', 'Asia/Kolkata', 'en-IN');
assert(utcToIST.isCrossTimezone === true, `[FLAG-3] UTC→IST → isCrossTimezone = true`);

const londonToNY = formatEventDateTime(baseUTC, 'Europe/London', 'America/New_York', 'en-US');
assert(londonToNY.isCrossTimezone === true, `[FLAG-4] London→NY → isCrossTimezone = true`);

// ─────────────────────────────────────────────────────────
// FINAL REPORT
// ─────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(` TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed`);
if (failedTests.length > 0) {
  console.log('\n Failed Tests:');
  failedTests.forEach(t => console.error(`  ✗ ${t}`));
}
console.log('====================================================');

if (passedTests === totalTests) {
  console.log('\nSUCCESS: Task 4 Timezone & DST Unit Test Suite Passed!');
  process.exit(0);
} else {
  console.error(`\nFAILURE: ${failedTests.length} test(s) in Task 4 failed.`);
  process.exit(1);
}
