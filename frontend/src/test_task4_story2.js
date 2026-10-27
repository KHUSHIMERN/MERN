/**
 * test_task4_story2.js
 * Task 4 — Story 2: WCAG 1.4.1 Verification
 * Verifies that color is NOT the sole means of conveying status/validation information.
 * Every status and error state must have BOTH an icon AND a text label.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('===============================================================');
console.log('  TESTING TASK 4: WCAG 1.4.1 — Color Not Sole Indicator');
console.log('  Status Badges, Form Validation, Required Fields');
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

// ── 1. translations.js — Task 4 status string keys ───────────────────────────
const translationsPath = path.join(__dirname, 'utils', 'translations.js');
const translationsContent = fs.readFileSync(translationsPath, 'utf8');

assert(translationsContent.includes('statusOpen:'), 'translations.js defines statusOpen key');
assert(translationsContent.includes('statusAlmostFull:'), 'translations.js defines statusAlmostFull key');
assert(translationsContent.includes('statusFull:'), 'translations.js defines statusFull key');
assert(translationsContent.includes('statusOpenAriaLabel:'), 'translations.js defines statusOpenAriaLabel key');
assert(translationsContent.includes('statusAlmostFullAriaLabel:'), 'translations.js defines statusAlmostFullAriaLabel key');
assert(translationsContent.includes('statusFullAriaLabel:'), 'translations.js defines statusFullAriaLabel key');
assert(translationsContent.includes('spotsLeft:'), 'translations.js defines spotsLeft key');
assert(translationsContent.includes('rsvpDisabledFull:'), 'translations.js defines rsvpDisabledFull key');
assert(translationsContent.includes('requiredFieldsNote:'), 'translations.js defines requiredFieldsNote key');
assert(translationsContent.includes('fieldRequired:'), 'translations.js defines fieldRequired key');
// Verify both EN and HI locales have the keys (appear at least twice)
const statusFullCount = (translationsContent.match(/statusFull:/g) || []).length;
assert(statusFullCount >= 2, `statusFull key exists in both EN and HI locales (found ${statusFullCount})`);

// ── 2. EventCard.jsx — icon + text status badge, disabled RSVP button ────────
const cardPath = path.join(__dirname, 'components', 'EventCard.jsx');
const cardContent = fs.readFileSync(cardPath, 'utf8');

assert(cardContent.includes('getCapacityStatus'), 'EventCard.jsx defines getCapacityStatus helper');
assert(cardContent.includes('CheckCircleIcon'), 'EventCard.jsx imports CheckCircleIcon for Open status');
assert(cardContent.includes('WarningAmberIcon'), 'EventCard.jsx imports WarningAmberIcon for Almost Full status');
assert(cardContent.includes('LockIcon'), 'EventCard.jsx imports LockIcon for Full status');
assert(cardContent.includes("level: 'full'"), "EventCard.jsx getCapacityStatus has 'full' level branch");
assert(cardContent.includes("level: 'almostFull'"), "EventCard.jsx getCapacityStatus has 'almostFull' level branch");
assert(cardContent.includes("level: 'open'"), "EventCard.jsx getCapacityStatus has 'open' level branch");
assert(cardContent.includes('aria-label={capacityStatus.ariaLabel}'), 'EventCard.jsx status Chip has aria-label');
assert(cardContent.includes('disabled={isFull}'), 'EventCard.jsx RSVP button is disabled when full');
assert(cardContent.includes("isFull ? t('rsvpDisabledFull') : t('rsvpBtn')"), "EventCard.jsx RSVP button label changes to 'Fully Booked' text when full");
assert(cardContent.includes("aria-disabled={isFull}"), 'EventCard.jsx RSVP button has aria-disabled');

// ── 3. EventDetail.jsx — status badge in dialog header, RSVP button state ────
const detailPath = path.join(__dirname, 'components', 'EventDetail.jsx');
const detailContent = fs.readFileSync(detailPath, 'utf8');

assert(detailContent.includes('getCapacityStatus'), 'EventDetail.jsx defines getCapacityStatus helper');
assert(detailContent.includes('aria-label={capacityStatus.ariaLabel}'), 'EventDetail.jsx status Chip has aria-label');
assert(detailContent.includes('disabled={isFull}'), 'EventDetail.jsx RSVP button is disabled when full');
assert(detailContent.includes("isFull ? t('rsvpDisabledFull') : t('rsvpBtn')"), "EventDetail.jsx RSVP button changes label when full");

// ── 4. RSVPModal.jsx — capacity banner, inline validation icons ───────────────
const rsvpPath = path.join(__dirname, 'components', 'RSVPModal.jsx');
const rsvpContent = fs.readFileSync(rsvpPath, 'utf8');

assert(rsvpContent.includes('ErrorOutlineIcon'), 'RSVPModal.jsx imports ErrorOutlineIcon for validation errors');
assert(rsvpContent.includes('WarningAmberIcon'), 'RSVPModal.jsx imports WarningAmberIcon for Almost Full warning');
assert(rsvpContent.includes('LockIcon'), 'RSVPModal.jsx imports LockIcon for Full status banner');
assert(rsvpContent.includes("severity=\"error\""), 'RSVPModal.jsx renders error Alert for fully booked state');
assert(rsvpContent.includes("severity=\"warning\""), 'RSVPModal.jsx renders warning Alert for almost-full state');
assert(rsvpContent.includes('role="status"'), 'RSVPModal.jsx capacity alerts use role="status" for live region');
assert(rsvpContent.includes('InfoOutlinedIcon'), 'RSVPModal.jsx uses InfoOutlinedIcon for required fields note');
assert(rsvpContent.includes("role=\"alert\""), 'RSVPModal.jsx inline field errors use role="alert"');
assert(rsvpContent.includes("aria-describedby"), 'RSVPModal.jsx links field errors via aria-describedby');
assert(rsvpContent.includes("aria-required"), 'RSVPModal.jsx marks required inputs with aria-required');

// ── 5. CreateEventModal.jsx — error summary icon, inline field errors ─────────
const createPath = path.join(__dirname, 'components', 'CreateEventModal.jsx');
const createContent = fs.readFileSync(createPath, 'utf8');

assert(createContent.includes('ErrorOutlineIcon'), 'CreateEventModal.jsx imports ErrorOutlineIcon');
assert(createContent.includes("role=\"alert\""), 'CreateEventModal.jsx error summary has role="alert"');
assert(createContent.includes('aria-live="assertive"'), 'CreateEventModal.jsx error alert has aria-live="assertive"');
assert(createContent.includes('fieldErrors'), 'CreateEventModal.jsx uses fieldErrors for inline validation');
assert(createContent.includes("submitted"), 'CreateEventModal.jsx tracks submitted state for validation display');
assert(createContent.includes('validationErrorSummary'), 'CreateEventModal.jsx uses validationErrorSummary translation key');
assert(createContent.includes('requiredFieldsNote'), 'CreateEventModal.jsx uses requiredFieldsNote translation key');

// ── 6. Color-blindness invariant: status meaning survives without color ────────
// Every status must have a non-color discriminator (icon type + text label differ)
const hasThreeDistinctIcons = (
  cardContent.includes('CheckCircleIcon') &&
  cardContent.includes('WarningAmberIcon') &&
  cardContent.includes('LockIcon')
);
assert(hasThreeDistinctIcons, 'Three distinct icons used for 3 status levels (color-blindness safe)');
// Labels also differ — "Open", "Almost Full", "Fully Booked" — verified via translation key presence above

console.log('\n===============================================================');
console.log(`  SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('===============================================================');
