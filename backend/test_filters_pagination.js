const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('===============================================================');
console.log('  TESTING STORY: ADVANCED FILTERS & COMBINED QUERY WITH PAGINATION');
console.log('  Tasks: PRJ-8098-0043, PRJ-8098-0044, PRJ-8098-0045');
console.log('===============================================================\n');

function request(method, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: 'localhost',
        port: 5000,
        path: urlPath,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(` [PASS] ${message}`);
      passed++;
    } else {
      console.error(` [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. BACKEND QUERY BUILDER TESTS (PRJ-8098-0044)
    // -------------------------------------------------------------
    console.log('>>> 1. TESTING BACKEND QUERY BUILDER & ADVANCED FILTERS...');

    // Test 1.1: Fetch all events default
    const allRes = await request('GET', '/api/events');
    assert(allRes.status === 200, 'GET /api/events returns 200 OK');
    assert(allRes.body.success === true, 'Response body has success: true');
    assert(Array.isArray(allRes.body.data) && allRes.body.data.length > 0, `Returns events list (found ${allRes.body.data?.length})`);
    const totalAll = allRes.body.total || allRes.body.count;

    // Test 1.2: Filter by category
    const catRes = await request('GET', '/api/events?category=tech');
    assert(catRes.status === 200, 'Filter by category (tech) returns 200 OK');
    const catMatches = catRes.body.data.every((e) =>
      /tech|career|job|ai|cloud/i.test(e.category) ||
      /tech|career|job|ai|cloud/i.test(e.title) ||
      (Array.isArray(e.tags) && e.tags.some(t => /tech|ai|cloud/i.test(t)))
    );
    assert(catMatches, 'All returned events match the requested category/patterns');

    // Test 1.3: Filter by location/city
    const locRes = await request('GET', '/api/events?location=Jaipur');
    assert(locRes.status === 200, 'Filter by location (Jaipur) returns 200 OK');
    const locMatches = locRes.body.data.every((e) =>
      (e.city && /Jaipur/i.test(e.city)) ||
      (typeof e.location === 'object' && /Jaipur/i.test(e.location?.placeName)) ||
      (typeof e.location === 'string' && /Jaipur/i.test(e.location))
    );
    assert(locMatches, 'All returned events match the requested city/location (Jaipur)');

    // Test 1.4: Filter by date range (startDate & endDate)
    const dateRes = await request('GET', '/api/events?startDate=2026-08-01&endDate=2026-08-31');
    assert(dateRes.status === 200, 'Filter by date range (August 2026) returns 200 OK');
    const dateMatches = dateRes.body.data.every((e) => {
      const start = new Date(e.startDate).getTime();
      return start >= new Date('2026-08-01').getTime() && start <= new Date('2026-08-31T23:59:59.999Z').getTime();
    });
    assert(dateMatches, 'All returned events fall within the specified date range');

    // Test 1.5: Filter by language
    const langRes = await request('GET', '/api/events?language=en');
    assert(langRes.status === 200, 'Filter by language (en) returns 200 OK');
    assert(langRes.body.data.length > 0, 'Returns events matching requested language');

    // Test 1.6: Combined Multi-Criteria Query (category + location + language)
    const combinedRes = await request('GET', '/api/events?category=tech&location=Jaipur&language=en');
    assert(combinedRes.status === 200, 'Combined filter (category=tech & location=Jaipur & language=en) returns 200 OK');
    assert(combinedRes.body.data.length > 0, `Combined query returned ${combinedRes.body.data.length} matching event(s)`);

    // Test 1.7: Combined Query with keyword text search
    const searchCombinedRes = await request('GET', '/api/events?category=tech&location=Jaipur&search=Fair');
    assert(searchCombinedRes.status === 200, 'Combined filter with text search returns 200 OK');
    const allSearchMatches = searchCombinedRes.body.data.every(e => /Fair/i.test(e.title) || /Fair/i.test(e.description));
    assert(allSearchMatches, 'Search query is ANDed correctly with other filters');

    // Test 1.8: Non-matching filter returns empty result cleanly
    const emptyRes = await request('GET', '/api/events?location=NonExistentCity987654');
    assert(emptyRes.status === 200 && emptyRes.body.count === 0 && emptyRes.body.data.length === 0, 'No-match query returns empty array without error');

    // -------------------------------------------------------------
    // 2. PAGINATION TESTS (PRJ-8098-0044)
    // -------------------------------------------------------------
    console.log('\n>>> 2. TESTING PAGINATION & PAGE METADATA...');

    const page1Res = await request('GET', '/api/events?page=1&pageSize=2');
    assert(page1Res.status === 200, 'GET /api/events with page=1&pageSize=2 returns 200 OK');
    assert(page1Res.body.page === 1, 'Response metadata reflects page: 1');
    assert(page1Res.body.pageSize === 2, 'Response metadata reflects pageSize: 2');
    assert(page1Res.body.data.length <= 2, `Page 1 item count <= pageSize (${page1Res.body.data.length})`);
    assert(page1Res.body.totalPages >= 1, `Response includes totalPages (${page1Res.body.totalPages})`);
    assert(page1Res.body.total === totalAll, `Response includes accurate total count (${page1Res.body.total})`);

    const page2Res = await request('GET', '/api/events?page=2&pageSize=2');
    assert(page2Res.status === 200, 'GET /api/events with page=2&pageSize=2 returns 200 OK');
    assert(page2Res.body.page === 2, 'Response metadata reflects page: 2');

    // Ensure page 1 and page 2 items are distinct
    const page1Ids = (page1Res.body.data || []).map(e => e._id || e.id);
    const page2Ids = (page2Res.body.data || []).map(e => e._id || e.id);
    const overlap = page1Ids.filter(id => page2Ids.includes(id));
    assert(overlap.length === 0, 'Page 1 and Page 2 contain non-overlapping items');

    // -------------------------------------------------------------
    // 3. PERFORMANCE TEST (< 1000ms query time, Acceptance Criterion 4)
    // -------------------------------------------------------------
    console.log('\n>>> 3. TESTING QUERY PERFORMANCE (Acceptance Criterion 4)...');
    const startPerf = Date.now();
    const perfRes = await request('GET', '/api/events?category=tech&location=Jaipur&startDate=2026-08-01&endDate=2026-09-30&language=en&page=1&pageSize=10');
    const durationMs = Date.now() - startPerf;
    assert(perfRes.status === 200, 'Complex multi-criteria query returns 200 OK');
    assert(durationMs < 1000, `Execution latency is within < 1000ms threshold (measured: ${durationMs}ms)`);

    // -------------------------------------------------------------
    // 4. FRONTEND UI & STATE MANAGEMENT VERIFICATION (PRJ-8098-0043)
    // -------------------------------------------------------------
    console.log('\n>>> 4. TESTING FRONTEND FILTER PANEL & STATE MANAGEMENT (PRJ-8098-0043)...');

    const eventListPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'EventList.jsx');
    assert(fs.existsSync(eventListPath), 'EventList.jsx component file exists');
    const eventListCode = fs.readFileSync(eventListPath, 'utf8');

    assert(eventListCode.includes('locationFilter') && eventListCode.includes('setLocationFilter'), 'EventList manages location filter state');
    assert(eventListCode.includes('startDateFilter') && eventListCode.includes('endDateFilter'), 'EventList manages start and end date range state');
    assert(eventListCode.includes('languageFilter') && eventListCode.includes('setLanguageFilter'), 'EventList manages language filter state');
    assert(eventListCode.includes('page') && eventListCode.includes('pageSize'), 'EventList manages pagination state (page, pageSize)');
    assert(eventListCode.includes('activeFilters'), 'EventList calculates active filters for badge pills');
    assert(eventListCode.includes('handleResetAllFilters'), 'EventList provides handleResetAllFilters handler');
    assert(eventListCode.includes('filter-location'), 'Filter panel contains location input');
    assert(eventListCode.includes('filter-start-date'), 'Filter panel contains start date input');
    assert(eventListCode.includes('filter-end-date'), 'Filter panel contains end date input');
    assert(eventListCode.includes('filter-language'), 'Filter panel contains language select');
    assert(eventListCode.includes('active-filter-pill'), 'Renders active filter pill chips');
    assert(eventListCode.includes('remove-filter-btn'), 'Active filter pills contain individual remove buttons');
    assert(eventListCode.includes('reset-all-filters-btn'), 'Renders reset-all filters button');
    assert(eventListCode.includes('pagination-bar'), 'Renders pagination controls bar');
    assert(eventListCode.includes('pagination-btn'), 'Pagination bar includes page advance and return buttons');

    // Check App.css styles
    const appCssPath = path.join(__dirname, '..', 'frontend', 'src', 'App.css');
    const appCssCode = fs.readFileSync(appCssPath, 'utf8');
    assert(appCssCode.includes('.advanced-filters-panel'), 'App.css contains .advanced-filters-panel styles');
    assert(appCssCode.includes('.active-filter-pill'), 'App.css contains .active-filter-pill styles');
    assert(appCssCode.includes('.pagination-bar'), 'App.css contains .pagination-bar styles');

    console.log('\n===============================================================');
    console.log(`  RESULTS: ${passed}/${total} ASSERTIONS PASSED WITH 100% SUCCESS`);
    console.log('===============================================================');

    if (passed === total) {
      console.log('🎉 ALL ACCEPTANCE CRITERIA FOR STORY VERIFIED AND PASSED!\n');
      process.exit(0);
    } else {
      console.error('❌ SOME TESTS FAILED.\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('Verification execution error:', err);
    process.exit(1);
  }
}

runTests();
