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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Event.deleteMany({});
  await RSVP.deleteMany({});
  await Notification.deleteMany({});
});

const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Role-Based Authorization & RSVP System Integration Tests', () => {
  
  test('1. [Authentication] Unauthenticated requests return 401 Unauthorized', async () => {
    const response = await request(app).get('/api/events');
    expect(response.status).toBe(401);
    expect(response.body.message).toContain('No token provided');
  });

  test('2. [Authorization] Residents are denied access to organizer-only routes', async () => {
    const resident = await User.create({ name: 'Resident', email: 'res@test.com', role: 'resident', password: 'password' });
    const token = generateToken(resident);

    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Unauthorized Event',
        location: 'Location',
        date: new Date(),
        capacity: 5
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Forbidden');
  });

  test('3. [Authorization] Organizers and Admins can access organizer/admin routes', async () => {
    const organizer = await User.create({ name: 'Organizer', email: 'org@test.com', role: 'organizer', password: 'password' });
    const token = generateToken(organizer);

    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Authorized Event',
        description: 'Event by Organizer',
        location: 'Hall A',
        date: new Date(),
        capacity: 5
      });

    expect(response.status).toBe(201);
    expect(response.body.event.title).toBe('Authorized Event');
  });

  test('4. [Example Protected Endpoints] /api/organizer/events restricts access to organizers', async () => {
    const resident = await User.create({ name: 'Resident', email: 'res@test.com', role: 'resident', password: 'password' });
    const organizer = await User.create({ name: 'Organizer', email: 'org@test.com', role: 'organizer', password: 'password' });
    
    const residentToken = generateToken(resident);
    const organizerToken = generateToken(organizer);

    // Resident accessing organizer-only endpoint -> 403
    const resForbidden = await request(app)
      .get('/api/organizer/events')
      .set('Authorization', `Bearer ${residentToken}`);
    expect(resForbidden.status).toBe(403);

    // Organizer accessing organizer-only endpoint -> 200
    const resAllowed = await request(app)
      .get('/api/organizer/events')
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(resAllowed.status).toBe(200);
    expect(resAllowed.body.message).toContain('organizer resources');
  });

  test('5. [Example Protected Endpoints] /api/admin/users restricts access to admins', async () => {
    const organizer = await User.create({ name: 'Organizer', email: 'org@test.com', role: 'organizer', password: 'password' });
    const admin = await User.create({ name: 'Admin', email: 'admin@test.com', role: 'admin', password: 'password' });

    const organizerToken = generateToken(organizer);
    const adminToken = generateToken(admin);

    // Organizer accessing admin-only endpoint -> 403
    const resForbidden = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(resForbidden.status).toBe(403);

    // Admin accessing admin-only endpoint -> 200
    const resAllowed = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAllowed.status).toBe(200);
    expect(resAllowed.body.message).toContain('admin resources');
  });

  test('6. [RSVP] Organizers cannot RSVP to events (only residents are allowed)', async () => {
    const organizer = await User.create({ name: 'Organizer', email: 'org@test.com', role: 'organizer', password: 'password' });
    const event = await Event.create({ title: 'Test Event', location: 'Lab', date: new Date(), capacity: 2, organizer: organizer._id });
    
    const token = generateToken(organizer);

    const response = await request(app)
      .post(`/api/events/${event._id}/rsvp`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Only residents can RSVP');
  });

  test('7. [RSVP + Waitlist] Core RSVP flow (confirmed, waitlisted, and cancel-promotion)', async () => {
    const organizer = await User.create({ name: 'Organizer', email: 'org@test.com', role: 'organizer', password: 'password' });
    const res1 = await User.create({ name: 'Resident 1', email: 'res1@test.com', role: 'resident', password: 'password' });
    const res2 = await User.create({ name: 'Resident 2', email: 'res2@test.com', role: 'resident', password: 'password' });

    const event = await Event.create({
      title: 'Limited Workshop',
      location: 'Lab A',
      date: new Date(),
      capacity: 1,
      organizer: organizer._id
    });

    const tokenRes1 = generateToken(res1);
    const tokenRes2 = generateToken(res2);

    // Resident 1 RSVPs -> confirmed
    const rsvp1Response = await request(app)
      .post(`/api/events/${event._id}/rsvp`)
      .set('Authorization', `Bearer ${tokenRes1}`);

    expect(rsvp1Response.status).toBe(201);
    expect(rsvp1Response.body.status).toBe('confirmed');

    // Resident 2 RSVPs -> waitlisted
    const rsvp2Response = await request(app)
      .post(`/api/events/${event._id}/rsvp`)
      .set('Authorization', `Bearer ${tokenRes2}`);

    expect(rsvp2Response.status).toBe(201);
    expect(rsvp2Response.body.status).toBe('waitlist');
    expect(rsvp2Response.body.waitlistPosition).toBe(1);

    // Resident 1 cancels -> Resident 2 promoted
    const cancelResponse = await request(app)
      .delete(`/api/events/${event._id}/rsvp`)
      .set('Authorization', `Bearer ${tokenRes1}`);

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.slotFreed).toBe(true);
    expect(cancelResponse.body.promotedUser.email).toBe('res2@test.com');

    const res2RSVP = await RSVP.findOne({ eventId: event._id, userId: res2._id });
    expect(res2RSVP.status).toBe('confirmed');
  });

  test('8. [Events API Enrichment] GET /api/events and GET /api/events/:id include rsvpCount, waitlistCount, and user-specific registration details', async () => {
    const organizer = await User.create({ name: 'Organizer', email: 'org@test.com', role: 'organizer', password: 'password' });
    const res1 = await User.create({ name: 'Resident 1', email: 'res1@test.com', role: 'resident', password: 'password' });
    const res2 = await User.create({ name: 'Resident 2', email: 'res2@test.com', role: 'resident', password: 'password' });
    const res3 = await User.create({ name: 'Resident 3', email: 'res3@test.com', role: 'resident', password: 'password' });

    const event = await Event.create({
      title: 'Dynamic Stats Event',
      location: 'Main Auditorium',
      date: new Date(),
      capacity: 2,
      organizer: organizer._id
    });

    // Resident 1 RSVPs -> confirmed
    await RSVP.create({ userId: res1._id, eventId: event._id, status: 'confirmed' });
    // Resident 2 RSVPs -> confirmed
    await RSVP.create({ userId: res2._id, eventId: event._id, status: 'confirmed' });
    // Resident 3 RSVPs -> waitlist (position 1)
    await RSVP.create({ userId: res3._id, eventId: event._id, status: 'waitlist' });

    const tokenRes3 = generateToken(res3);

    // Test List Endpoint for Resident 3
    const listResponse = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${tokenRes3}`);

    expect(listResponse.status).toBe(200);
    const eventInList = listResponse.body.find(e => e._id.toString() === event._id.toString());
    expect(eventInList).toBeDefined();
    expect(eventInList.rsvpCount).toBe(2);
    expect(eventInList.waitlistCount).toBe(1);
    expect(eventInList.userRegistrationStatus).toBe('waitlist');
    expect(eventInList.userWaitlistPosition).toBe(1);

    // Test Detail Endpoint for Resident 3
    const detailResponse = await request(app)
      .get(`/api/events/${event._id}`)
      .set('Authorization', `Bearer ${tokenRes3}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.rsvpCount).toBe(2);
    expect(detailResponse.body.waitlistCount).toBe(1);
    expect(detailResponse.body.userRegistrationStatus).toBe('waitlist');
    expect(detailResponse.body.userWaitlistPosition).toBe(1);
  });

  test('9. [RSVP Capacity] RSVP creation succeeds (confirmed) when capacity is available', async () => {
    const organizer = await User.create({ name: 'Organizer', email: 'org@test.com', role: 'organizer', password: 'password' });
    const resident = await User.create({ name: 'Resident', email: 'res@test.com', role: 'resident', password: 'password' });
    const event = await Event.create({
      title: 'Free Capacity Event',
      location: 'Room B',
      date: new Date(),
      capacity: 5,
      organizer: organizer._id
    });
    
    const token = generateToken(resident);
    const response = await request(app)
      .post(`/api/events/${event._id}/rsvp`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('confirmed');
    expect(response.body.message).toContain('RSVP confirmed successfully');

    // Confirm DB record
    const rsvpRecord = await RSVP.findOne({ eventId: event._id, userId: resident._id });
    expect(rsvpRecord).toBeDefined();
    expect(rsvpRecord.status).toBe('confirmed');
  });

  test('10. [RSVP Capacity] RSVP creation joins waitlist when capacity is full', async () => {
    const organizer = await User.create({ name: 'Organizer', email: 'org@test.com', role: 'organizer', password: 'password' });
    const resident1 = await User.create({ name: 'Resident 1', email: 'res1@test.com', role: 'resident', password: 'password' });
    const resident2 = await User.create({ name: 'Resident 2', email: 'res2@test.com', role: 'resident', password: 'password' });
    
    const event = await Event.create({
      title: 'Full Event',
      location: 'Room B',
      date: new Date(),
      capacity: 1,
      organizer: organizer._id
    });

    // Populate the only slot
    await RSVP.create({ userId: resident1._id, eventId: event._id, status: 'confirmed' });

    const token = generateToken(resident2);
    const response = await request(app)
      .post(`/api/events/${event._id}/rsvp`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('waitlist');
    expect(response.body.waitlistPosition).toBe(1);

    // Confirm DB record
    const rsvpRecord = await RSVP.findOne({ eventId: event._id, userId: resident2._id });
    expect(rsvpRecord).toBeDefined();
    expect(rsvpRecord.status).toBe('waitlist');
  });

  test('11. [Event Existence] RSVP creation returns 404 for non-existent event', async () => {
    const resident = await User.create({ name: 'Resident', email: 'res@test.com', role: 'resident', password: 'password' });
    const nonExistentId = new mongoose.Types.ObjectId();
    const token = generateToken(resident);

    const response = await request(app)
      .post(`/api/events/${nonExistentId}/rsvp`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Event not found');
  });

  test('12. [Event Existence] RSVP creation returns 404 for invalid ObjectId', async () => {
    const resident = await User.create({ name: 'Resident', email: 'res@test.com', role: 'resident', password: 'password' });
    const token = generateToken(resident);

    const response = await request(app)
      .post('/api/events/invalid-id/rsvp')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Event not found');
  });

  test('13. [Controller Unit Validation] Controller function returns 401 when req.user is missing', async () => {
    const { rsvpEvent, cancelRSVP, getEventRSVPs } = require('../controllers/rsvpController');

    const mReq = { params: { id: new mongoose.Types.ObjectId().toString() }, user: null };
    const mRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await rsvpEvent(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(401);
    expect(mRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required' }));

    mRes.status.mockClear();
    mRes.json.mockClear();

    await cancelRSVP(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(401);
    expect(mRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required' }));

    mRes.status.mockClear();
    mRes.json.mockClear();

    await getEventRSVPs(mReq, mRes);
    expect(mRes.status).toHaveBeenCalledWith(401);
    expect(mRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required' }));
  });

  test('14. [RSVP Cancellation & Promotion Details] Promoting a waitlisted user sets promotedAt and creates a Notification placeholder', async () => {
    const organizer = await User.create({ name: 'Organizer', email: 'org@test.com', role: 'organizer', password: 'password' });
    const res1 = await User.create({ name: 'Resident 1', email: 'res1@test.com', role: 'resident', password: 'password' });
    const res2 = await User.create({ name: 'Resident 2', email: 'res2@test.com', role: 'resident', password: 'password' });

    const event = await Event.create({
      title: 'Limited Capacity Event',
      location: 'Conference Room 1',
      date: new Date(),
      capacity: 1,
      organizer: organizer._id
    });

    const tokenRes1 = generateToken(res1);
    const tokenRes2 = generateToken(res2);

    // Resident 1 RSVPs -> confirmed
    await request(app)
      .post(`/api/events/${event._id}/rsvp`)
      .set('Authorization', `Bearer ${tokenRes1}`);

    // Resident 2 RSVPs -> waitlisted
    await request(app)
      .post(`/api/events/${event._id}/rsvp`)
      .set('Authorization', `Bearer ${tokenRes2}`);

    // Cancel Resident 1 -> promotes Resident 2
    const cancelResponse = await request(app)
      .delete(`/api/events/${event._id}/rsvp`)
      .set('Authorization', `Bearer ${tokenRes1}`);

    expect(cancelResponse.status).toBe(200);

    // Verify promoted RSVP in DB has status 'confirmed' and promotedAt set
    const promotedRSVP = await RSVP.findOne({ eventId: event._id, userId: res2._id });
    expect(promotedRSVP.status).toBe('confirmed');
    expect(promotedRSVP.promotedAt).toBeDefined();
    expect(promotedRSVP.promotedAt).toBeInstanceOf(Date);

    // Verify Notification exists for the promoted user containing eventId and status 'confirmed'
    const notification = await Notification.findOne({ userId: res2._id, eventId: event._id });
    expect(notification).toBeDefined();
    expect(notification.status).toBe('confirmed');
    expect(notification.message).toContain('promoted');
  });

});

