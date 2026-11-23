/**
 * Test Suite: Feature 3 — Natural-Language Event Search
 * Validates free-form sentence parsing, extracting:
 * - Category (career, workshop, tech, culture, etc.)
 * - Location / City ("in my city", Patna, Bengaluru, Jaipur)
 * - Date / Timeframe ("this month", "this weekend")
 * - Price filter (free vs paid)
 * - Keywords
 */

'use strict';

const http = require('http');

let passed = 0;
let failed = 0;

function ok(cond, msg) {
  if (cond) {
    console.log(`  ✅  ${msg}`);
    passed++;
  } else {
    console.error(`  ❌  FAIL: ${msg}`);
    failed++;
  }
}

let testPort = 5000;

function httpReq(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    const opts = {
      hostname: 'localhost',
      port: testPort,
      path,
      method,
      headers: reqHeaders,
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (d) => (raw += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runNlSearchTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' 🔍  Feature 3 — Natural-Language Event Search Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const app = require('../app');
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  testPort = server.address().port;
  console.log(`🚀 Ephemeral server listening on port ${testPort}\n`);

  try {
    // ─── Test 1: User Prompt Primary Example ───────────────────────────────
    // "Free job fairs in my city this month."
    console.log('🎯 Test 1: Primary Example — "Free job fairs in my city this month"');
    const res1 = await httpReq('POST', '/api/ai/nl-search', {
      query: 'Free job fairs in my city this month',
      userLocation: 'Jaipur',
    });

    ok(res1.status === 200, `HTTP status is 200 (got ${res1.status})`);
    ok(res1.body.success === true, 'Response success is true');
    ok(res1.body.parsed.category === 'career', `Category extracted as career (got: ${res1.body.parsed.category})`);
    ok(res1.body.parsed.city === 'Jaipur', `City extracted as Jaipur (got: ${res1.body.parsed.city})`);
    ok(res1.body.parsed.isFree === true, 'isFree flag extracted as true');
    ok(res1.body.parsed.timeframe === 'this month', `Timeframe extracted as this month (got: ${res1.body.parsed.timeframe})`);
    ok(Array.isArray(res1.body.events) && res1.body.events.length > 0, `Matching events found (count: ${res1.body.count})`);
    
    const topEvent1 = res1.body.events[0];
    ok(
      topEvent1.title.toLowerCase().includes('job') || topEvent1.title.toLowerCase().includes('career') || topEvent1.category === 'career',
      `Top event matches career/job (got: "${topEvent1.title}")`
    );
    ok(topEvent1.matchScore > 0, `Top event has positive matchScore (${topEvent1.matchScore})`);
    ok(Array.isArray(topEvent1.matchReasons) && topEvent1.matchReasons.length > 0, 'Top event includes matchReasons list');
    ok(
      topEvent1.matchReasons.some((r) => r.toLowerCase().includes('free')),
      'Match reasons cites Free entry'
    );

    // ─── Test 2: Specific Location & Workshop Query ───────────────────────
    // "Coding workshops near Patna this weekend"
    console.log('\n💻 Test 2: Workshop & Timeframe — "Coding workshops near Patna this weekend"');
    const res2 = await httpReq('POST', '/api/ai/nl-search', {
      query: 'Coding workshops near Patna this weekend',
    });

    ok(res2.status === 200, `Status is 200 (got ${res2.status})`);
    ok(res2.body.parsed.category === 'workshop', `Category extracted as workshop (got: ${res2.body.parsed.category})`);
    ok(res2.body.parsed.city === 'Patna', `City extracted as Patna (got: ${res2.body.parsed.city})`);
    ok(res2.body.parsed.timeframe === 'this weekend', `Timeframe extracted as this weekend (got: ${res2.body.parsed.timeframe})`);
    ok(res2.body.events.length > 0, 'Matching events returned for Patna workshop');
    ok(
      res2.body.events.some((e) => (e.city || '').toLowerCase() === 'patna'),
      'Patna event present in search results'
    );

    // ─── Test 3: Cultural Festival Query ──────────────────────────────────
    console.log('\n🎭 Test 3: Cultural & Festival Search — "Folk music and dance festivals in Karnataka"');
    const res3 = await httpReq('POST', '/api/ai/nl-search', {
      query: 'Folk music and dance festivals in Karnataka',
    });

    ok(res3.status === 200, `Status is 200 (got ${res3.status})`);
    ok(res3.body.parsed.category === 'culture', `Category extracted as culture (got: ${res3.body.parsed.category})`);
    ok(res3.body.events.length > 0, 'Cultural events matched');
    ok(
      res3.body.events.some((e) => e.category === 'culture' || (e.title || '').toLowerCase().includes('folk')),
      'Folk culture festival included'
    );

    // ─── Test 4: Empty / Invalid Query Handling ────────────────────────────
    console.log('\n⚠️ Test 4: Empty query error handling');
    const res4 = await httpReq('POST', '/api/ai/nl-search', {
      query: '   ',
    });

    ok(res4.status === 400, `Empty query returns 400 (got ${res4.status})`);
    ok(res4.body.success === false, 'success is false for empty query');

  } finally {
    server.close();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runNlSearchTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
