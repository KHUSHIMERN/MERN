const Event = require('./models/Event');

console.log('--- Testing Task 1: Timezone Field & Validation ---');

// Test 1: Valid IANA Timezones
const validTimezones = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'UTC', 'Asia/Tokyo'];
let validPassed = 0;

validTimezones.forEach(tz => {
  const event = new Event({
    title: 'Test Event',
    description: 'Testing timezone validation',
    startDate: new Date(),
    timezone: tz
  });
  const err = event.validateSync();
  if (!err) {
    validPassed++;
    console.log(`[PASS] Valid timezone supported: '${tz}'`);
  } else {
    console.error(`[FAIL] Valid timezone rejected: '${tz}'`, err.message);
  }
});

// Test 2: Invalid IANA Timezone
const invalidTimezone = 'Invalid/Fake_Zone';
const invalidEvent = new Event({
  title: 'Bad Timezone Event',
  description: 'Should fail validation',
  startDate: new Date(),
  timezone: invalidTimezone
});
const invalidErr = invalidEvent.validateSync();
if (invalidErr && invalidErr.errors.timezone) {
  console.log(`[PASS] Invalid timezone correctly rejected: '${invalidTimezone}' -> ${invalidErr.errors.timezone.message}`);
} else {
  console.error(`[FAIL] Invalid timezone was incorrectly accepted: '${invalidTimezone}'`);
}

if (validPassed === validTimezones.length && invalidErr) {
  console.log('\nSUCCESS: Task 1 Backend Mongoose Schema & IANA Validation verified successfully!');
  process.exit(0);
} else {
  console.error('\nFAILURE: Task 1 Verification failed.');
  process.exit(1);
}
