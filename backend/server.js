import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB, { isConnectedToMongoDB } from './config/db.js';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import errorHandler from './middleware/errorHandler.js';
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const seedData = require('./seed');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database (with automatic fallback to in-memory store)
connectDB();

// Core Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

// Health Check & Root Info Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'EventPulse Backend API',
    mongoDB: isConnectedToMongoDB ? 'connected' : 'in-memory-fallback',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send('🚀 EventPulse Backend API Server is running.');
});

// Error Handling Middleware
app.use(errorHandler);

import { fileURLToPath } from 'url';

// Start Server if executed directly as main entry point
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✨ Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
  });
}

export default app;
// Enable CORS & Middleware
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
app.use('/organizer', require('./routes/organizerRoutes'));
app.use('/api/organizer', require('./routes/organizerRoutes'));

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

// Start Server AFTER DB connects & seeds
const startServer = async () => {
  try {
    await connectDB();
    await seedData();
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
