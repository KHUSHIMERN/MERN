/**
 * Test Suite: Voice AI Assistant (Feature 2)
 * Validates Speech-to-Text query interpretation, city extraction (Patna),
 * category filtering (workshops), date range parsing, voice responses,
 * and mandatory action confirmation before event registration.
 */

'use strict';

const http = require('http');
const assert = require('assert');

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

async function runVoiceAssistantTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' 🎙️  Feature 2 — Voice AI Assistant Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Boot in-process server for deterministic testing
  const app = require('../app');
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  testPort = server.address().port;
  console.log(`🚀 Ephemeral server listening on port ${testPort}\n`);

  try {
    // ─── Test 1: Speech-to-Text Event Search Query (Patna Coding Workshop) ───
    console.log('🔍 Test 1: Natural speech search — "Find coding workshops near Patna this weekend"');
    const res1 = await httpReq('POST', '/api/ai/voice-assistant', {
      query: 'Find coding workshops near Patna this weekend',
      language: 'en',
    });

    ok(res1.status === 200, `HTTP status is 200 (got ${res1.status})`);
    ok(res1.body.success === true, 'Response success is true');
    ok(res1.body.intent === 'search_events', `Intent parsed as search_events (got: ${res1.body.intent})`);
    ok(res1.body.parsed.city === 'Patna', `City extracted as Patna (got: ${res1.body.parsed.city})`);
    ok(res1.body.parsed.category === 'workshop', `Category extracted as workshop (got: ${res1.body.parsed.category})`);
    ok(res1.body.parsed.timeframe === 'this weekend', `Timeframe extracted as this weekend (got: ${res1.body.parsed.timeframe})`);
    ok(Array.isArray(res1.body.events) && res1.body.events.length > 0, 'Matching events returned');
    ok(
      res1.body.events.some((e) => (e.city || '').toLowerCase() === 'patna' || (e.title || '').toLowerCase().includes('patna')),
      'Patna event found in results'
    );
    ok(typeof res1.body.spokenResponse === 'string' && res1.body.spokenResponse.length > 0, 'Spoken voice response generated');
    ok(!res1.body.confirmationNeeded, 'No confirmation needed for search queries');

    // ─── Test 2: General Voice Query in Hindi ──────────────────────────────
    console.log('\n🇮🇳 Test 2: Hindi language voice search query');
    const res2 = await httpReq('POST', '/api/ai/voice-assistant', {
      query: 'बेंगलुरु में टेक इवेंट्स खोजें',
      language: 'hi',
    });

    ok(res2.status === 200, `Hindi query returned 200`);
    ok(res2.body.success === true, 'Hindi query success');
    ok(res2.body.spokenResponse && res2.body.spokenResponse.length > 0, `Hindi spoken response returned: "${res2.body.spokenResponse}"`);

    // ─── Test 3: Action Confirmation Before Registration ───────────────────
    console.log('\n🛡️ Test 3: Action Confirmation Guard — "Register me for Tech Summit Bengaluru"');
    const res3 = await httpReq('POST', '/api/ai/voice-assistant', {
      query: 'Register me for Tech Summit Bengaluru 2026',
      language: 'en',
      confirmed: false, // User has NOT confirmed yet
    });

    ok(res3.status === 200, 'Registration voice request returned 200');
    ok(res3.body.intent === 'register_event', 'Intent identified as register_event');
    ok(res3.body.confirmationNeeded === true, 'confirmationNeeded is TRUE before performing registration');
    ok(res3.body.actionRequired !== null, 'actionRequired payload is provided');
    ok(res3.body.actionRequired.type === 'CONFIRM_REGISTRATION', 'actionRequired.type is CONFIRM_REGISTRATION');
    ok(
      res3.body.spokenResponse.toLowerCase().includes('sure') || res3.body.spokenResponse.toLowerCase().includes('confirm'),
      `Spoken response asks for confirmation (got: "${res3.body.spokenResponse}")`
    );

    // ─── Test 4: Missing Query Error Handling ───────────────────────────────
    console.log('\n⚠️ Test 4: Invalid/Empty Voice Input handling');
    const res4 = await httpReq('POST', '/api/ai/voice-assistant', {
      query: '',
    });
    ok(res4.status === 400, `Empty transcript returned 400 Bad Request (got ${res4.status})`);
    ok(res4.body.success === false, 'success is false for empty query');

  } finally {
    server.close();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runVoiceAssistantTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
