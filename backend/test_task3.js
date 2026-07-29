const User = require('./models/User');

console.log('--- Testing Task 3: User Profile Timezone Override & Validation ---');

let passedTests = 0;
const totalTests = 3;

// Test 1: Create user with default null timezone (detected from browser)
const user1 = new User({ name: 'Guest Resident', email: 'guest@example.com', password: 'password123' });
const err1 = user1.validateSync();
if (!err1 && user1.preferredTimezone === null) {
  passedTests++;
  console.log('[PASS] Default preferredTimezone is null (detected from browser)');
} else {
  console.error('[FAIL] Default preferredTimezone failed:', err1);
}

// Test 2: Set valid manual timezone override
user1.preferredTimezone = 'America/New_York';
const err2 = user1.validateSync();
if (!err2) {
  passedTests++;
  console.log(`[PASS] Valid timezone override set: '${user1.preferredTimezone}'`);
} else {
  console.error('[FAIL] Valid timezone override rejected:', err2);
}

// Test 3: Set invalid timezone override
const invalidUser = new User({ name: 'Test User', email: 'invalid@example.com', password: 'password123', preferredTimezone: 'Invalid_Zone/XYZ' });
const err3 = invalidUser.validateSync();
if (err3 && err3.errors.preferredTimezone) {
  passedTests++;
  console.log(`[PASS] Invalid timezone override correctly rejected: '${err3.errors.preferredTimezone.message}'`);
} else {
  console.error('[FAIL] Invalid timezone override was accepted unexpectedly');
}

if (passedTests === totalTests) {
  console.log('\nSUCCESS: Task 3 User Profile Timezone Override verified successfully!');
  process.exit(0);
} else {
  console.error('\nFAILURE: Task 3 Verification failed.');
  process.exit(1);
}
