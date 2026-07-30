const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = require('../app');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

let mongoServer;

const refreshCookie = (response) => {
  const header = response.headers['set-cookie'] || [];
  const cookie = header.find((entry) => entry.startsWith('cc_refresh_token='));
  return cookie ? cookie.split(';')[0] : null;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

describe('Consolidated authentication lifecycle', () => {
  test('registration hashes the password and requires verification before login', async () => {
    const registration = await request(app).post('/api/auth/register').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'securePassword123',
      confirmPassword: 'securePassword123',
    });

    expect(registration.status).toBe(201);
    expect(registration.body.accessToken).toBeUndefined();

    const user = await User.findOne({ email: 'john@example.com' });
    expect(user.isVerified).toBe(false);
    expect(user.password).not.toBe('securePassword123');
    expect(await bcrypt.compare('securePassword123', user.password)).toBe(true);

    const blockedLogin = await request(app).post('/api/auth/login').send({
      email: 'john@example.com',
      password: 'securePassword123',
    });
    expect(blockedLogin.status).toBe(403);

    const verification = await request(app)
      .get('/api/auth/verify')
      .query({ token: registration.body.verificationToken })
      .set('Accept', 'application/json');
    expect(verification.status).toBe(200);
  });

  test('login returns a short-lived access token and HTTP-only refresh cookie', async () => {
    await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      isVerified: true,
      role: 'resident',
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'jane@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeUndefined();
    const cookieHeader = (response.headers['set-cookie'] || []).join(';');
    expect(cookieHeader).toContain('cc_refresh_token=');
    expect(cookieHeader).toContain('HttpOnly');

    const decoded = jwt.decode(response.body.accessToken);
    expect(decoded.type).toBe('access');
    expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(15 * 60);
    expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(1);
  });

  test('refresh rotates the cookie and revokes the previous stored token', async () => {
    await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      isVerified: true,
    });
    const login = await request(app).post('/api/auth/login').send({
      email: 'jane@example.com',
      password: 'password123',
    });
    const firstCookie = refreshCookie(login);

    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', firstCookie);

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeDefined();
    expect(refreshCookie(refreshed)).not.toBe(firstCookie);
    expect(await RefreshToken.countDocuments({ revokedAt: { $ne: null } })).toBe(1);
    expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(1);

    const replay = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', firstCookie);
    expect(replay.status).toBe(401);
  });

  test('logout revokes the active refresh token and clears the cookie', async () => {
    await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      isVerified: true,
    });
    const login = await request(app).post('/api/auth/login').send({
      email: 'jane@example.com',
      password: 'password123',
    });
    const cookie = refreshCookie(login);

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(200);
    expect((logout.headers['set-cookie'] || []).join(';')).toContain('cc_refresh_token=;');
    expect(await RefreshToken.countDocuments({ revokedAt: { $ne: null } })).toBe(1);

    const afterLogout = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(afterLogout.status).toBe(401);
  });

  test('refresh rejects requests without a refresh cookie', async () => {
    const response = await request(app).post('/api/auth/refresh');
    expect(response.status).toBe(401);
  });

  test('a refresh token can be consumed only once under concurrent rotation', async () => {
    await User.create({
      name: 'Concurrent User',
      email: 'concurrent@example.com',
      password: 'password123',
      isVerified: true,
    });
    const login = await request(app).post('/api/auth/login').send({
      email: 'concurrent@example.com',
      password: 'password123',
    });
    const cookie = refreshCookie(login);

    const responses = await Promise.all([
      request(app).post('/api/auth/refresh').set('Cookie', cookie),
      request(app).post('/api/auth/refresh').set('Cookie', cookie),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
  });
});
