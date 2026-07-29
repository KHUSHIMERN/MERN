const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const seedData = require('./seed');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/registrations', require('./routes/registrationRoutes'));
app.use('/organizer', require('./routes/organizerRoutes'));
app.use('/api/organizer', require('./routes/organizerRoutes'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'EventPulse Backend API',
    mongoDB: connectDB.isConnectedToMongoDB ? 'connected' : 'in-memory-fallback',
    timestamp: new Date().toISOString()
  });
});

// Root Info Endpoint
app.get('/', (req, res) => {
  res.json({
    appName: 'EventPulse & CommunityConnect API',
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

// Error Handling Middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start Server if executed directly
if (require.main === module && process.env.NODE_ENV !== 'test') {
  const startServer = async () => {
    try {
      await connectDB();
      if (typeof seedData === 'function') {
        await seedData();
      }
      app.listen(PORT, () => {
        console.log(`✨ Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start server:', err);
    }
  };
  startServer();
}

module.exports = app;
