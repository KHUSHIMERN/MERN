/**
 * Test Suite: Feature 5 — Smart Calendar and Reminders
 * Validates:
 * - Fetching calendar events for interactive monthly/weekly display
 * - In-app reminder creation and notification delivery
 * - Email reminder dispatch (with simulated status if SMTP not configured)
 * - Automated upcoming event reminder batch trigger
 * - Error validation on missing parameters
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

async function runCalendarTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' 📅  Feature 5 — Smart Calendar & Reminders Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const app = require('../app');
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  testPort = server.address().port;
  console.log(`🚀 Ephemeral server listening on port ${testPort}\n`);

  try {
    // ─── Test 1: Fetch Calendar Events ─────────────────────────────────────
    console.log('🗓️  Test 1: Fetch Calendar Formatted Events');
    const res1 = await httpReq('GET', '/api/reminders/calendar-events');

    ok(res1.status === 200, `HTTP status is 200 (got ${res1.status})`);
    ok(res1.body.success === true, 'Response success is true');
    ok(Array.isArray(res1.body.events) && res1.body.events.length > 0, `Events array returned (count: ${res1.body.count})`);

    const sample = res1.body.events[0];
    ok(sample.id !== undefined, 'Calendar event has id');
    ok(sample.title !== undefined, 'Calendar event has title');
    ok(sample.startDate !== undefined, 'Calendar event has startDate');
    ok(sample.color !== undefined, 'Calendar event has category color code');
    ok(sample.rsvpStatus !== undefined, 'Calendar event includes rsvpStatus');

    // ─── Test 2: In-App Reminder Dispatch ──────────────────────────────────
    console.log('\n🔔 Test 2: Send In-App Reminder');
    const res2 = await httpReq('POST', '/api/reminders/send', {
      eventId: 'evt-1',
      userId: 'test-user-101',
      channel: 'in-app',
    });

    ok(res2.status === 200, `HTTP status is 200 (got ${res2.status})`);
    ok(res2.body.success === true, 'Reminder dispatch returned success');
    ok(res2.body.data.deliveredInApp === true, 'In-app reminder was delivered');
    ok(res2.body.data.inAppNotificationId !== undefined, 'In-app notification ID generated');
    ok(res2.body.data.eventTitle.includes('Tech Summit'), 'Reminder cites correct event title');

    // ─── Test 3: Email Reminder Dispatch ───────────────────────────────────
    console.log('\n📧 Test 3: Send Email Reminder (with clear SMTP status)');
    const res3 = await httpReq('POST', '/api/reminders/send', {
      eventId: 'evt-1',
      userId: 'test-user-101',
      userEmail: 'attendee@example.com',
      channel: 'email',
    });

    ok(res3.status === 200, 'HTTP status is 200');
    ok(res3.body.data.deliveredEmail === true, 'Email reminder was processed');
    ok(typeof res3.body.data.emailStatus === 'string', `Email status provided: "${res3.body.data.emailStatus}"`);

    // ─── Test 4: Both Channels Reminder Dispatch ───────────────────────────
    console.log('\n📬 Test 4: Send Multi-Channel Reminder (both in-app & email)');
    const res4 = await httpReq('POST', '/api/reminders/send', {
      eventId: 'evt-3',
      userId: 'test-user-101',
      userEmail: 'developer@example.com',
      channel: 'both',
    });

    ok(res4.status === 200, 'Multi-channel reminder returns 200');
    ok(res4.body.data.deliveredInApp === true, 'In-app delivery succeeded');
    ok(res4.body.data.deliveredEmail === true, 'Email delivery succeeded');

    // ─── Test 5: Automated Batch Reminders Trigger Check ──────────────────
    console.log('\n⏰ Test 5: Automated Upcoming Event Reminder Batch Check');
    const res5 = await httpReq('POST', '/api/reminders/trigger-check', {
      hoursAhead: 72,
    });

    ok(res5.status === 200, 'Automated trigger returns 200');
    ok(res5.body.success === true, 'Trigger execution was successful');
    ok(typeof res5.body.data.scannedEvents === 'number', 'Reports scanned events count');
    ok(typeof res5.body.data.sentReminders === 'number', 'Reports sent reminders count');

    // ─── Test 6: Parameter Validation ──────────────────────────────────────
    console.log('\n⚠️ Test 6: Missing eventId Validation');
    const res6 = await httpReq('POST', '/api/reminders/send', {
      channel: 'in-app',
    });

    ok(res6.status === 400, `Missing eventId returns 400 (got ${res6.status})`);
    ok(res6.body.success === false, 'success is false');

  } finally {
    server.close();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runCalendarTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
