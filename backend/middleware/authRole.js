const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('./auth');

const requireOrganizer = async (req, res, next) => {
  if (!req.user && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(req.headers.authorization.split(' ')[1], JWT_SECRET);
      if (decoded && decoded.id) {
        req.user = await User.findById(decoded.id);
      }
    } catch (e) {
      // Continue to header fallback
    }
  }

  const userRole =
    req.headers['x-user-role'] ||
    req.headers['user-role'] ||
    (req.user && req.user.role) ||
    req.query.role ||
    req.query.userRole ||
    (req.body && (req.body.role || req.body.userRole));
  
  if (!userRole || userRole.toString().toLowerCase() !== 'organizer') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Only organizers are authorized to access check-in data and update attendance records.'
    });
  }

  const performerName =
    (req.user && req.user.name) ||
    req.headers['x-user-name'] ||
    (req.body && req.body.performerName) ||
    'Organizer Admin';
  const performerEmail =
    (req.user && req.user.email) ||
    req.headers['x-user-email'] ||
    (req.body && req.body.performerEmail) ||
    'organizer@eventpulse.org';

  req.performer = {
    role: 'organizer',
    name: performerName,
    email: performerEmail,
    identity: `${performerName} (${performerEmail})`
  };

  next();
};

module.exports = { requireOrganizer };
