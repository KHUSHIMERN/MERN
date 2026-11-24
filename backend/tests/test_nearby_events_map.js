/**
 * Test Suite: Feature 6 — Nearby Events Map
 * Validates:
 * - Fetching events with geographic coordinates for map display
 * - Haversine distance calculations and ordering (closest first)
 * - Radius-based distance filtering (e.g., 10km, 25km, 50km)
 * - City preset coordinate mapping (e.g., Bengaluru, Jaipur, Patna)
 * - Category filtering in conjunction with geospatial search
 * - Input validation (invalid lat/lng, negative radius)
 * - Zero result radius handling
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
  console.log(' 🗺️   Feature 6 — Nearby Events Map Test Suite');
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
    // Test 1: Fetch all events with coordinates for map display
    // -------------------------------------------------------------------------
    console.log('📍 Test 1: Fetch Mappable Events (No Center)');
    {
      const res = await httpReq('GET', '/api/events/nearby');
      ok(res.status === 200, `HTTP status is 200 (got ${res.status})`);
      ok(res.body.success === true, 'Response success is true');
      ok(Array.isArray(res.body.events), 'Events array returned');
      ok(res.body.count >= 10, `At least 10 events returned (got: ${res.body.count})`);
      ok(Array.isArray(res.body.cityPresets), 'City presets array provided');
      ok(res.body.cityPresets.some((c) => c.name === 'Bengaluru'), 'City presets include Bengaluru');

      const sample = res.body.events[0];
      ok(sample.coordinates !== undefined, 'Event has coordinates object');
      ok(typeof sample.coordinates.lat === 'number', 'Event latitude is a number');
      ok(typeof sample.coordinates.lng === 'number', 'Event longitude is a number');
    }

    // -------------------------------------------------------------------------
    // Test 2: Distance-based search around Bengaluru Center (12.9716, 77.5946)
    // -------------------------------------------------------------------------
    console.log('\n🧭 Test 2: Nearby Search around Bengaluru (Radius: 25 km)');
    {
      const res = await httpReq(
        'GET',
        '/api/events/nearby?lat=12.9716&lng=77.5946&radiusKm=25'
      );
      ok(res.status === 200, `HTTP status is 200 (got ${res.status})`);
      ok(res.body.success === true, 'Response success is true');
      ok(res.body.events.length > 0, `Returned nearby events (count: ${res.body.events.length})`);
      ok(res.body.radiusKm === 25, 'radiusKm is reported as 25');

      // Check sorting by distance ascending
      let isSorted = true;
      for (let i = 1; i < res.body.events.length; i++) {
        if (res.body.events[i].distanceKm < res.body.events[i - 1].distanceKm) {
          isSorted = false;
          break;
        }
      }
      ok(isSorted, 'Events are ordered in ascending distance (closest first)');

      // Top event should be Cubbon Park or MG Road (~0.5 - 1.5 km)
      const closest = res.body.events[0];
      ok(closest.distanceKm < 2.0, `Closest event is within 2 km (got: ${closest.distanceKm} km for "${closest.title}")`);
      ok(typeof closest.distanceFormatted === 'string', `distanceFormatted provided: "${closest.distanceFormatted}"`);

      // All returned events must be within 25 km
      const allWithinRadius = res.body.events.every((e) => e.distanceKm <= 25);
      ok(allWithinRadius, 'All returned events are <= 25 km');
    }

    // -------------------------------------------------------------------------
    // Test 3: Tight Radius Filter (Radius: 5 km)
    // -------------------------------------------------------------------------
    console.log('\n🎯 Test 3: Tight Radius Filter (Radius: 5 km vs 50 km)');
    {
      const resTight = await httpReq(
        'GET',
        '/api/events/nearby?lat=12.9716&lng=77.5946&radiusKm=5'
      );
      const resBroad = await httpReq(
        'GET',
        '/api/events/nearby?lat=12.9716&lng=77.5946&radiusKm=50'
      );
      ok(resTight.status === 200 && resBroad.status === 200, 'Both radius requests return 200');
      ok(
        resTight.body.count < resBroad.body.count,
        `Tight 5km count (${resTight.body.count}) is less than broad 50km count (${resBroad.body.count})`
      );

      // Verify distant events are excluded in 5km
      const titles5km = resTight.body.events.map((e) => e.title);
      ok(
        !titles5km.some((t) => t.includes('Whitefield') || t.includes('Nandi Hills')),
        'Distant events (>15 km) correctly excluded in 5 km radius'
      );
    }

    // -------------------------------------------------------------------------
    // Test 4: City Preset Geolocation Query
    // -------------------------------------------------------------------------
    console.log('\n🏙️  Test 4: City Preset Query (city=Jaipur)');
    {
      const res = await httpReq('GET', '/api/events/nearby?city=Jaipur&radiusKm=50');
      ok(res.status === 200, 'HTTP status is 200');
      ok(res.body.success === true, 'Success is true');
      ok(res.body.events.length >= 1, `Found Jaipur events (got: ${res.body.events.length})`);
      ok(
        res.body.events[0].title.includes('Jaipur'),
        `Jaipur Job Fair matched: "${res.body.events[0].title}"`
      );
      ok(res.body.center.lat === 26.9124, 'Center mapped to Jaipur preset latitude');
    }

    // -------------------------------------------------------------------------
    // Test 5: Category Filtering in Nearby Query
    // -------------------------------------------------------------------------
    console.log('\n🏷️  Test 5: Category Filter in Nearby Query (category=tech)');
    {
      const res = await httpReq(
        'GET',
        '/api/events/nearby?lat=12.9716&lng=77.5946&radiusKm=50&category=tech'
      );
      ok(res.status === 200, 'HTTP status is 200');
      ok(res.body.events.length > 0, 'Returned tech events');
      const allTech = res.body.events.every(
        (e) =>
          e.category.toLowerCase().includes('tech') ||
          e.title.toLowerCase().includes('tech') ||
          e.title.toLowerCase().includes('react') ||
          e.title.toLowerCase().includes('hackathon') ||
          e.title.toLowerCase().includes('startup')
      );
      ok(allTech, 'All events in result match tech category/tags');
    }

    // -------------------------------------------------------------------------
    // Test 6: Input Validation & Defensive Handling
    // -------------------------------------------------------------------------
    console.log('\n⚠️  Test 6: Validation & Error Handling');
    {
      // Missing lng when lat is given
      const resMissingLng = await httpReq('GET', '/api/events/nearby?lat=12.9716');
      ok(resMissingLng.status === 400, 'Missing lng returns 400');
      ok(resMissingLng.body.success === false, 'success is false');

      // Invalid latitude
      const resBadLat = await httpReq('GET', '/api/events/nearby?lat=120&lng=77.59');
      ok(resBadLat.status === 400, 'Latitude > 90 returns 400');

      // Negative radius
      const resNegRadius = await httpReq(
        'GET',
        '/api/events/nearby?lat=12.9716&lng=77.5946&radiusKm=-10'
      );
      ok(resNegRadius.status === 400, 'Negative radius returns 400');

      // Out-of-range remote location (zero results)
      const resRemote = await httpReq(
        'GET',
        '/api/events/nearby?lat=0&lng=80&radiusKm=10'
      );
      ok(resRemote.status === 200, 'Remote location returns 200');
      ok(resRemote.body.count === 0, 'Zero events returned for remote location');
      ok(resRemote.body.events.length === 0, 'events is an empty array');
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
