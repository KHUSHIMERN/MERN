process.env.NODE_ENV = 'test';
import app from '../server.js';
import http from 'http';

const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`🚀 Starting Event API Integration Test Suite on ${baseUrl}...\n`);

  let testCount = 0;
  let passCount = 0;

  const assert = (condition, message) => {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  ✅ Test ${testCount}: ${message}`);
    } else {
      console.error(`  ❌ Test ${testCount} FAILED: ${message}`);
      throw new Error(`Assertion Failed: ${message}`);
    }
  };

  try {
    // 1. GET /api/events (Happy Path)
    const res1 = await fetch(`${baseUrl}/api/events`);
    const json1 = await res1.json();
    assert(res1.status === 200 && json1.success && Array.isArray(json1.data), 'GET /api/events returns 200 OK with event list');

    // 2. GET /api/events with Query Filtering (Happy Path)
    const res2 = await fetch(`${baseUrl}/api/events?category=tech&published=true`);
    const json2 = await res2.json();
    assert(res2.status === 200 && json2.data.every(e => e.category === 'tech' && Boolean(e.published) === true), 'GET /api/events?category=tech&published=true filters results accurately');

    // 3. GET /api/events/:id (Happy Path)
    const res3 = await fetch(`${baseUrl}/api/events/evt-1`);
    const json3 = await res3.json();
    assert(res3.status === 200 && json3.data.id === 'evt-1', 'GET /api/events/evt-1 returns single event record');

    // 4. GET /api/events/:id Non-Existent (Error Path -> 404)
    const res4 = await fetch(`${baseUrl}/api/events/non-existent-9999`);
    const json4 = await res4.json();
    assert(res4.status === 404 && json4.success === false, 'GET /api/events/invalid-id returns 404 Not Found');

    // 5. POST /api/events Valid Event Creation (Happy Path -> 201 Created)
    const newEvent = {
      title: 'DevOps & Kubernetes Workshop 2026',
      description: 'Hands-on practical session on microservices architecture and CI/CD pipelines.',
      organizerId: 'org-cloud-devs',
      category: 'workshop',
      tags: ['devops', 'kubernetes', 'docker', 'cloud'],
      startDate: '2026-11-20T09:00:00.000Z',
      endDate: '2026-11-20T17:00:00.000Z',
      location: { placeName: 'Electronic City Phase 1, Bengaluru', latitude: 12.84, longitude: 77.67 },
      published: true,
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d'
    };
    const res5 = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent)
    });
    const json5 = await res5.json();
    assert(res5.status === 201 && json5.success && json5.id, 'POST /api/events valid payload returns 201 Created with Event ID');
    const createdId = json5.id || json5.data.id;

    // 6. POST /api/events Missing Required Fields (Error Path -> 400 Bad Request)
    const res6 = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'tech' })
    });
    const json6 = await res6.json();
    assert(res6.status === 400 && json6.message.includes('Required fields'), 'POST /api/events missing required fields returns 400 Bad Request');

    // 7. POST /api/events Invalid Date Range startDate > endDate (Error Path -> 400 Bad Request)
    const res7 = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Invalid Date Range Event',
        organizerId: 'org-test',
        startDate: '2026-12-31T10:00:00.000Z',
        endDate: '2026-12-01T10:00:00.000Z'
      })
    });
    const json7 = await res7.json();
    assert(res7.status === 400 && json7.message.includes('startDate cannot be after endDate'), 'POST /api/events invalid date range returns 400 Bad Request');

    // 8. PATCH /api/events/:id/publish Toggle & Non-Boolean Validation (Happy & Error Paths)
    const res8a = await fetch(`${baseUrl}/api/events/${createdId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: false })
    });
    const json8a = await res8a.json();
    assert(res8a.status === 200 && json8a.published === false, 'PATCH /api/events/:id/publish valid boolean returns 200 OK');

    const res8b = await fetch(`${baseUrl}/api/events/${createdId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: 'invalid-non-boolean' })
    });
    const json8b = await res8b.json();
    assert(res8b.status === 400 && json8b.message.includes('must be a boolean'), 'PATCH /api/events/:id/publish non-boolean returns 400 Bad Request');

    // 10. GET /api/events/search?q=bengaluru Dedicated Search Endpoint Test
    const res10 = await fetch(`${baseUrl}/api/events/search?q=bengaluru`);
    const json10 = await res10.json();
    assert(
      res10.status === 200 && json10.success && json10.count > 0 && json10.data.some(e => e.title.toLowerCase().includes('bengaluru') || (typeof e.location === 'object' ? e.location.placeName : String(e.location)).toLowerCase().includes('bengaluru')),
      'GET /api/events/search?q=bengaluru returns 200 OK with expected matching events and total count'
    );

    console.log(`\n🎉 Integration Test Results: ${passCount}/${testCount} Tests Passed Successfully!`);
  } catch (err) {
    console.error('\n❌ Integration Test Suite Failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
