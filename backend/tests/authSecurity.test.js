const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require('../app');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
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
  await RefreshToken.deleteMany({});
});

describe('Secure Authentication & Token Flow Integration Tests', () => {

  test('1. [Registration] Password is saved as a hashed value', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securePassword123'
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.accessToken).toBeDefined();

    const user = await User.findOne({ email: 'john@example.com' });
    expect(user).toBeDefined();
    expect(user.password).not.toBe('securePassword123'); // Hashed!
    
    const isMatch = await bcrypt.compare('securePassword123', user.password);
    expect(isMatch).toBe(true);
  });

  test('2. [Login] Successful login with valid credentials', async () => {
    // Register user first (will hash password via pre-save)
    await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      isVerified: true
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.email).toBe('jane@example.com');

    // Verify refresh token is in DB
    const storedToken = await RefreshToken.findOne({ token: response.body.refreshToken });
    expect(storedToken).toBeDefined();
    expect(storedToken.userId.toString()).toBe(response.body.user.id);
  });

  test('3. [Login] Fails with invalid password', async () => {
    await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      isVerified: true
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid credentials');
  });

  test('4. [Login] Fails with unverified account', async () => {
    await User.create({
      name: 'Unverified User',
      email: 'unverified@example.com',
      password: 'password123',
      isVerified: false
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'unverified@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Account is unverified');
  });

  test('5. [Refresh] Rotates refresh token and issues new access token', async () => {
    const user = await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      isVerified: true
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'password123'
      });

    const originalRefreshToken = loginResponse.body.refreshToken;

    // Call /refresh
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).not.toBe(originalRefreshToken); // Rotated!

    // Verify old refresh token is deleted and new one is stored
    const oldTokenDoc = await RefreshToken.findOne({ token: originalRefreshToken });
    const newTokenDoc = await RefreshToken.findOne({ token: refreshResponse.body.refreshToken });

    expect(oldTokenDoc).toBeNull();
    expect(newTokenDoc).toBeDefined();
    expect(newTokenDoc.userId.toString()).toBe(user._id.toString());
  });

  test('6. [Refresh] Fails with invalid or deleted refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'someinvalidtoken' });

    expect(response.status).toBe(401);
  });

  test('7. [Logout] Revokes refresh token', async () => {
    await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      isVerified: true
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jane@example.com',
        password: 'password123'
      });

    const refreshToken = loginResponse.body.refreshToken;

    // Confirm it exists
    let storedToken = await RefreshToken.findOne({ token: refreshToken });
    expect(storedToken).toBeDefined();

    // Logout
    const logoutResponse = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    expect(logoutResponse.status).toBe(200);

    // Confirm it is deleted
    storedToken = await RefreshToken.findOne({ token: refreshToken });
    expect(storedToken).toBeNull();
  });

});
