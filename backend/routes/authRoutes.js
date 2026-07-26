const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

// Helper to set refresh token cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
};

// Helper to parse cookies manually
const getRefreshTokenFromCookie = (req) => {
  if (!req.headers.cookie) return null;
  const cookiePairs = req.headers.cookie.split(';').map(c => c.trim().split('='));
  const refreshCookie = cookiePairs.find(([key]) => key === 'refreshToken');
  return refreshCookie ? decodeURIComponent(refreshCookie[1]) : null;
};

// Register a user
router.post('/register', async (req, res) => {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = new User({
      name,
      email,
      role: role || 'resident',
      password,
      isVerified: true // default new accounts to verified for easy registration testing
    });
    await user.save();

    // Generate tokens
    const accessToken = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Save refresh token to DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt
    });

    // Set cookie
    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check account verification status
    if (user.isVerified === false) {
      return res.status(400).json({ message: 'Account is unverified. Please verify your email.' });
    }

    // Generate short-lived access token and long-lived refresh token
    const accessToken = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Save refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt
    });

    // Set cookie
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(req) || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }

    // Verify token exists in DB
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Check expiration date
    if (tokenDoc.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: tokenDoc._id });
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    // Verify token signature/validity
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid refresh token signature' });
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.isVerified === false) {
      return res.status(401).json({ message: 'Account is unverified' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });

    // Rotate refresh token: Generate a new refresh token, delete old one from DB, set new cookie
    const newRefreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.deleteOne({ _id: tokenDoc._id });
    await RefreshToken.create({
      token: newRefreshToken,
      userId: user._id,
      expiresAt: newExpiresAt
    });

    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({
      token: newAccessToken,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Token Refresh Error:', error);
    return res.status(500).json({ message: 'Failed to refresh token', error: error.message });
  }
});

// Logout endpoint (revokes refresh token and clears cookie)
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(req) || req.body.refreshToken;

    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      path: '/'
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({ message: 'Logout failed', error: error.message });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;
