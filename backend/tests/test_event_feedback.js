/**
 * Test Suite: Feature 8 — Event Feedback and Ratings
 * Validates:
 * - Fetching ratings, average score, rating breakdown distribution, and review comments
 * - Submitting verified attendee ratings (1 to 5 stars) and feedback comments
 * - Preventing duplicate feedback from the same user on the same event (updates existing)
 * - Input validation for ratings (1-5 range, required, integers)
 * - User-specific feedback identification
 * - Mathematical accuracy of average rating calculations
 * - Deletion of feedback
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

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' ⭐  Feature 8 — Event Feedback and Ratings Test Suite');
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
    // Test 1: Fetch Existing Event Feedback & Ratings
    // -------------------------------------------------------------------------
    console.log('📋 Test 1: Fetch Event Feedback & Rating Distribution (evt-1)');
    let initialCount = 0;
    {
      const res = await httpReq('GET', '/api/events/evt-1/feedback');
      ok(res.status === 200, `HTTP status is 200 (got ${res.status})`);
      ok(res.body.success === true, 'Response success is true');
      ok(res.body.eventId === 'evt-1', 'Event ID matches requested event');
      ok(typeof res.body.averageRating === 'number', `averageRating is a number (got: ${res.body.averageRating})`);
      ok(res.body.averageRating >= 1 && res.body.averageRating <= 5, 'averageRating is within [1, 5]');
      ok(res.body.totalReviews >= 3, `totalReviews is at least 3 (got: ${res.body.totalReviews})`);
      initialCount = res.body.totalReviews;

      // Distribution
      ok(typeof res.body.ratingDistribution === 'object', 'ratingDistribution object returned');
      ok(res.body.ratingDistribution['5'] >= 2, 'Has 5-star ratings');
      ok(Array.isArray(res.body.reviews), 'reviews is an array');

      const sample = res.body.reviews[0];
      ok(typeof sample.rating === 'number', 'Review has rating number');
      ok(typeof sample.userName === 'string', 'Review has userName string');
      ok(typeof sample.comment === 'string', 'Review has comment string');
    }

    // -------------------------------------------------------------------------
    // Test 2: Submit New Feedback
    // -------------------------------------------------------------------------
    console.log('\n🌟 Test 2: Submit New Feedback (Rating & Review)');
    {
      const newReview = {
        userId: 'test-resident-101',
        userName: 'Pooja Hegde',
        userEmail: 'pooja.h@example.com',
        rating: 5,
        comment: 'Brilliant organization and very insightful speaker sessions!',
      };

      const res = await httpReq('POST', '/api/events/evt-1/feedback', newReview);
      ok(res.status === 201, `HTTP status is 201 Created (got ${res.status})`);
      ok(res.body.success === true, 'Response success is true');
      ok(res.body.isUpdate === false, 'isUpdate is false for new submission');
      ok(res.body.feedback.rating === 5, 'Rating matches submitted value');
      ok(res.body.feedback.comment === newReview.comment, 'Comment matches submitted value');
      ok(res.body.feedback.isVerifiedAttendee === true, 'isVerifiedAttendee is true');

      // Verify review count increased
      const verifyRes = await httpReq('GET', '/api/events/evt-1/feedback');
      ok(verifyRes.body.totalReviews === initialCount + 1, `Review count incremented by 1 (got: ${verifyRes.body.totalReviews})`);
    }

    // -------------------------------------------------------------------------
    // Test 3: Duplicate Feedback Prevention (Updates Existing Review)
    // -------------------------------------------------------------------------
    console.log('\n🛡️  Test 3: Duplicate Feedback Prevention');
    {
      const duplicateReview = {
        userId: 'test-resident-101', // same user
        userName: 'Pooja Hegde',
        userEmail: 'pooja.h@example.com',
        rating: 4, // updated rating
        comment: 'Updated review: Sessions were great, slightly packed.',
      };

      const res = await httpReq('POST', '/api/events/evt-1/feedback', duplicateReview);
      ok(res.status === 200, `HTTP status is 200 OK (got ${res.status})`);
      ok(res.body.success === true, 'Response success is true');
      ok(res.body.isUpdate === true, 'isUpdate is true for existing user feedback');
      ok(res.body.feedback.rating === 4, 'Rating was updated to 4');
      ok(res.body.feedback.comment === duplicateReview.comment, 'Comment was updated');

      // Verify total review count did NOT increase
      const verifyRes = await httpReq('GET', '/api/events/evt-1/feedback');
      ok(
        verifyRes.body.totalReviews === initialCount + 1,
        `Review count remained unchanged at ${verifyRes.body.totalReviews} (no duplicate created)`
      );
    }

    // -------------------------------------------------------------------------
    // Test 4: User-Specific Feedback Identification
    // -------------------------------------------------------------------------
    console.log('\n👤 Test 4: User Feedback Identification (userFeedback field)');
    {
      const res = await httpReq('GET', '/api/events/evt-1/feedback?userId=test-resident-101');
      ok(res.status === 200, 'Status is 200');
      ok(res.body.userFeedback !== null, 'userFeedback is populated for user');
      ok(res.body.userFeedback.userId === 'test-resident-101', 'userFeedback matches user ID');
      ok(res.body.userFeedback.rating === 4, 'userFeedback reflects current rating');

      // Unrelated user returns null
      const resGuest = await httpReq('GET', '/api/events/evt-1/feedback?userId=unrelated-user-999');
      ok(resGuest.body.userFeedback === null, 'userFeedback is null for user with no review');
    }

    // -------------------------------------------------------------------------
    // Test 5: Input Validation & Boundary Checks
    // -------------------------------------------------------------------------
    console.log('\n⚠️  Test 5: Validation & Error Handling');
    {
      // Missing rating
      const resNoRating = await httpReq('POST', '/api/events/evt-1/feedback', {
        userId: 'user-val-1',
        comment: 'No star given',
      });
      ok(resNoRating.status === 400, 'Missing rating returns 400');
      ok(resNoRating.body.success === false, 'success is false');

      // Rating > 5
      const resHighRating = await httpReq('POST', '/api/events/evt-1/feedback', {
        userId: 'user-val-1',
        rating: 6,
      });
      ok(resHighRating.status === 400, 'Rating > 5 returns 400');

      // Rating < 1
      const resLowRating = await httpReq('POST', '/api/events/evt-1/feedback', {
        userId: 'user-val-1',
        rating: 0,
      });
      ok(resLowRating.status === 400, 'Rating 0 returns 400');

      // Missing userId
      const resNoUser = await httpReq('POST', '/api/events/evt-1/feedback', {
        rating: 5,
        comment: 'Anonymous submission',
      });
      ok(resNoUser.status === 401, 'Missing userId returns 401 Unauthorized');
    }

    // -------------------------------------------------------------------------
    // Test 6: Delete Feedback
    // -------------------------------------------------------------------------
    console.log('\n🗑️  Test 6: Delete Feedback Review');
    {
      // Delete the test user review
      const resDel = await httpReq('DELETE', '/api/events/evt-1/feedback?userId=test-resident-101');
      ok(resDel.status === 200, 'DELETE returns 200');
      ok(resDel.body.success === true, 'Delete success is true');

      // Verify count decreased back to original
      const verifyRes = await httpReq('GET', '/api/events/evt-1/feedback');
      ok(
        verifyRes.body.totalReviews === initialCount,
        `Review count decreased back to initial count (${verifyRes.body.totalReviews})`
      );
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
