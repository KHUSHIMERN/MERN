const { execSync } = require('child_process');
const path = require('path');

console.log('===============================================================');
console.log('  FULL USER STORY VERIFICATION RUNNER');
console.log('  Locale-aware Date/Time Formatting & Timezone Handling');
console.log('===============================================================\n');

try {
  console.log('>>> RUNNING TASK 1 TESTS (Mongoose Schema & IANA Validation)...');
  execSync('node test_task1.js', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });

  console.log('\n>>> RUNNING TASK 2 TESTS (Date & Locale Formatting Utilities)...');
  execSync('node src/utils/test_dateUtils.js', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

  console.log('\n>>> RUNNING TASK 3 TESTS (User Profile & Timezone Override)...');
  execSync('node test_task3.js', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });

  console.log('\n>>> RUNNING TASK 4 TESTS (DST Transitions & Cross-Midnight Shift)...');
  execSync('node src/utils/dateUtils.test.js', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

  console.log('\n>>> RUNNING TASK 5 TESTS (Rem Units & Zoom Scaling Verification)...');
  execSync('node src/test_zoom_rem.js', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

  console.log('\n===============================================================');
  console.log('  ALL TASKS VERIFIED & PASSED WITH 100% SUCCESS!');
  console.log('===============================================================');
  process.exit(0);
} catch (error) {
  console.error('\nVerification failed during test suite execution:', error.message);
  process.exit(1);
}
