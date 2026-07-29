const requireOrganizer = (req, res, next) => {
  const userRole =
    req.headers['x-user-role'] ||
    req.headers['user-role'] ||
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
    req.headers['x-user-name'] ||
    (req.body && req.body.performerName) ||
    'Organizer Admin';
  const performerEmail =
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
