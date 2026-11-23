/**
 * Test Suite: Feature 10 — Volunteer and Skill Matching
 * Validates:
 * - Skill-based recommendation matching for workshops and volunteering opportunities
 * - Match score computation and matched skills identification
 * - Volunteering-only opportunity filtering (onlyVolunteering=true)
 * - Human-readable recommendation reasoning (whyRecommended)
 * - User registering as a volunteer for a community event
 * - Duplicate volunteer registration prevention
 * - Event volunteers list retrieval (/volunteers)
 * - User profile updates persisting skills and volunteering availability
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

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const coderToken = makeToken({
  id: 'user-dev-201',
  name: 'Devendra Joshi',
  email: 'devendra.j@example.com',
  role: 'resident',
  skills: ['Coding', 'Web Development', 'Teaching & Mentoring'],
  interests: ['Coding', 'AI & Cloud'],
  city: 'Bengaluru',
  isVerified: true,
});

const volunteerToken = makeToken({
  id: 'user-medic-202',
  name: 'Kavita Nair',
  email: 'kavita.n@example.com',
  role: 'resident',
  skills: ['First Aid', 'Crowd Management', 'Hospitality'],
  interests: ['Volunteering', 'Health & Wellness'],
  city: 'Mysuru',
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
      path: encodeURI(path),
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
  console.log(' 🤝 Feature 10 — Volunteer & Skill Matching Test Suite');
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
    // Test 1: Skill Matching for Tech & Coding Skills
    // -------------------------------------------------------------------------
    console.log('💻 Test 1: Recommend Events Matching Tech Skills (Coding & Web Dev)');
    {
      const res = await httpReq(
        'GET',
        '/api/volunteer/recommendations?skills=Coding,Web Development',
        null,
        coderToken
      );
      ok(res.status === 200, `HTTP status is 200 (got ${res.status})`);
      ok(res.body.success === true, 'Response success is true');
      ok(Array.isArray(res.body.matches), 'Matches array returned');
      ok(res.body.matches.length > 0, `Returned matches count: ${res.body.matches.length}`);

      const topMatch = res.body.matches[0];
      ok(topMatch.matchScore >= 75, `Top match score is high (got ${topMatch.matchScore}%)`);
      ok(Array.isArray(topMatch.matchedSkills), 'matchedSkills is an array');
      ok(
        topMatch.matchedSkills.length > 0,
        `Matched skills populated: ${topMatch.matchedSkills.join(', ')}`
      );
      ok(typeof topMatch.whyRecommended === 'string', 'whyRecommended string returned');
      ok(
        topMatch.whyRecommended.toLowerCase().includes('match'),
        'whyRecommended explains skill match'
      );
    }

    // -------------------------------------------------------------------------
    // Test 2: Filter by Volunteering-Only Opportunities
    // -------------------------------------------------------------------------
    console.log('\n🎗️  Test 2: Filter by Volunteering Opportunities Only');
    {
      const res = await httpReq(
        'GET',
        '/api/volunteer/recommendations?onlyVolunteering=true',
        null,
        volunteerToken
      );
      ok(res.status === 200, 'HTTP status is 200');
      ok(res.body.success === true, 'Success is true');
      ok(res.body.matches.length > 0, 'Volunteering matches returned');

      const allVolunteering = res.body.matches.every((m) => m.isVolunteerOpportunity === true);
      ok(allVolunteering, 'All returned items have isVolunteerOpportunity: true');
    }

    // -------------------------------------------------------------------------
    // Test 3: Match Against Cultural & First Aid Skills
    // -------------------------------------------------------------------------
    console.log('\n🩺 Test 3: Match Healthcare / Crowd Management Skills');
    {
      const res = await httpReq(
        'GET',
        '/api/volunteer/recommendations?skills=First Aid,Crowd Management',
        null,
        volunteerToken
      );
      ok(res.status === 200, 'Status is 200');
      const culturalMatch = res.body.matches.find(
        (m) => m.eventId === 'evt-2' || m.event.id === 'evt-2'
      );
      ok(Boolean(culturalMatch), 'evt-2 (Cultural Festival) found in matches');
      if (culturalMatch) {
        ok(culturalMatch.matchedSkills.includes('Crowd Management') || culturalMatch.matchedSkills.includes('First Aid'), 'Matched Crowd Management or First Aid skills');
        ok(culturalMatch.matchScore >= 75, `High match score for festival volunteer: ${culturalMatch.matchScore}%`);
      }
    }

    // -------------------------------------------------------------------------
    // Test 4: User Registers as a Volunteer for an Event
    // -------------------------------------------------------------------------
    console.log('\n🙋 Test 4: Register as a Volunteer for an Event');
    {
      const volunteerPayload = {
        roleName: 'Lead Workshop Mentor',
        notes: 'Experienced React developer available to assist students during lab sessions.',
      };

      const res = await httpReq('POST', '/api/events/evt-3/volunteer', volunteerPayload, coderToken);
      ok(res.status === 201, `HTTP status is 201 Created (got ${res.status})`);
      ok(res.body.success === true, 'Volunteer registration success is true');
      ok(Boolean(res.body.volunteer), 'Volunteer record returned');
      ok(res.body.volunteer.roleName === 'Lead Workshop Mentor', 'Role name matches submitted value');
      ok(res.body.volunteer.name === 'Devendra Joshi', 'Volunteer name recorded');
    }

    // -------------------------------------------------------------------------
    // Test 5: Prevent Duplicate Volunteer Signups
    // -------------------------------------------------------------------------
    console.log('\n🚫 Test 5: Prevent Duplicate Volunteer Signups for Same Event');
    {
      const duplicatePayload = {
        roleName: 'Assistant Mentor',
      };

      const res = await httpReq('POST', '/api/events/evt-3/volunteer', duplicatePayload, coderToken);
      ok(res.status === 409, `HTTP status is 409 Conflict (got ${res.status})`);
      ok(res.body.isDuplicate === true, 'isDuplicate flag is true');
      ok(res.body.success === false, 'success is false');
    }

    // -------------------------------------------------------------------------
    // Test 6: View Event Volunteers List (/volunteers)
    // -------------------------------------------------------------------------
    console.log('\n📋 Test 6: View Registered Volunteers for an Event');
    {
      const res = await httpReq('GET', '/api/events/evt-3/volunteers', null, coderToken);
      ok(res.status === 200, 'HTTP status is 200');
      ok(res.body.success === true, 'Success is true');
      ok(Array.isArray(res.body.volunteers), 'volunteers is an array');
      ok(res.body.count >= 1, `Volunteers count is at least 1 (got ${res.body.count})`);

      const registered = res.body.volunteers.find(
        (v) => v.name === 'Devendra Joshi' || v.email === 'devendra.j@example.com'
      );
      ok(Boolean(registered), 'Newly registered volunteer found in event volunteers list');
    }

    // -------------------------------------------------------------------------
    // Test 7: Profile Update with Skills and Volunteer Availability
    // -------------------------------------------------------------------------
    console.log('\n👤 Test 7: Update Profile Skills and Volunteering Availability');
    {
      const profileUpdate = {
        skills: ['Teaching & Mentoring', 'Public Speaking', 'Graphic Design'],
        isAvailableForVolunteering: true,
        volunteerBio: 'Passionate about mentoring young programmers in Tier 2 cities.',
      };

      const res = await httpReq('PUT', '/api/users/me', profileUpdate, coderToken);
      ok(res.status === 200, `HTTP status is 200 (got ${res.status})`);
      ok(res.body.user !== undefined, 'User object returned');
      ok(Array.isArray(res.body.user.skills), 'user.skills is an array');
      ok(res.body.user.skills.includes('Public Speaking'), 'Public Speaking added to user skills');
      ok(res.body.user.isAvailableForVolunteering === true, 'isAvailableForVolunteering is true');
    }

    // -------------------------------------------------------------------------
    // Test 8: Error Validation on Non-Existent Event Volunteer Signup
    // -------------------------------------------------------------------------
    console.log('\n⚠️  Test 8: Error Validation on Non-Existent Event');
    {
      const res = await httpReq('POST', '/api/events/evt-ghost-event/volunteer', {}, coderToken);
      ok(res.status === 404, `Non-existent event returns 404 (got ${res.status})`);
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
