const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const eventRoutes = require('./routes/eventRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_events';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MERN Local Events Backend', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.send('MERN Local Events API Server running.');
});

// Database connection & server listen
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.warn('MongoDB connection warning:', err.message);
    console.log('Starting server in fallback mode...');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT} (fallback mode)`);
    });
  });

module.exports = app;
