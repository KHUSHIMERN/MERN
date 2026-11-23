/**
 * Test Suite: Feature 7 — Organizer Analytics Dashboard
 * Validates:
 * - Organizer event metrics calculation (Capacity, Confirmed, Waitlist, Checked-In, No-Show)
 * - Conversion and attendance rate percentage computation
 * - High-level summary metrics aggregation (Total Capacity, Registrations, Check-ins, Attendance Rate)
 * - Date range filtering for event metrics
 * - Limit parameter handling
 * - CSV export format with correct headers and sanitized fields
 * - Handling of non-existent organizers
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
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' 📊  Feature 7 — Organizer Analytics Dashboard Test Suite');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const app = require('../app');
  const server = http.createServer(app);
  await new Promise((res) => {
    server.listen(0, () => {
      testPort = server.address().port;
      console.log(`🚀 Ephemeral server listening on port ${testPort}\n`);
      res();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // Test 1: Fetch Organizer Attendance Metrics
    // -------------------------------------------------------------------------
    console.log('📈 Test 1: Fetch Organizer Attendance Metrics (org-tech-hub)');
    {
      const res = await httpReq('GET', '/api/events/organizer/org-tech-hub/attendance-metrics');
      ok(res.status === 200, `HTTP status is 200 (got ${res.status})`);
      ok(res.body.success === true, 'Response success is true');
      ok(res.body.count === 2, `Count of events is 2 (got ${res.body.count})`);
      ok(Array.isArray(res.body.data), 'Data array returned');

      const evt1 = res.body.data.find((e) => e.eventId === 'evt-1' || e.id === 'evt-1');
      ok(evt1 !== undefined, 'evt-1 is present in metrics');
      ok(evt1.capacity === 100, `evt-1 capacity is 100 (got: ${evt1.capacity})`);
      ok(evt1.confirmed === 6, `evt-1 confirmed count is 6 (got: ${evt1.confirmed})`);
      ok(evt1.waitlist === 2, `evt-1 waitlist count is 2 (got: ${evt1.waitlist})`);
      ok(evt1.checkedIn === 3, `evt-1 checked-in count is 3 (got: ${evt1.checkedIn})`);
      ok(evt1.attendanceRate === 0.5, `evt-1 attendance rate is 0.5 (got: ${evt1.attendanceRate})`);
    }

    // -------------------------------------------------------------------------
    // Test 2: Aggregate Summary KPI Statistics
    // -------------------------------------------------------------------------
    console.log('\n📊 Test 2: Summary KPI Metrics');
    {
      const res = await httpReq('GET', '/api/events/organizer/org-tech-hub/attendance-metrics');
      const summary = res.body.summary;
      ok(typeof summary === 'object' && summary !== null, 'Summary object present in response');
      ok(summary.totalEvents === 2, `totalEvents is 2 (got: ${summary.totalEvents})`);
      ok(summary.totalCapacity === 200, `totalCapacity is 200 (got: ${summary.totalCapacity})`);
      ok(summary.totalRegistrations === 56, `totalRegistrations is 56 (got: ${summary.totalRegistrations})`);
      ok(summary.totalCheckedIn === 3, `totalCheckedIn is 3 (got: ${summary.totalCheckedIn})`);
      ok(summary.totalWaitlist === 2, `totalWaitlist is 2 (got: ${summary.totalWaitlist})`);
      ok(typeof summary.overallAttendanceRate === 'string', `overallAttendanceRate formatted string: ${summary.overallAttendanceRate}`);
      ok(typeof summary.capacityUtilization === 'string', `capacityUtilization formatted string: ${summary.capacityUtilization}`);
    }

    // -------------------------------------------------------------------------
    // Test 3: Date Range Filtering (September Events Only)
    // -------------------------------------------------------------------------
    console.log('\n📅 Test 3: Date Range Filtering (from 2026-09-01 onwards)');
    {
      const res = await httpReq(
        'GET',
        '/api/events/organizer/org-tech-hub/attendance-metrics?startDate=2026-09-01T00:00:00.000Z'
      );
      ok(res.status === 200, 'Status is 200');
      ok(res.body.count === 1, `Filtered to 1 event starting after September (got: ${res.body.count})`);
      ok(res.body.data[0].eventId === 'evt-5', `Returned event is evt-5 (got: ${res.body.data[0].eventId})`);
    }

    // -------------------------------------------------------------------------
    // Test 4: Limit Parameter
    // -------------------------------------------------------------------------
    console.log('\n🔢 Test 4: Limit Parameter (limit=1)');
    {
      const res = await httpReq('GET', '/api/events/organizer/org-tech-hub/attendance-metrics?limit=1');
      ok(res.status === 200, 'Status is 200');
      ok(res.body.data.length === 1, `Returned exactly 1 record with limit=1 (got: ${res.body.data.length})`);
    }

    // -------------------------------------------------------------------------
    // Test 5: CSV Export Endpoint
    // -------------------------------------------------------------------------
    console.log('\n📄 Test 5: CSV Attendance Report Export');
    {
      const res = await httpReq(
        'GET',
        '/api/events/organizer/org-tech-hub/attendance-metrics/export'
      );
      ok(res.status === 200, `HTTP status is 200 (got ${res.status})`);
      const contentType = res.headers['content-type'] || '';
      ok(contentType.includes('text/csv'), `Content-Type is text/csv (got: ${contentType})`);
      ok(typeof res.body === 'string', 'Response body is text/csv string');

      const lines = res.body.trim().split('\n');
      ok(lines.length >= 3, `CSV has header plus data rows (line count: ${lines.length})`);

      const header = lines[0];
      ok(
        header.includes('Event ID') &&
        header.includes('Event Title') &&
        header.includes('Capacity') &&
        header.includes('Confirmed') &&
        header.includes('Waitlist') &&
        header.includes('Checked-In') &&
        header.includes('Attendance Rate'),
        'CSV header contains all expected metric columns'
      );

      // Verify row values
      ok(res.body.includes('"evt-1"'), 'CSV data row contains evt-1');
      ok(res.body.includes('"Tech Summit Bengaluru 2026"'), 'CSV data row contains event title');
      ok(res.body.includes('"evt-5"'), 'CSV data row contains evt-5');
    }

    // -------------------------------------------------------------------------
    // Test 6: Non-Existent Organizer Handling
    // -------------------------------------------------------------------------
    console.log('\n🔍 Test 6: Non-Existent Organizer Query');
    {
      const res = await httpReq(
        'GET',
        '/api/events/organizer/org-non-existent-12345/attendance-metrics'
      );
      ok(res.status === 200, 'Status is 200');
      ok(res.body.success === true, 'Success is true');
      ok(res.body.count === 0, 'Count is 0');
      ok(res.body.data.length === 0, 'Data is empty array');
      ok(res.body.summary.totalRegistrations === 0, 'Total registrations is 0');
    }

  } catch (err) {
    console.error('Test Suite Error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
