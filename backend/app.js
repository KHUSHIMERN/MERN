const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// One production router per domain. Order matters: the persistent RSVP router
// owns /:id/rsvp before the broader event router handles /:id.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/rsvpRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/organizer', require('./routes/organizerRoutes'));
app.use('/api/organizer', require('./routes/organizerRoutes'));
app.use('/api/registrations', require('./routes/registrationRoutes'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MERN Local Events Backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    appName: 'CommunityConnect API - Tier 2, 3, 4 City Local Event Portal',
    status: 'Online',
    timestamp: new Date().toISOString(),
    endpoints: {
      register: 'POST /api/auth/register',
      verify: 'GET /api/auth/verify?token=...',
      login: 'POST /api/auth/login',
      events: 'GET /api/events',
      recommendations: 'GET /api/recommendations',
      health: 'GET /api/health'
    }
  });
});

module.exports = app;
