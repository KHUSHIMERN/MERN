const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'communityconnect_secret_key_2026';

const normalizeRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  return normalized === 'attendee' ? 'resident' : normalized;
};

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ message: 'Authentication failed. Invalid token type.' });
    }

    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(decoded.id);
    } else {
      user = {
        _id: decoded.id || 'admin-1',
        id: decoded.id || 'admin-1',
        name: decoded.name || 'Admin User',
        email: decoded.email || 'admin@eventpulse.org',
        role: decoded.role || 'admin',
        isVerified: decoded.isVerified !== undefined ? decoded.isVerified : true,
        skills: decoded.skills || [],
        interests: decoded.interests || [],
        preferredCategories: decoded.preferredCategories || [],
        city: decoded.city || 'Indore',
        toSafeObject: function () {
          const copy = { ...this };
          delete copy.password;
          delete copy.verificationToken;
          delete copy.save;
          delete copy.toSafeObject;
          return copy;
        },
        save: async function () {
          return this;
        },
      };
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication token. User not found.' });
    }

    req.user = user;
    req.user.normalizedRole = normalizeRole(user.role);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed. Invalid or expired token.', error: error.message });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (decoded.type && decoded.type !== 'access') return next();

    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(decoded.id);
    } else {
      user = {
        _id: decoded.id,
        id: decoded.id,
        name: decoded.name || 'Test User',
        email: decoded.email || 'user@test.com',
        role: decoded.role || 'resident',
        isVerified: decoded.isVerified !== undefined ? decoded.isVerified : true,
        skills: decoded.skills || [],
        interests: decoded.interests || [],
        preferredCategories: decoded.preferredCategories || [],
        city: decoded.city || 'Indore',
        toSafeObject: function () {
          const copy = { ...this };
          delete copy.password;
          delete copy.verificationToken;
          delete copy.save;
          delete copy.toSafeObject;
          return copy;
        },
        save: async function () {
          return this;
        },
      };
    }

    if (user) {
      req.user = user;
      req.user.normalizedRole = normalizeRole(user.role);
    }
  } catch {
    // Public event reads remain available when an optional token is invalid.
  }
  return next();
};

// Middleware to block unverified users from protected routes
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      message: 'Email verification required. Please verify your email address to access this feature.',
      isVerified: false,
      userEmail: req.user.email,
    });
  }

  next();
};

// Middleware to authorize specific roles (e.g. organizer, admin)
const requireRole = (...roles) => {
  const allowedRoles = roles.flat().map(normalizeRole);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const userRole = normalizeRole(req.user.role);
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}. Your role is '${userRole}'.`,
      });
    }

    next();
  };
};

// `requireAuth` is the name used by the RSVP/auth-security feature modules.
// Keep `auth` for existing DEV-KHUSHI routes and expose the alias for compatibility.
module.exports = {
  auth,
  requireAuth: auth,
  optionalAuth,
  requireVerified,
  requireRole,
  normalizeRole,
  JWT_SECRET
};
