import {
  getUserBrowserLocale,
  getUserBrowserTimezone,
  getTimezoneOffsetLabel,
  formatEventDateTime
} from './dateUtils.js';

console.log('--- Testing Task 2: Date Formatting & Locale Utilities ---');

// Test 1: Browser Detection
const locale = getUserBrowserLocale();
const timezone = getUserBrowserTimezone();
console.log(`[PASS] Detected Browser Locale: '${locale}'`);
console.log(`[PASS] Detected Browser Timezone: '${timezone}'`);

// Test 2: Event Date Formatting Across Timezones
const sampleDate = '2026-08-15T10:00:00.000Z'; // UTC

const testCases = [
  { originTz: 'Asia/Kolkata', targetTz: 'Asia/Kolkata', locale: 'en-IN' },
  { originTz: 'Asia/Kolkata', targetTz: 'America/New_York', locale: 'en-US' },
  { originTz: 'Asia/Kolkata', targetTz: 'Europe/London', locale: 'en-GB' }
];

let allPassed = true;

testCases.forEach(({ originTz, targetTz, locale }) => {
  const result = formatEventDateTime(sampleDate, originTz, targetTz, locale);
  console.log(`\nTesting Target Timezone: ${targetTz} [Locale: ${locale}]`);
  console.log(` - Formatted Date: ${result.formattedDate}`);
  console.log(` - Formatted Time: ${result.formattedTime}`);
  console.log(` - Timezone Label: ${result.timezoneLabel}`);
  console.log(` - Is Cross Timezone: ${result.isCrossTimezone}`);

  if (!result.formattedDate || result.formattedDate === 'Invalid Date') {
    allPassed = false;
    console.error(`[FAIL] Formatting failed for ${targetTz}`);
  }
});

if (allPassed) {
  console.log('\nSUCCESS: Task 2 Date Formatting & Locale Utilities verified successfully!');
  process.exit(0);
} else {
  console.error('\nFAILURE: Task 2 Verification failed.');
  process.exit(1);
}
