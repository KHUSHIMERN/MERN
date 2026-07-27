import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB, { isConnectedToMongoDB } from './config/db.js';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import errorHandler from './middleware/errorHandler.js';

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

// Start Server
app.listen(PORT, () => {
  console.log(`✨ Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

export default app;
