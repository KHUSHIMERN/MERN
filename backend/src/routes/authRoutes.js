import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User, { inMemoryUsers } from '../models/User.js';
import { sendVerificationEmail } from '../utils/emailService.js';

const router = express.Router();

// Helper to check DB connection status
const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * @route   POST /api/auth/register
 * @desc    Register new user, hash password, create verify token, send email
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'resident' } = req.body;

    // 1. Validate Input
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required fields.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Role safety check: default to 'resident'; only allow 'resident' or 'organizer'; explicitly block 'admin'
    let assignedRole = role.toLowerCase();
    if (assignedRole === 'admin') {
      return res.status(403).json({ success: false, message: 'Direct admin role assignment is not permitted.' });
    }
    if (!['resident', 'organizer'].includes(assignedRole)) {
      assignedRole = 'resident';
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Uniqueness Check & Save User
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours expiry
    const passwordHash = await bcrypt.hash(password, 10);

    let savedUser;

    if (isDbConnected()) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }

      savedUser = await User.create({
        name,
        email: normalizedEmail,
        passwordHash,
        role: assignedRole,
        verified: false,
        verifyToken,
        verifyTokenExpires,
      });
    } else {
      // In-memory store fallback
      const existingInMemory = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (existingInMemory) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }

      savedUser = {
        _id: 'mem_' + Date.now(),
        name,
        email: normalizedEmail,
        passwordHash,
        role: assignedRole,
        verified: false,
        verifyToken,
        verifyTokenExpires,
        createdAt: new Date(),
      };
      inMemoryUsers.push(savedUser);
    }

    // 3. Send Verification Email
    const protocol = req.protocol || 'http';
    const hostHeader = req.get('host') || 'localhost:5000';
    const reqHost = `${protocol}://${hostHeader}`;
    
    const emailResult = await sendVerificationEmail({
      email: savedUser.email,
      name: savedUser.name,
      token: verifyToken,
      reqHost,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        userId: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        verified: savedUser.verified,
        verificationLink: emailResult.verificationLink,
      },
    });
  } catch (err) {
    console.error('[Register Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
});

/**
 * @route   GET /api/auth/verify
 * @desc    Verify email token, set verified=true, clear token
 */
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h2 style="color: #e53e3e;">Verification Error</h2>
          <p>Missing verification token.</p>
        </div>
      `);
    }

    let user;

    if (isDbConnected()) {
      user = await User.findOne({ verifyToken: token });
      if (!user) {
        return res.status(404).send(`
          <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h2 style="color: #e53e3e;">Invalid Token</h2>
            <p>Verification token is invalid or has already been used.</p>
          </div>
        `);
      }

      if (user.verifyTokenExpires && user.verifyTokenExpires < new Date()) {
        return res.status(400).send(`
          <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h2 style="color: #dd6b20;">Token Expired</h2>
            <p>Your verification token has expired. Please sign up or request a new verification email.</p>
          </div>
        `);
      }

      user.verified = true;
      user.verifyToken = null;
      user.verifyTokenExpires = null;
      await user.save();
    } else {
      user = inMemoryUsers.find((u) => u.verifyToken === token);
      if (!user) {
        return res.status(404).send(`
          <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h2 style="color: #e53e3e;">Invalid Token</h2>
            <p>Verification token is invalid or has already been used.</p>
          </div>
        `);
      }

      user.verified = true;
      user.verifyToken = null;
      user.verifyTokenExpires = null;
    }

    // Return HTML success response
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified - Tier City Portal</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; max-width: 480px; width: 90%; border: 1px solid #334155; }
          .icon { font-size: 54px; margin-bottom: 16px; color: #10b981; }
          h1 { margin: 0 0 12px; color: #38bdf8; font-size: 26px; }
          p { color: #94a3b8; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #3b82f6); color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: transform 0.2s; }
          .btn:hover { transform: translateY(-2px); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>Email Verified Successfully!</h1>
          <p>Hello <strong>${user.name}</strong>, your email address has been verified. You can now access all protected features of the Tier 2, 3 & 4 Community Event Portal.</p>
          <a class="btn" href="${clientUrl}">Proceed to Login</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('[Verify Error]:', err);
    return res.status(500).json({ success: false, message: 'Server error during token verification.' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user, enforce email verification check
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user;

    if (isDbConnected()) {
      user = await User.findOne({ email: normalizedEmail });
    } else {
      user = inMemoryUsers.find((u) => u.email === normalizedEmail);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Acceptance criterion enforcement: Unverified users cannot log in
    if (!user.verified) {
      return res.status(403).json({
        success: false,
        verified: false,
        message: 'Email verification is required. Please check your email inbox to verify your account before logging in.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
      },
    });
  } catch (err) {
    console.error('[Login Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

export default router;
