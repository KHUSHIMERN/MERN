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
app.use('/api/events', rsvpRoutes); // Handles /api/events/:id/rsvp and /api/events/:id/rsvps
app.use('/api/events', eventRoutes);

// Example Protected Routes required by Acceptance Criteria
app.get('/api/organizer/events', requireAuth, requireRole('organizer'), async (req, res) => {
  try {
    const Event = require('./models/Event');
    const organizerEvents = await Event.find({ organizer: req.user._id || req.user.id });
    res.status(200).json({
      message: 'Access granted to organizer resources',
      events: organizerEvents
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching organizer events', error: error.message });
  }
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find({}).select('-password');
    res.status(200).json({
      message: 'Access granted to admin resources',
      users
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

module.exports = app;
