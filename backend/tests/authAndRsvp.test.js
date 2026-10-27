const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

const app = require('../app');
const User = require('../models/User');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const Notification = require('../models/Notification');
const Registration = require('../models/Registration');
const AuditLog = require('../models/AuditLog');
const { JWT_SECRET } = require('../middleware/auth');

jest.setTimeout(15000);

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
    Registration.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

describe('normalized RSVP and waitlist behavior', () => {
  test('verified users may RSVP while unverified users are blocked', async () => {
    const [verified, unverified, event] = await Promise.all([
      createUser(1),
      User.create({ name: 'Unverified', email: 'unverified@test.com', role: 'resident', password: 'password', isVerified: false }),
      createEvent(),
    ]);

    expect((await register(event, verified)).status).toBe(201);
    const blocked = await register(event, unverified);
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toContain('Email verification required');
    expect(await RSVP.exists({ eventId: event._id, userId: unverified._id })).toBeFalsy();
  });

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

  test('Registration Desk is limited to the event owner/admin and returns FIFO and promotions', async () => {
    const [owner, unrelated, admin, confirmed, waiting] = await Promise.all([
      User.create({ name: 'Owner', email: 'owner@test.com', role: 'organizer', password: 'password', isVerified: true }),
      User.create({ name: 'Other Organizer', email: 'other@test.com', role: 'organizer', password: 'password', isVerified: true }),
      User.create({ name: 'Admin', email: 'admin@test.com', role: 'admin', password: 'password', isVerified: true }),
      createUser(1),
      createUser(2),
    ]);
    const event = await createEvent({ organizerId: owner._id.toString() });
    await RSVP.create({ eventId: event._id, userId: confirmed._id, status: 'confirmed', confirmedAt: new Date(), promotedAt: new Date() });
    await RSVP.create({ eventId: event._id, userId: waiting._id, status: 'waitlist', waitlistedAt: new Date() });

    const denied = await request(app).get(`/api/events/${event._id}/rsvps`).set('Authorization', `Bearer ${tokenFor(unrelated)}`);
    expect(denied.status).toBe(403);

    const ownerDesk = await request(app).get(`/api/events/${event._id}/rsvps`).set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(ownerDesk.status).toBe(200);
    expect(ownerDesk.body.confirmed).toHaveLength(1);
    expect(ownerDesk.body.waitlist[0].position).toBe(1);
    expect(ownerDesk.body.promotions).toHaveLength(1);

    const adminDesk = await request(app).get(`/api/events/${event._id}/rsvps`).set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(adminDesk.status).toBe(200);
  });

  test('notification APIs list linked promotions and enforce per-user read behavior', async () => {
    const [recipient, otherUser, event] = await Promise.all([createUser(1), createUser(2), createEvent()]);
    const notification = await Notification.create({
      userId: recipient._id,
      eventId: event._id,
      type: 'promoted_from_waitlist',
      payload: { status: 'confirmed', message: `You were promoted for ${event.title}.` },
    });

    const list = await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenFor(recipient)}`);
    expect(list.status).toBe(200);
    expect(list.body.unreadCount).toBe(1);
    expect(list.body.notifications[0].event.title).toBe(event.title);

    const forbiddenRead = await request(app)
      .patch(`/api/notifications/${notification._id}/read`)
      .set('Authorization', `Bearer ${tokenFor(otherUser)}`);
    expect(forbiddenRead.status).toBe(404);

    const read = await request(app)
      .patch(`/api/notifications/${notification._id}/read`)
      .set('Authorization', `Bearer ${tokenFor(recipient)}`);
    expect(read.status).toBe(200);
    expect(read.body.notification.isRead).toBe(true);

    await Notification.create({ userId: recipient._id, eventId: event._id, type: 'event_update', payload: { message: 'Update' } });
    const readAll = await request(app).patch('/api/notifications/read-all').set('Authorization', `Bearer ${tokenFor(recipient)}`);
    expect(readAll.status).toBe(200);
    expect(await Notification.countDocuments({ userId: recipient._id, isRead: false })).toBe(0);
  });

  test('authenticated organizers and admins can call attendance workspace APIs', async () => {
    const [organizer, admin] = await Promise.all([
      User.create({ name: 'Workspace Owner', email: 'workspace@test.com', role: 'organizer', password: 'password', isVerified: true }),
      User.create({ name: 'Workspace Admin', email: 'workspace-admin@test.com', role: 'admin', password: 'password', isVerified: true }),
    ]);
    const event = await createEvent({ organizerId: organizer._id.toString() });

    const organizerResponse = await request(app)
      .get(`/api/events/${event._id}/attendance`)
      .set('Authorization', `Bearer ${tokenFor(organizer)}`);
    expect(organizerResponse.status).toBe(200);
    expect(organizerResponse.body.success).toBe(true);

    const adminResponse = await request(app)
      .get(`/api/events/${event._id}/attendance/audit-logs`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.success).toBe(true);

    const resident = await createUser(99);
    const denied = await request(app)
      .get(`/api/events/${event._id}/attendance`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);
    expect(denied.status).toBe(403);
  });

  test('check-in uses normalized RSVPs and prevents waitlist attendance', async () => {
    const [owner, unrelatedOrganizer, confirmed, waitlisted] = await Promise.all([
      User.create({ name: 'Event Owner', email: 'event-owner@test.com', role: 'organizer', password: 'password', isVerified: true }),
      User.create({ name: 'Other Organizer', email: 'other-organizer@test.com', role: 'organizer', password: 'password', isVerified: true }),
      createUser(201),
      createUser(202),
    ]);
    const event = await createEvent({ organizerId: owner._id.toString(), capacity: 1 });
    const confirmedRsvp = await RSVP.create({ eventId: event._id, userId: confirmed._id, status: 'confirmed', confirmedAt: new Date() });
    const waitlistedRsvp = await RSVP.create({ eventId: event._id, userId: waitlisted._id, status: 'waitlist', waitlistedAt: new Date() });

    const attendance = await request(app)
      .get(`/api/events/${event._id}/attendance`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(attendance.status).toBe(200);
    expect(attendance.body.summary).toMatchObject({ totalRegistrations: 2, confirmedCount: 1, waitlistCount: 1 });
    expect(attendance.body.data.map((record) => record.email)).toEqual(expect.arrayContaining([confirmed.email, waitlisted.email]));

    const blocked = await request(app)
      .patch(`/api/events/${event._id}/attendance`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ registrationId: waitlistedRsvp._id, statusPresent: true });
    expect(blocked.status).toBe(409);

    const checkedIn = await request(app)
      .patch(`/api/events/${event._id}/attendance`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ registrationId: confirmedRsvp._id, statusPresent: true });
    expect(checkedIn.status).toBe(200);
    expect((await RSVP.findById(confirmedRsvp._id)).statusPresent).toBe(true);

    const forbidden = await request(app)
      .get(`/api/events/${event._id}/attendance`)
      .set('Authorization', `Bearer ${tokenFor(unrelatedOrganizer)}`);
    expect(forbidden.status).toBe(403);
  });
});
