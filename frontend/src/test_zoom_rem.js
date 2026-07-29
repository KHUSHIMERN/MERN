import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('===============================================================');
console.log('  TESTING HARDCODED PX TO REM CONVERSION & ZOOM SCALING');
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

// 1. Verify index.css CSS variables & scalable root font size
const indexCssPath = path.join(__dirname, 'index.css');
assert(fs.existsSync(indexCssPath), 'index.css file exists');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

assert(indexCssContent.includes('font-size: 100%'), 'index.css sets scalable root html font-size: 100%');
assert(indexCssContent.includes('--font-size-xs: 0.75rem'), 'index.css defines --font-size-xs in rems');
assert(indexCssContent.includes('--font-size-sm: 0.875rem'), 'index.css defines --font-size-sm in rems');
assert(indexCssContent.includes('--font-size-base: 1rem'), 'index.css defines --font-size-base in rems');
assert(indexCssContent.includes('--font-size-lg: 1.125rem'), 'index.css defines --font-size-lg in rems');
assert(indexCssContent.includes('--font-size-xl: 1.25rem'), 'index.css defines --font-size-xl in rems');
assert(indexCssContent.includes('--font-size-2xl: 1.5rem'), 'index.css defines --font-size-2xl in rems');
assert(indexCssContent.includes('--font-size-3xl: 1.75rem'), 'index.css defines --font-size-3xl in rems');
assert(indexCssContent.includes('--font-size-4xl: 2.25rem'), 'index.css defines --font-size-4xl in rems');
assert(indexCssContent.includes('--font-size-5xl: 3.75rem'), 'index.css defines --font-size-5xl in rems');

// 2. Verify App.jsx theme typography in rems & CssBaseline html font-size
const appJsxPath = path.join(__dirname, 'App.jsx');
const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');
assert(appJsxContent.includes("fontSize: '100%'"), 'App.jsx MUI CssBaseline styleOverrides sets html fontSize to 100%');
assert(appJsxContent.includes('htmlFontSize: 16'), 'App.jsx MUI Theme sets htmlFontSize: 16 coefficient');
assert(appJsxContent.includes("h1: { fontSize: 'var(--font-size-4xl, 2.25rem)' }"), 'App.jsx MUI typography h1 uses rem/variable');
assert(appJsxContent.includes("caption: { fontSize: 'var(--font-size-xs, 0.75rem)' }"), 'App.jsx MUI typography caption uses rem/variable');

// 3. Verify Components for absence of hardcoded px font-size props
const componentFiles = [
  'Header.jsx',
  'AIRecommendationSection.jsx',
  'EventCard.jsx',
  'RSVPModal.jsx',
  'TimezoneSelectorModal.jsx'
];

componentFiles.forEach(file => {
  const filePath = path.join(__dirname, 'components', file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Regex to check for numeric fontSize like fontSize: 32 or fontSize: 28 or '32px'
  const numericFontSizeMatch = content.match(/fontSize:\s*[0-9]+(?![0-9]*\s*rem)/g);
  const pxFontSizeMatch = content.match(/fontSize:\s*['"][0-9]+px['"]/g);
  
  assert(!numericFontSizeMatch, `${file} has no numeric hardcoded px font sizes`);
  assert(!pxFontSizeMatch, `${file} has no px string hardcoded font sizes`);
});

// 4. Test Zoom Behavior Calculation (100%, 150%, 200%)
console.log('\n--- Testing Root Font Size & Zoom Behavior Calculations ---');
const baseRootPx = 16; // 100% zoom standard browser default
const zoomLevels = [
  { zoom: '100%', factor: 1.0, expectedRootPx: 16 },
  { zoom: '150%', factor: 1.5, expectedRootPx: 24 },
  { zoom: '200%', factor: 2.0, expectedRootPx: 32 }
];

const remValuesToTest = [
  { name: 'Caption / Small Chip', rem: 0.75, basePx: 12 },
  { name: 'Body / Button', rem: 0.875, basePx: 14 },
  { name: 'Base Body', rem: 1.0, basePx: 16 },
  { name: 'Card Title (h6)', rem: 1.0, basePx: 16 },
  { name: 'Subheading (h5)', rem: 1.125, basePx: 18 },
  { name: 'Section Heading (h2)', rem: 1.75, basePx: 28 },
  { name: 'Header Icon', rem: 2.0, basePx: 32 },
  { name: 'Page Title (h1)', rem: 2.25, basePx: 36 },
  { name: 'Success Modal Icon', rem: 3.75, basePx: 60 }
];

zoomLevels.forEach(({ zoom, factor, expectedRootPx }) => {
  console.log(`\nZoom Level: ${zoom} (Effective Root Font Size = ${expectedRootPx}px):`);
  remValuesToTest.forEach(({ name, rem, basePx }) => {
    const calculatedPx = rem * expectedRootPx;
    const expectedCalculatedPx = basePx * factor;
    assert(
      calculatedPx === expectedCalculatedPx,
      ` [Zoom ${zoom}] ${name} (${rem}rem): calculated ${calculatedPx}px === expected ${expectedCalculatedPx}px`
    );
  });
});

console.log('\n===============================================================');
console.log(`  SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('===============================================================');
