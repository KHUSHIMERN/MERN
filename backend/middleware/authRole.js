/**
 * Role-Based Access Control Middleware for Organizer Endpoints
 * Verifies that the requesting user has the 'organizer' role.
 * Role can be supplied via header 'x-user-role', query param 'role', or request body 'role'.
 */
export const requireOrganizer = (req, res, next) => {
  const userRole = req.headers['x-user-role'] || req.query.role || (req.body && req.body.role);
  
  if (!userRole || userRole.toString().toLowerCase() !== 'organizer') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Only organizers are authorized to access check-in data and update attendance records.'
    });
  }

  // Extract organizer identity details for audit logging
  const performerName = req.headers['x-user-name'] || 'Organizer Admin';
  const performerEmail = req.headers['x-user-email'] || 'organizer@eventpulse.org';

  req.performer = {
    role: 'organizer',
    name: performerName,
    email: performerEmail,
    identity: `${performerName} (${performerEmail})`
  };

  next();
};

export default requireOrganizer;
