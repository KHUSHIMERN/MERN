/**
 * Test Suite: Feature 4 — AI Event Description Translation
 * Validates translating event descriptions into English, Hindi, and Kannada,
 * integrating with language switcher, and preserving the original description.
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

async function runTranslationTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' 🌐  Feature 4 — AI Event Description Translation Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const app = require('../app');
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  testPort = server.address().port;
  console.log(`🚀 Ephemeral server listening on port ${testPort}\n`);

  try {
    const sampleEnglishDesc = 'An annual tech summit gathering AI developers, startup founders, and cloud engineers.';

    // ─── Test 1: Translate to Hindi (hi) ──────────────────────────────────
    console.log('🇮🇳 Test 1: Translate Description to Hindi (hi)');
    const res1 = await httpReq('POST', '/api/ai/translate', {
      text: sampleEnglishDesc,
      targetLang: 'hi',
    });

    ok(res1.status === 200, `HTTP status is 200 (got ${res1.status})`);
    ok(res1.body.success === true, 'Response success is true');
    ok(res1.body.targetLanguage === 'hi', 'targetLanguage is hi');
    ok(res1.body.originalText === sampleEnglishDesc, 'Original description is preserved in originalText');
    ok(typeof res1.body.translatedText === 'string' && res1.body.translatedText.length > 0, 'Translated text returned');
    ok(res1.body.isOriginal === false, 'isOriginal is false for translated text');
    ok(
      /[\u0900-\u097F]/.test(res1.body.translatedText),
      'Translated text contains authentic Devanagari Hindi characters'
    );

    // ─── Test 2: Translate to Kannada (kn) ────────────────────────────────
    console.log('\n🟡 Test 2: Translate Description to Kannada (kn)');
    const res2 = await httpReq('POST', '/api/ai/translate', {
      text: sampleEnglishDesc,
      targetLang: 'kn',
    });

    ok(res2.status === 200, `HTTP status is 200 (got ${res2.status})`);
    ok(res2.body.success === true, 'Response success is true');
    ok(res2.body.targetLanguage === 'kn', 'targetLanguage is kn');
    ok(res2.body.originalText === sampleEnglishDesc, 'Original English text preserved');
    ok(
      /[\u0C80-\u0CFF]/.test(res2.body.translatedText),
      'Translated text contains authentic Kannada script characters'
    );

    // ─── Test 3: Translate to English (en) Preserves Exact Original ───────
    console.log('\n🇬🇧 Test 3: Target Language English (en) — Preserves Original');
    const res3 = await httpReq('POST', '/api/ai/translate', {
      text: sampleEnglishDesc,
      targetLang: 'en',
    });

    ok(res3.status === 200, 'HTTP status is 200');
    ok(res3.body.translatedText === sampleEnglishDesc, 'Translated text matches original English text exactly');
    ok(res3.body.isOriginal === true, 'isOriginal is true');

    // ─── Test 4: Translate by Event ID ─────────────────────────────────────
    console.log('\n🆔 Test 4: Translate by Event ID (evt-1)');
    const res4 = await httpReq('POST', '/api/ai/translate', {
      eventId: 'evt-1',
      targetLang: 'hi',
    });

    ok(res4.status === 200, 'HTTP status is 200');
    ok(res4.body.success === true, 'Success is true');
    ok(res4.body.originalText.length > 0, 'Original text fetched from event');
    ok(res4.body.translatedText.length > 0, 'Translated text returned for eventId');

    // ─── Test 5: Translation Caching ───────────────────────────────────────
    console.log('\n💾 Test 5: In-memory Translation Caching');
    const res5 = await httpReq('POST', '/api/ai/translate', {
      text: sampleEnglishDesc,
      targetLang: 'hi',
    });

    ok(res5.status === 200, 'Second request returns 200');
    ok(res5.body.cached === true, 'Cached flag is true on repeated translation');
    ok(res5.body.translatedText === res1.body.translatedText, 'Cached translation is identical');

    // ─── Test 6: Unsupported Language Error Handling ──────────────────────
    console.log('\n⚠️ Test 6: Unsupported Language Validation');
    const res6 = await httpReq('POST', '/api/ai/translate', {
      text: 'Sample description text',
      targetLang: 'fr', // French is not in [en, hi, kn]
    });

    ok(res6.status === 400, `Unsupported language returns 400 (got ${res6.status})`);
    ok(res6.body.success === false, 'success is false');

    // ─── Test 7: Empty Input Validation ───────────────────────────────────
    console.log('\n⚠️ Test 7: Missing Text and Event ID');
    const res7 = await httpReq('POST', '/api/ai/translate', {
      text: '',
      eventId: '',
      targetLang: 'hi',
    });

    ok(res7.status === 400, `Empty input returns 400 (got ${res7.status})`);
    ok(res7.body.success === false, 'success is false');

  } finally {
    server.close();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTranslationTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
