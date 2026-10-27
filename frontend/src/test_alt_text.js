import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('===============================================================');
console.log('  TESTING ALT ATTRIBUTES, GUIDELINES & EVENT IMAGE FORM');
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

// 1. Verify ALT_TEXT_GUIDELINES.md exists and contains required sections
const guidelinesPath = path.join(__dirname, '..', '..', 'ALT_TEXT_GUIDELINES.md');
assert(fs.existsSync(guidelinesPath), 'ALT_TEXT_GUIDELINES.md exists in repository root');
const guidelinesContent = fs.readFileSync(guidelinesPath, 'utf8');

assert(guidelinesContent.includes('WCAG 2.1 Level AA Compliance'), 'Guidelines reference WCAG compliance');
assert(guidelinesContent.includes('Informative vs. Decorative'), 'Guidelines include Informative vs Decorative role classification');
assert(guidelinesContent.includes('Good vs. Bad Alt Text'), 'Guidelines include Good vs. Bad Alt Text examples');
assert(guidelinesContent.includes('Contributor Submission Checklist'), 'Guidelines include Contributor Submission Checklist');

// 2. Verify Backend Schema & Controller support imageUrlAlt
const eventModelPath = path.join(__dirname, '..', '..', 'backend', 'models', 'Event.js');
const eventModelContent = fs.readFileSync(eventModelPath, 'utf8');
assert(eventModelContent.includes('imageUrlAlt:'), 'Event.js Mongoose schema includes imageUrlAlt field');
assert(eventModelContent.includes('imageUrl:'), 'Event.js Mongoose schema includes imageUrl field');

const eventControllerPath = path.join(__dirname, '..', '..', 'backend', 'controllers', 'eventController.js');
const eventControllerContent = fs.readFileSync(eventControllerPath, 'utf8');
assert(eventControllerContent.includes('imageUrlAlt'), 'eventController.js accepts imageUrlAlt in createEvent');

// 3. Verify CreateEventModal.jsx has input fields and preview for alt text
const createModalPath = path.join(__dirname, 'components', 'CreateEventModal.jsx');
const createModalContent = fs.readFileSync(createModalPath, 'utf8');
assert(createModalContent.includes('name="imageUrlAlt"'), 'CreateEventModal.jsx has imageUrlAlt input field');
assert(createModalContent.includes('name="imageUrl"'), 'CreateEventModal.jsx has imageUrl input field');
assert(createModalContent.includes('alt={formData.imageUrlAlt'), 'CreateEventModal.jsx has image accessibility preview with alt text');

// 4. Verify EventCard.jsx, EventDetail.jsx & AIRecommendationSection.jsx render alt attributes & aria-hidden
const cardPath = path.join(__dirname, 'components', 'EventCard.jsx');
const cardContent = fs.readFileSync(cardPath, 'utf8');
assert(cardContent.includes('alt={event.imageUrlAlt'), 'EventCard.jsx renders image with alt text');
assert(cardContent.includes('aria-hidden="true"'), 'EventCard.jsx marks decorative icons/banners with aria-hidden="true"');

const detailPath = path.join(__dirname, 'components', 'EventDetail.jsx');
const detailContent = fs.readFileSync(detailPath, 'utf8');
assert(detailContent.includes('alt={event.imageUrlAlt'), 'EventDetail.jsx renders image with alt text');
assert(detailContent.includes('Screen Reader Description'), 'EventDetail.jsx displays image alt text metadata block');

// 5. Verify AIRecommendationSection.jsx marks all decorative icons with aria-hidden
const aiSectionPath = path.join(__dirname, 'components', 'AIRecommendationSection.jsx');
const aiSectionContent = fs.readFileSync(aiSectionPath, 'utf8');
const ariaHiddenMatches = (aiSectionContent.match(/aria-hidden="true"/g) || []).length;
assert(ariaHiddenMatches >= 3, `AIRecommendationSection.jsx marks decorative icons with aria-hidden="true" (found ${ariaHiddenMatches})`);
assert(!aiSectionContent.includes('<LocationOnIcon fontSize="small" />'), 'AIRecommendationSection.jsx LocationOnIcon is not missing aria-hidden');
assert(!aiSectionContent.includes('<AccessTimeIcon fontSize="small" color="primary" />'), 'AIRecommendationSection.jsx AccessTimeIcon is not missing aria-hidden');

// 6. Verify CreateEventModal.jsx imports Typography (no runtime crash)
const createModalImportCheck = createModalContent.includes('Typography');
assert(createModalImportCheck, 'CreateEventModal.jsx imports Typography from @mui/material');

console.log('\n===============================================================');
console.log(`  SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('===============================================================');
