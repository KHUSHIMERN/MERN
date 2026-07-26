const express = require('express');
const cors = require('cors');
const { requireAuth, requireRole } = require('./middleware/auth');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const rsvpRoutes = require('./routes/rsvpRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', rsvpRoutes); // Handles /api/events/:id/rsvp and /api/events/:id/rsvps

// Example Protected Routes required by Acceptance Criteria
app.get('/api/organizer/events', requireAuth, requireRole('organizer'), (req, res) => {
  res.status(200).json({ message: 'Access granted to organizer resources' });
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), (req, res) => {
  res.status(200).json({ message: 'Access granted to admin resources' });
});

module.exports = app;
