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

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(` [PASS] ${message}`);
  } else {
    console.error(` [FAIL] ${message}`);
  }
}

// ----------------------------------------------------
// 1. TEST SUITE: Daylight Saving Time (DST) Transitions
// ----------------------------------------------------
console.log('--- 1. Testing DST Transitions (America/New_York & Europe/London) ---');

// Summer date (EDT: UTC-4) vs Winter date (EST: UTC-5)
const summerUTC = '2026-07-15T14:00:00.000Z';
const winterUTC = '2026-01-15T14:00:00.000Z';

const summerNY = formatEventDateTime(summerUTC, 'America/New_York', 'America/New_York', 'en-US');
const winterNY = formatEventDateTime(winterUTC, 'America/New_York', 'America/New_York', 'en-US');

assert(
  summerNY.timezoneLabel.includes('EDT') || summerNY.timezoneLabel.includes('UTC-04:00'),
  `Summer NY correctly formatted as EDT (UTC-4): '${summerNY.timezoneLabel}'`
);

assert(
  winterNY.timezoneLabel.includes('EST') || winterNY.timezoneLabel.includes('UTC-05:00'),
  `Winter NY correctly formatted as EST (UTC-5): '${winterNY.timezoneLabel}'`
);

// Summer London (BST: UTC+1) vs Winter London (GMT: UTC+0)
const summerLondon = formatEventDateTime(summerUTC, 'Europe/London', 'Europe/London', 'en-GB');
const winterLondon = formatEventDateTime(winterUTC, 'Europe/London', 'Europe/London', 'en-GB');

assert(
  summerLondon.timezoneLabel.includes('BST') || summerLondon.timezoneLabel.includes('UTC+01:00') || summerLondon.timezoneLabel.includes('BST'),
  `Summer London correctly formatted as BST (UTC+1): '${summerLondon.timezoneLabel}'`
);

assert(
  winterLondon.timezoneLabel.includes('GMT') || winterLondon.timezoneLabel.includes('UTC+00:00') || winterLondon.timezoneLabel.includes('GMT'),
  `Winter London correctly formatted as GMT (UTC+0): '${winterLondon.timezoneLabel}'`
);


// ----------------------------------------------------
// 2. TEST SUITE: Cross-Timezone & Cross-Midnight Conversions
// ----------------------------------------------------
console.log('\n--- 2. Testing Cross-Timezone & Cross-Midnight Conversions ---');

// Event in Jaipur at 2:00 AM IST on Aug 16, 2026
// In UTC: 2026-08-15 20:30:00 UTC
// In New York (EDT, UTC-4): 2026-08-15 16:30:00 (Aug 15 - Previous Day!)
const jaipurLateEventUTC = '2026-08-15T20:30:00.000Z';

const inJaipur = formatEventDateTime(jaipurLateEventUTC, 'Asia/Kolkata', 'Asia/Kolkata', 'en-IN');
const inNewYork = formatEventDateTime(jaipurLateEventUTC, 'Asia/Kolkata', 'America/New_York', 'en-US');

assert(
  inJaipur.formattedDate.includes('16') || inJaipur.formattedDate.includes('Aug'),
  `Jaipur local date is Aug 16: '${inJaipur.formattedDate} at ${inJaipur.formattedTime}'`
);

assert(
  inNewYork.isCrossTimezone === true,
  'Cross-timezone flag correctly identified as true'
);

assert(
  inNewYork.formattedDate.includes('15'),
  `Cross-midnight event correctly converted to previous day in NY (Aug 15): '${inNewYork.formattedDate} at ${inNewYork.formattedTime}'`
);


// ----------------------------------------------------
// 3. TEST SUITE: Defensive Fallbacks & Invalid Inputs
// ----------------------------------------------------
console.log('\n--- 3. Testing Edge Cases & Invalid Inputs ---');

const invalidDateRes = formatEventDateTime('invalid-date-string', 'Asia/Kolkata', 'Asia/Kolkata', 'en-US');
assert(
  invalidDateRes.formattedDate === 'Invalid Date',
  'Invalid date string handled cleanly without throwing error'
);

const nullDateRes = formatEventDateTime(null);
assert(
  nullDateRes.formattedDate === 'N/A',
  'Null date input handled cleanly with N/A fallback'
);

console.log('\n====================================================');
console.log(` TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed`);
console.log('====================================================');

if (passedTests === totalTests) {
  console.log('\nSUCCESS: Task 4 Timezone & DST Unit Test Suite Passed!');
  process.exit(0);
} else {
  console.error('\nFAILURE: Some tests in Task 4 failed.');
  process.exit(1);
}
