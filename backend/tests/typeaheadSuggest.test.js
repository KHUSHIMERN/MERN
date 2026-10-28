const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

const app = require('../app');
const User = require('../models/User');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const SuggestionAnalytics = require('../models/SuggestionAnalytics');
const { JWT_SECRET } = require('../middleware/auth');

let mongoServer;
let residentUser;
let organizerUser;
let residentToken;
let organizerToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 300000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Event.deleteMany({});
  await RSVP.deleteMany({});
  await SuggestionAnalytics.deleteMany({});

  residentUser = await User.create({
    name: 'Resident John',
    email: 'resident@test.com',
    password: 'hashedpassword',
    role: 'resident',
    isVerified: true
  });

  organizerUser = await User.create({
    name: 'Organizer Alice',
    email: 'organizer@test.com',
    password: 'hashedpassword',
    role: 'organizer',
    isVerified: true
  });

  residentToken = jwt.sign(
    { id: residentUser._id, role: 'resident', email: residentUser.email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  organizerToken = jwt.sign(
    { id: organizerUser._id, role: 'organizer', email: organizerUser.email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
});

describe('Typeahead Suggestion & Analytics System Integration Tests', () => {
  test('1. [Suggest Empty Query] Returns empty suggestions array when query is empty or whitespace', async () => {
    const res = await request(app).get('/api/events/suggest');
    expect(res.status).toBe(200);
    expect(res.body.suggestions).toEqual([]);
    expect(res.body.count).toBe(0);

    const resWhitespace = await request(app).get('/api/events/suggest?q=%20%20');
    expect(resWhitespace.status).toBe(200);
    expect(resWhitespace.body.suggestions).toEqual([]);
  });

  test('2. [Suggest Partial String Match] Matches partial strings in titles and tags', async () => {
    await Event.create({
      title: 'React 19 Workshop',
      description: 'Hands on React frontend engineering',
      location: 'Hall A',
      date: new Date('2026-11-01'),
      organizer: organizerUser._id,
      capacity: 50,
      tags: ['javascript', 'frontend', 'react'],
      language: 'en'
    });

    await Event.create({
      title: 'Python for AI Developers',
      description: 'Learn modern machine learning with python',
      location: 'Online',
      date: new Date('2026-11-05'),
      organizer: organizerUser._id,
      capacity: 100,
      tags: ['python', 'ai', 'data-science'],
      language: 'es'
    });

    // Query for "rea" matches "React 19 Workshop" (title) and "react" (tag)
    const res = await request(app).get('/api/events/suggest?q=rea');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);

    const titleSuggestion = res.body.suggestions.find(s => s.type === 'title');
    expect(titleSuggestion).toBeDefined();
    expect(titleSuggestion.text).toBe('React 19 Workshop');
    expect(titleSuggestion.language).toBe('en');

    const tagSuggestion = res.body.suggestions.find(s => s.type === 'tag');
    expect(tagSuggestion).toBeDefined();
    expect(tagSuggestion.text).toBe('react');
    expect(tagSuggestion.language).toBe('en');
  });

  test('3. [Suggest Ranking by Popularity and Recency] Orders suggestions by confirmed RSVP count and date', async () => {
    const lowEvent = await Event.create({
      title: 'Low Popularity Tech Meetup',
      location: 'Room 1',
      date: new Date('2026-12-01'),
      organizer: organizerUser._id,
      capacity: 20,
      tags: ['tech']
    });

    const highEvent = await Event.create({
      title: 'High Popularity Tech Summit',
      location: 'Grand Ballroom',
      date: new Date('2026-11-15'),
      organizer: organizerUser._id,
      capacity: 100,
      tags: ['tech']
    });

    // Create 3 confirmed RSVPs for highEvent and 1 for lowEvent
    const user2 = await User.create({ name: 'User 2', email: 'u2@test.com', password: 'hashedpassword', role: 'resident' });
    const user3 = await User.create({ name: 'User 3', email: 'u3@test.com', password: 'hashedpassword', role: 'resident' });

    await RSVP.create({ eventId: highEvent._id, userId: residentUser._id, status: 'confirmed' });
    await RSVP.create({ eventId: highEvent._id, userId: user2._id, status: 'confirmed' });
    await RSVP.create({ eventId: highEvent._id, userId: user3._id, status: 'confirmed' });

    await RSVP.create({ eventId: lowEvent._id, userId: residentUser._id, status: 'confirmed' });

    const res = await request(app).get('/api/events/suggest?q=Tech');
    expect(res.status).toBe(200);
    expect(res.body.suggestions.length).toBeGreaterThan(0);

    const titleSuggestions = res.body.suggestions.filter(s => s.type === 'title');
    // High Popularity Tech Summit should rank ahead of Low Popularity Tech Meetup
    expect(titleSuggestions[0].text).toBe('High Popularity Tech Summit');
    expect(titleSuggestions[0].popularity).toBe(3);
    expect(titleSuggestions[1].text).toBe('Low Popularity Tech Meetup');
    expect(titleSuggestions[1].popularity).toBe(1);
  });

  test('4. [Suggest Deduplication and 10 Limit] Deduplicates identical tags and caps results at 10', async () => {
    // Create 15 events all sharing the tag "coding" and unique titles
    for (let i = 1; i <= 15; i++) {
      await Event.create({
        title: `Coding Marathon Series ${i}`,
        location: `Room ${i}`,
        date: new Date(`2026-11-${String(i).padStart(2, '0')}`),
        organizer: organizerUser._id,
        capacity: 20,
        tags: ['coding', 'software']
      });
    }

    const res = await request(app).get('/api/events/suggest?q=coding');
    expect(res.status).toBe(200);
    expect(res.body.suggestions.length).toBeLessThanOrEqual(10);

    // Verify tag 'coding' is only present once in the suggestion list (deduplicated)
    const codingTags = res.body.suggestions.filter(s => s.type === 'tag' && s.text.toLowerCase() === 'coding');
    expect(codingTags.length).toBe(1);
  });

  test('5. [Analytics Impressions] Records impression events to MongoDB', async () => {
    const payload = {
      eventType: 'impression',
      query: 'react',
      suggestions: [
        { id: 'title-123', text: 'React Conf', type: 'title', language: 'en', eventId: new mongoose.Types.ObjectId() },
        { id: 'tag-react', text: 'react', type: 'tag', language: 'en' }
      ]
    };

    // Anonymous / guest user impression logging
    const res = await request(app)
      .post('/api/events/suggest/analytics')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.count).toBe(2);

    const records = await SuggestionAnalytics.find({ query: 'react', eventType: 'impression' });
    expect(records.length).toBe(2);
    expect(records[0].userId).toBeNull();
  });

  test('6. [Analytics Click] Records click events with authenticated user or guest', async () => {
    const payload = {
      eventType: 'click',
      query: 'react',
      suggestion: {
        id: 'title-123',
        text: 'React Conf',
        type: 'title',
        language: 'en',
        eventId: new mongoose.Types.ObjectId()
      }
    };

    // Authenticated user click
    const resAuth = await request(app)
      .post('/api/events/suggest/analytics')
      .set('Authorization', `Bearer ${residentToken}`)
      .send(payload);

    expect(resAuth.status).toBe(201);
    expect(resAuth.body.record).toBeDefined();

    const dbRecord = await SuggestionAnalytics.findOne({ eventType: 'click' });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord.userId.toString()).toBe(residentUser._id.toString());
    expect(dbRecord.suggestion.text).toBe('React Conf');
    expect(dbRecord.suggestion.type).toBe('title');
  });

  test('7. [Analytics Validation] Rejects invalid eventType with 400', async () => {
    const res = await request(app)
      .post('/api/events/suggest/analytics')
      .send({ eventType: 'invalid_type', query: 'test' });

    expect(res.status).toBe(400);
  });

  test('8. [Suggest Safe Regex Escaping] Safely handles special regex characters in queries without crashing', async () => {
    await Event.create({
      title: 'Advanced C++ & Algorithms (2026)',
      location: 'Lab 4',
      date: new Date('2026-11-20'),
      organizer: organizerUser._id,
      capacity: 30,
      tags: ['c++', 'algorithms']
    });

    // Query with regex characters: '+', '(', ')'
    const res = await request(app).get('/api/events/suggest?q=C++');
    expect(res.status).toBe(200);
    expect(res.body.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(res.body.suggestions[0].text).toContain('C++');

    const resParen = await request(app).get('/api/events/suggest?q=(2026)');
    expect(resParen.status).toBe(200);
    expect(resParen.body.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  test('9. [Suggest Language Prioritization] Prioritizes suggestions matching user preferred language', async () => {
    // English event
    await Event.create({
      title: 'Community Health Camp',
      location: 'Community Center',
      date: new Date('2026-11-10'),
      organizer: organizerUser._id,
      capacity: 50,
      tags: ['health', 'wellness'],
      language: 'en'
    });

    // Hindi event
    await Event.create({
      title: 'Swasthya Jagrukta Camp (Health)',
      location: 'Town Hall',
      date: new Date('2026-11-12'),
      organizer: organizerUser._id,
      capacity: 50,
      tags: ['health', 'swasthya'],
      language: 'hi'
    });

    // Request with lang=hi preference should rank the Hindi event first
    const resHi = await request(app).get('/api/events/suggest?q=Health&lang=hi');
    expect(resHi.status).toBe(200);
    expect(resHi.body.suggestions.length).toBeGreaterThanOrEqual(2);
    expect(resHi.body.suggestions[0].language).toBe('hi');
    expect(resHi.body.suggestions[0].text).toContain('Swasthya');

    // Request with lang=en preference should rank the English event first
    const resEn = await request(app).get('/api/events/suggest?q=Health&lang=en');
    expect(resEn.status).toBe(200);
    expect(resEn.body.suggestions.length).toBeGreaterThanOrEqual(2);
    expect(resEn.body.suggestions[0].language).toBe('en');
    expect(resEn.body.suggestions[0].text).toBe('Community Health Camp');
  });
});
