const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'communityconnect_secret_key_2026';

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
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication token. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed. Invalid or expired token.', error: error.message });
  }
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
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires one of the following roles: ${roles.join(', ')}. Your role is '${req.user.role}'.`,
      });
    }

    next();
  };
};

// `requireAuth` is the name used by the RSVP/auth-security feature modules.
// Keep `auth` for existing DEV-KHUSHI routes and expose the alias for compatibility.
module.exports = { auth, requireAuth: auth, requireVerified, requireRole, JWT_SECRET };
