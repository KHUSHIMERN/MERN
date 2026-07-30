const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/auth'));

// RSVP/waitlist routes must be mounted before the legacy event router because
// both expose /:id/rsvp. The feature router adds authenticated persistence,
// cancellation, FIFO waitlist promotion, and attendee-list retrieval.
app.use('/api/events', require('./routes/rsvpRoutes'));

if (fs.existsSync('./routes/userRoutes.js')) {
  app.use('/api/users', require('./routes/userRoutes'));
}
if (fs.existsSync('./routes/eventRoutes.js')) {
  app.use('/api/events', require('./routes/eventRoutes'));
}
if (fs.existsSync('./routes/events.js')) {
  app.use('/api/events', require('./routes/events'));
}
if (fs.existsSync('./routes/aiRoutes.js')) {
  app.use('/api/ai', require('./routes/aiRoutes'));
}
if (fs.existsSync('./routes/roleRoutes.js')) {
  app.use('/api/roles', require('./routes/roleRoutes'));
}
if (fs.existsSync('./routes/adminRoutes.js')) {
  app.use('/api/admin', require('./routes/adminRoutes'));
}
if (fs.existsSync('./routes/recommendations.js')) {
  app.use('/api/recommendations', require('./routes/recommendations'));
}
if (fs.existsSync('./routes/organizerRoutes.js')) {
  app.use('/organizer', require('./routes/organizerRoutes'));
  app.use('/api/organizer', require('./routes/organizerRoutes'));
}
if (fs.existsSync('./routes/registrationRoutes.js')) {
  app.use('/api/registrations', require('./routes/registrationRoutes'));
}

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MERN Local Events Backend', timestamp: new Date().toISOString() });
});

// Root Status Route
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
      health: 'GET /api/health',
    },
  });
});

// Start Server AFTER DB connects
const startServer = async () => {
  try {
    await connectDB();
    if (fs.existsSync('./seed.js')) {
      const seedData = require('./seed');
      if (typeof seedData === 'function') {
        await seedData();
      }
    }
    app.listen(PORT, () => {
      console.log(`\n🚀 Backend Server running on http://localhost:${PORT}`);
      console.log(`📌 API Endpoint: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
};

startServer();

module.exports = app;
