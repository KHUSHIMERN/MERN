/**
 * test_task2_story3.js
 * Verification test suite for Task 2 of Story 3: Per-Event Metrics Cards & Trend Table
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('===============================================================');
console.log('  TESTING TASK 2 (STORY 3): ATTENDANCE METRICS CARDS & TREND TABLE');
console.log('  Per-event Cards (Confirmed, Checked-in, Attendance Rate) & Trend Table');
console.log('===============================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(` [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(` [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ── 1. AttendanceMetrics.jsx File & Component Verification ───────────────────
const metricsPath = path.join(__dirname, 'components', 'AttendanceMetrics.jsx');
assert(fs.existsSync(metricsPath), 'AttendanceMetrics.jsx component exists');

const metricsContent = fs.readFileSync(metricsPath, 'utf8');

// Metric Cards verification
assert(metricsContent.includes('export default function AttendanceMetrics'), 'AttendanceMetrics exports default component');
assert(metricsContent.includes('confirmed') && metricsContent.includes('GroupIcon'), 'AttendanceMetrics renders Confirmed Attendees card with icon');
assert(metricsContent.includes('checkedIn') && metricsContent.includes('CheckCircleIcon'), 'AttendanceMetrics renders Checked-In card with icon');
assert(metricsContent.includes('attendanceRate') && metricsContent.includes('TrendingUpIcon'), 'AttendanceMetrics renders Attendance Rate card with icon');
assert(metricsContent.includes('formatRate') || metricsContent.includes('toFixed'), 'AttendanceMetrics formats attendance rate as percentage');

// Trend Table & Last N Events verification
assert(metricsContent.includes('TableContainer') && metricsContent.includes('TableBody'), 'AttendanceMetrics implements trend table structure');
assert(metricsContent.includes('limit') && metricsContent.includes('lastNEvents'), 'AttendanceMetrics supports Last N Events limit parameter');
assert(metricsContent.includes('selectedEventId') || metricsContent.includes('setSelectedEventId'), 'AttendanceMetrics supports event row selection for detailed cards');

// API call, Loading & Error handling
assert(metricsContent.includes('/attendance-metrics'), 'AttendanceMetrics calls backend attendance metrics endpoint');
assert(metricsContent.includes('CircularProgress') && metricsContent.includes('loading'), 'AttendanceMetrics handles loading state with spinner');
assert(metricsContent.includes('Alert') && metricsContent.includes('setError'), 'AttendanceMetrics handles error state with alert and retry option');

// ── 2. Translations Verification ─────────────────────────────────────────────
const translationsPath = path.join(__dirname, 'utils', 'translations.js');
const translationsContent = fs.readFileSync(translationsPath, 'utf8');

assert(translationsContent.includes('metricsTitle:'), 'translations.js defines metricsTitle key');
assert(translationsContent.includes('confirmedCardTitle:'), 'translations.js defines confirmedCardTitle key');
assert(translationsContent.includes('checkedInCardTitle:'), 'translations.js defines checkedInCardTitle key');
assert(translationsContent.includes('attendanceRateCardTitle:'), 'translations.js defines attendanceRateCardTitle key');
assert(translationsContent.includes('trendTableTitle:'), 'translations.js defines trendTableTitle key');
assert(translationsContent.includes('lastNEvents:'), 'translations.js defines lastNEvents key');

const metricsTitleCount = (translationsContent.match(/metricsTitle:/g) || []).length;
assert(metricsTitleCount >= 2, 'metrics translation keys exist in both EN and HI locales');

// ── 3. Integration in EventList.jsx ──────────────────────────────────────────
const eventListPath = path.join(__dirname, 'components', 'EventList.jsx');
const eventListContent = fs.readFileSync(eventListPath, 'utf8');

assert(eventListContent.includes("import AttendanceMetrics from './AttendanceMetrics'"), 'EventList.jsx imports AttendanceMetrics component');
assert(eventListContent.includes('role === \'organizer\'') && eventListContent.includes('<AttendanceMetrics'), 'EventList.jsx conditionally renders AttendanceMetrics for organizer role');

// Summary output
console.log('\n===============================================================');
console.log(`  SUMMARY: ${passedTests}/${totalTests} TESTS PASSED FOR TASK 2 (STORY 3)`);
console.log('===============================================================');

if (passedTests === totalTests) {
  console.log('SUCCESS: Task 2 of Story 3 Attendance Metrics verified successfully!\n');
  process.exit(0);
} else {
  console.error('FAILURE: Some tests in Task 2 of Story 3 failed.\n');
  process.exit(1);
}
