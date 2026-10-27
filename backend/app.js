const express = require('express');
const cors = require('cors');

const app = express();

// Dynamic CORS configuration allowing localhost/127.0.0.1 on any port and custom FRONTEND_URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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
