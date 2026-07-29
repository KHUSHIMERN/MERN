const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to verify JWT and set req.user
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Decode and verify JWT signature and expiry
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from DB to verify they still exist
    const user = await User.findById(decoded.id).select('name email role isVerified');
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed: User not found' });
    }

    // Attach minimal user context (id, role, verified) to request object
    req.user = {
      _id: user._id,
      id: user._id.toString(),
      role: user.role,
      verified: user.isVerified,
      isVerified: user.isVerified,
      name: user.name,
      email: user.email
    };
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ message: 'Authentication failed: Invalid or expired token' });
  }
};

// Middleware to authorize user roles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Access restricted. Required roles: [${roles.join(', ')}]. Current role: '${req.user.role}'` 
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
  JWT_SECRET
};
