import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Tier 2, 3 & 4 Community Portal API running' });
});

// API Routes
app.use('/api/auth', authRoutes);

// Server startup
app.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(` 🚀 Community Portal Backend running on http://localhost:${PORT}`);
  console.log(`=============================================================\n`);
});
