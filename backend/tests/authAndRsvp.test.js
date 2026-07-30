const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

const app = require('../app');
const User = require('../models/User');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const Notification = require('../models/Notification');
const { JWT_SECRET } = require('../middleware/auth');

let mongoServer;

const tokenFor = (user) => jwt.sign(
  { id: user._id, email: user.email, role: user.role, type: 'access' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const createUser = (number) => User.create({
  name: `Resident ${number}`,
  email: `resident${number}@test.com`,
  role: 'resident',
  password: 'password',
  isVerified: true,
});

const createEvent = (overrides = {}) => Event.create({
  title: 'Capacity-controlled event',
  description: 'An event used to verify normalized RSVP behavior.',
  category: 'community',
  capacity: 1,
  ...overrides,
});

const register = (event, user) => request(app)
  .post(`/api/events/${event._id}/rsvp`)
  .set('Authorization', `Bearer ${tokenFor(user)}`);

const cancel = (event, user) => request(app)
  .delete(`/api/events/${event._id}/rsvp`)
  .set('Authorization', `Bearer ${tokenFor(user)}`);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await RSVP.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Event.deleteMany({}),
    RSVP.deleteMany({}),
    Notification.deleteMany({}),
  ]);
});

describe('normalized RSVP and waitlist behavior', () => {
  test('prevents duplicate records and permits reuse after cancellation', async () => {
    const [user, event] = await Promise.all([createUser(1), createEvent()]);

    expect((await register(event, user)).status).toBe(201);
    const duplicate = await register(event, user);
    expect(duplicate.status).toBe(409);
    expect(await RSVP.countDocuments({ eventId: event._id, userId: user._id })).toBe(1);

    expect((await cancel(event, user)).status).toBe(200);
    expect((await register(event, user)).body.status).toBe('confirmed');
    expect(await RSVP.countDocuments({ eventId: event._id, userId: user._id })).toBe(1);
  });

  test('allocates one capacity slot atomically under concurrent registration', async () => {
    const [first, second, event] = await Promise.all([createUser(1), createUser(2), createEvent()]);
    const responses = await Promise.all([register(event, first), register(event, second)]);

    expect(responses.map((item) => item.body.status).sort()).toEqual(['confirmed', 'waitlist']);
    expect(await RSVP.countDocuments({ eventId: event._id, status: 'confirmed' })).toBe(1);
    expect(await RSVP.countDocuments({ eventId: event._id, status: 'waitlist' })).toBe(1);
    const updated = await Event.findById(event._id);
    expect(updated.attendeesCount).toBe(1);
    expect(updated.waitlistCount).toBe(1);
  });

  test('promotes the FIFO waitlist entry and creates a notification', async () => {
    const [first, second, third, event] = await Promise.all([
      createUser(1), createUser(2), createUser(3), createEvent(),
    ]);
    await register(event, first);
    await register(event, second);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await register(event, third);

    const result = await cancel(event, first);
    expect(result.status).toBe(200);
    expect(result.body.promotedUser.email).toBe(second.email);
    expect((await RSVP.findOne({ eventId: event._id, userId: second._id })).status).toBe('confirmed');
    expect((await RSVP.findOne({ eventId: event._id, userId: third._id })).status).toBe('waitlist');
    expect(await Notification.exists({
      eventId: event._id,
      userId: second._id,
      type: 'promoted_from_waitlist',
    })).toBeTruthy();
  });

  test('concurrent cancellations promote distinct users without exceeding capacity', async () => {
    const users = await Promise.all([1, 2, 3, 4].map(createUser));
    const event = await createEvent({ capacity: 2 });
    for (const user of users) await register(event, user);

    const results = await Promise.all([cancel(event, users[0]), cancel(event, users[1])]);
    expect(results.every((item) => item.status === 200)).toBe(true);
    expect(await RSVP.countDocuments({ eventId: event._id, status: 'confirmed' })).toBe(2);
    expect(await RSVP.countDocuments({ eventId: event._id, status: 'waitlist' })).toBe(0);
    expect(await Notification.countDocuments({ eventId: event._id })).toBe(2);
  });

  test('adds current-user RSVP status and derived counts to event responses', async () => {
    const [first, second, event] = await Promise.all([createUser(1), createUser(2), createEvent()]);
    await register(event, first);
    await register(event, second);

    const list = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${tokenFor(second)}`);
    const listedEvent = list.body.events.find((item) => item._id === event.id);
    expect(listedEvent).toMatchObject({
      confirmedCount: 1,
      waitlistCount: 1,
      userRegistrationStatus: 'waitlist',
      userWaitlistPosition: 1,
    });

    const detail = await request(app)
      .get(`/api/events/${event._id}`)
      .set('Authorization', `Bearer ${tokenFor(second)}`);
    expect(detail.body.data.userRegistrationStatus).toBe('waitlist');
    expect(detail.body.data.userWaitlistPosition).toBe(1);
  });

  test('migrates legacy confirmed and waitlist arrays without duplicates', async () => {
    const [confirmed, waiting] = await Promise.all([createUser(1), createUser(2)]);
    const event = await createEvent({
      rsvpedUsers: [confirmed._id],
      waitlistUsers: [waiting._id],
      attendeesCount: 1,
      waitlistCount: 1,
    });

    const firstRead = await request(app).get(`/api/events/${event._id}`);
    const secondRead = await request(app).get(`/api/events/${event._id}`);
    expect(firstRead.status).toBe(200);
    expect(secondRead.status).toBe(200);
    expect(await RSVP.countDocuments({ eventId: event._id })).toBe(2);
    expect(await RSVP.exists({ eventId: event._id, userId: confirmed._id, status: 'confirmed' })).toBeTruthy();
    expect(await RSVP.exists({ eventId: event._id, userId: waiting._id, status: 'waitlist' })).toBeTruthy();
  });
});
