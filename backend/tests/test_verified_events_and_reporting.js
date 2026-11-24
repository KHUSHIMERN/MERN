/**
 * Test Suite: Feature 9 — Verified Events and Reporting
 * Validates:
 * - Submitting user reports for suspicious or inappropriate events
 * - Preventing duplicate active reports by the same user for the same event
 * - Validation on report category reasons (spam, inappropriate, misleading, etc.)
 * - Error handling for non-existent events
 * - Checking user report status (/my-report)
 * - Role-based access control (RBAC): Resident blocked from admin report endpoints (403 Forbidden)
 * - Admin retrieving paginated reported events list
 * - Admin resolving reports (dismiss, unverify, unpublish) with notes
 * - Admin viewing pending event approval queue
 * - Admin approving and rejecting event verification workflows
 */

'use strict';

const http = require('http');
const jwt = require('jsonwebtoken');

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
const JWT_SECRET = process.env.JWT_SECRET || 'communityconnect_secret_key_2026';

// Helper to generate test JWT tokens
function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const residentToken = makeToken({
  id: 'user-resident-101',
  name: 'Meera Iyer',
  email: 'meera.i@example.com',
  role: 'resident',
  isVerified: true,
});

const adminToken = makeToken({
  id: 'admin-super-999',
  name: 'Platform Super Admin',
  email: 'admin@eventpulse.org',
  role: 'admin',
  isVerified: true,
});

function httpReq(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
    };
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
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

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' 🛡️  Feature 9 — Verified Events & Reporting Test Suite');
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
    let createdReportId = null;

    // -------------------------------------------------------------------------
    // Test 1: Resident Submits a Valid Report on an Event
    // -------------------------------------------------------------------------
    console.log('🚩 Test 1: Submit Event Report (Resident user)');
    {
      const payload = {
        reason: 'misleading',
        details: 'The venue address listed is an abandoned warehouse instead of the registered auditorium.',
      };

      const res = await httpReq('POST', '/api/events/evt-1/report', payload, residentToken);
      ok(res.status === 201, `HTTP status is 201 Created (got ${res.status})`);
      ok(res.body.success === true, 'Response success is true');
      ok(Boolean(res.body.report), 'Created report object returned');
      ok(res.body.report.reason === 'misleading', 'Report reason matches input');
      ok(res.body.report.status === 'pending', 'Initial report status is pending');
      ok(res.body.report.reporterName === 'Meera Iyer', 'Reporter name recorded');
      createdReportId = res.body.report._id || res.body.report.id;
    }

    // -------------------------------------------------------------------------
    // Test 2: Duplicate Report Prevention
    // -------------------------------------------------------------------------
    console.log('\n🔒 Test 2: Prevent Duplicate Reports from Same User');
    {
      const duplicatePayload = {
        reason: 'spam',
        details: 'Trying to report again immediately.',
      };

      const res = await httpReq('POST', '/api/events/evt-1/report', duplicatePayload, residentToken);
      ok(res.status === 409, `HTTP status is 409 Conflict (got ${res.status})`);
      ok(res.body.isDuplicate === true, 'isDuplicate flag is true');
      ok(res.body.success === false, 'success is false');
    }

    // -------------------------------------------------------------------------
    // Test 3: Input Validation & Error Handling
    // -------------------------------------------------------------------------
    console.log('\n⚠️  Test 3: Input Validation (Invalid reason, Non-existent event, Unauthenticated)');
    {
      // Missing reason
      const resMissing = await httpReq('POST', '/api/events/evt-1/report', { details: 'No reason' }, residentToken);
      ok(resMissing.status === 400, 'Missing reason returns 400');
      ok(resMissing.body.success === false, 'Missing reason success is false');

      // Invalid reason enum
      const resInvalid = await httpReq('POST', '/api/events/evt-1/report', { reason: 'not_a_reason' }, residentToken);
      ok(resInvalid.status === 400, 'Invalid enum reason returns 400');

      // Non-existent event ID
      const resNotFound = await httpReq('POST', '/api/events/evt-does-not-exist/report', { reason: 'spam' }, residentToken);
      ok(resNotFound.status === 404, 'Non-existent event returns 404');

      // Unauthenticated report attempt
      const resUnauth = await httpReq('POST', '/api/events/evt-1/report', { reason: 'spam' });
      ok(resUnauth.status === 401, 'Unauthenticated report returns 401');
    }

    // -------------------------------------------------------------------------
    // Test 4: Check User's Existing Report Status (/my-report)
    // -------------------------------------------------------------------------
    console.log('\n🔍 Test 4: Check User Report Status (/my-report)');
    {
      const res = await httpReq('GET', '/api/events/evt-1/my-report', null, residentToken);
      ok(res.status === 200, 'Status is 200');
      ok(res.body.hasReported === true, 'hasReported is true for resident who submitted report');
      ok(res.body.report.reason === 'misleading', 'Returns user existing report details');

      // Another user has not reported
      const otherToken = makeToken({ id: 'user-resident-other', role: 'resident', isVerified: true });
      const resOther = await httpReq('GET', '/api/events/evt-1/my-report', null, otherToken);
      ok(resOther.body.hasReported === false, 'hasReported is false for user with no prior report');
    }

    // -------------------------------------------------------------------------
    // Test 5: Role-Based Access Control (Admin routes restricted)
    // -------------------------------------------------------------------------
    console.log('\n⛔ Test 5: Role-Based Access Control (Non-Admin Blocked)');
    {
      const res = await httpReq('GET', '/api/admin/reports', null, residentToken);
      ok(res.status === 403, `Resident receives 403 Forbidden on admin endpoint (got ${res.status})`);
    }

    // -------------------------------------------------------------------------
    // Test 6: Admin Retrieves Reports Queue
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 6: Admin View Reports Queue');
    {
      const res = await httpReq('GET', '/api/admin/reports?status=pending', null, adminToken);
      ok(res.status === 200, `Admin receives 200 OK (got ${res.status})`);
      ok(res.body.success === true, 'Admin response success is true');
      ok(Array.isArray(res.body.reports), 'Reports is an array');
      ok(res.body.total >= 1, `Total pending reports count is >= 1 (got ${res.body.total})`);

      const found = res.body.reports.find((r) => String(r._id) === String(createdReportId) || String(r.id) === String(createdReportId));
      ok(Boolean(found), 'Newly created resident report is present in admin queue');
    }

    // -------------------------------------------------------------------------
    // Test 7: Admin Resolves a Report (Action: unverify / safety action)
    // -------------------------------------------------------------------------
    console.log('\n⚖️  Test 7: Admin Resolves Report with Action Taken');
    {
      const resolvePayload = {
        status: 'action_taken',
        action: 'unverify',
        adminNotes: 'Confirmed address mismatch with venue authorities. Unverifying event.',
      };

      const res = await httpReq('PATCH', `/api/admin/reports/${createdReportId}`, resolvePayload, adminToken);
      ok(res.status === 200, `Admin resolution returns 200 (got ${res.status})`);
      ok(res.body.success === true, 'Resolution success is true');
      ok(res.body.report.status === 'action_taken', 'Report status updated to action_taken');
      ok(res.body.report.actionTaken === 'unverify', 'actionTaken matches unverify');
      ok(res.body.report.adminNotes.includes('Confirmed address mismatch'), 'Admin notes recorded');
    }

    // -------------------------------------------------------------------------
    // Test 8: Admin Retrieves Pending Events Verification Queue
    // -------------------------------------------------------------------------
    console.log('\n⏳ Test 8: Admin Pending Events Queue');
    {
      const res = await httpReq('GET', '/api/admin/events/pending', null, adminToken);
      ok(res.status === 200, 'GET /api/admin/events/pending returns 200');
      ok(res.body.success === true, 'Success is true');
      ok(Array.isArray(res.body.events), 'Events is an array');
      const pendingEvt = res.body.events.find((e) => e.id === 'evt-pending-1' || e.verificationStatus === 'pending');
      ok(Boolean(pendingEvt), 'Pending event (evt-pending-1) is found in approval queue');
    }

    // -------------------------------------------------------------------------
    // Test 9: Admin Approves Event Verification
    // -------------------------------------------------------------------------
    console.log('\n✅ Test 9: Admin Approves Event Verification');
    {
      const verifyPayload = {
        verificationStatus: 'verified',
        adminNotes: 'Organizer submitted verified municipal permit.',
      };

      const res = await httpReq('PATCH', '/api/admin/events/evt-pending-1/verify', verifyPayload, adminToken);
      ok(res.status === 200, `HTTP status is 200 (got ${res.status})`);
      ok(res.body.success === true, 'Verification success is true');
      ok(res.body.event.verificationStatus === 'verified', 'Event status updated to verified');
      ok(res.body.event.isVerified === true, 'Event isVerified set to true');
    }

    // -------------------------------------------------------------------------
    // Test 10: Admin Rejects Event Verification
    // -------------------------------------------------------------------------
    console.log('\n❌ Test 10: Admin Rejects Event Verification');
    {
      const rejectPayload = {
        verificationStatus: 'rejected',
        adminNotes: 'Incomplete organizer documentation and missing venue confirmation.',
      };

      const res = await httpReq('PATCH', '/api/admin/events/evt-pending-1/verify', rejectPayload, adminToken);
      ok(res.status === 200, 'Reject verification returns 200');
      ok(res.body.event.verificationStatus === 'rejected', 'verificationStatus set to rejected');
      ok(res.body.event.isVerified === false, 'isVerified set to false');
      ok(res.body.event.published === false, 'Event is unpublished upon rejection');
    }

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

run();
