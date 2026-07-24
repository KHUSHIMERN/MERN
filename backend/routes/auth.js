const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, JWT_SECRET } = require('../middleware/auth');
const { sendVerificationEmail, getRecentEmails } = require('../utils/emailService');

const router = express.Router();

// Helper: validate email regex
const isValidEmail = (email) => {
  return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
};

// @route   POST /api/auth/register
// @desc    Register a new user with role & send verification email
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    // Server-side validations matching story acceptance criteria
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // Role selection validation: Resident by default, Organizer allowed. Admin disabled/forbidden.
    let selectedRole = 'resident';
    if (role) {
      if (role.toLowerCase() === 'admin') {
        return res.status(400).json({ message: 'Direct registration as Admin is restricted.' });
      }
      if (['resident', 'organizer'].includes(role.toLowerCase())) {
        selectedRole = role.toLowerCase();
      } else {
        return res.status(400).json({ message: 'Invalid role selection. Must be resident or organizer.' });
      }
    }

    // Check existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email address already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user in MongoDB
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: selectedRole,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
    });

    await user.save();

    // Determine host for email verification link
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const originUrl = `${protocol}://${host}`;

    // Send verification email (logged & sent)
    const emailInfo = await sendVerificationEmail(user.email, user.name, verificationToken, originUrl);

    return res.status(201).json({
      message: 'Registration successful! An email verification link has been generated.',
      user: user.toSafeObject(),
      verificationToken: user.verificationToken,
      verificationLink: emailInfo.clientVerifyLink,
      backendVerifyLink: emailInfo.verifyLink,
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
});

// @route   GET /api/auth/verify
// @desc    Verify email using unique token
// @access  Public
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is missing.' });
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      // Check if accepting HTML or JSON request
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Email Verification Failed</title>
              <style>
                body { font-family: system-ui, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 40px; border-radius: 12px; max-width: 450px; text-align: center; border: 1px solid #ef4444; }
                h2 { color: #f87171; }
                a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>❌ Verification Failed</h2>
                <p>Invalid or expired verification token. Please register again or request a new verification link.</p>
                <a href="http://localhost:3000/login">Return to Login</a>
              </div>
            </body>
          </html>
        `);
      }
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    console.log(`✅ User verified successfully: ${user.email} (${user.role})`);

    // Generate JWT token so verified user can log in seamlessly
    const jwtToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Email Verified Successfully</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #1e293b; padding: 40px; border-radius: 12px; max-width: 480px; text-align: center; border: 1px solid #10b981; }
              h2 { color: #34d399; margin-bottom: 10px; }
              p { color: #94a3b8; line-height: 1.6; }
              a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #10b981; color: #064e3b; text-decoration: none; border-radius: 8px; font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>🎉 Email Verified!</h2>
              <p>Your account (<strong>${user.email}</strong>) has been successfully verified as a <strong>${user.role}</strong>.</p>
              <p>You can now close this window and log in to access all protected event features.</p>
              <a href="http://localhost:3000/login?verified=true&email=${encodeURIComponent(user.email)}">Go to App Login</a>
            </div>
          </body>
        </html>
      `);
    }

    return res.status(200).json({
      success: true,
      message: 'Email address verified successfully! You can now log in.',
      user: user.toSafeObject(),
      token: jwtToken,
    });
  } catch (error) {
    console.error('Verification Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during email verification.', error: error.message });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email to user
// @access  Public
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'This account is already verified. You can log in.' });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const originUrl = `${protocol}://${host}`;

    const emailInfo = await sendVerificationEmail(user.email, user.name, verificationToken, originUrl);

    return res.status(200).json({
      message: 'Verification email resent successfully!',
      verificationToken,
      verificationLink: emailInfo.clientVerifyLink,
      backendVerifyLink: emailInfo.verifyLink,
    });
  } catch (error) {
    console.error('Resend Error:', error);
    return res.status(500).json({ message: 'Server error resending verification email.', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (blocks unverified users)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials. User does not exist.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials. Password incorrect.' });
    }

    // ACCEPTANCE CRITERIA #4: Unverified users CANNOT access protected features.
    // Login returns an explicit error message indicating email verification is required.
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Email verification required. Please verify your email address before logging in.',
        isVerified: false,
        email: user.email,
      });
    }

    // Create JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      message: 'Login successful!',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('rsvpedEvents');
    return res.status(200).json({ user: user.toSafeObject() });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching user details.' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user preferences (interests, city, language)
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { interests, city, language, name } = req.body;
    const user = req.user;

    if (name) user.name = name.trim();
    if (interests && Array.isArray(interests)) user.interests = interests;
    if (city) user.city = city;
    if (language) user.language = language;

    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully!',
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update profile.' });
  }
});

// @route   GET /api/auth/simulated-emails
// @desc    Dev route to fetch recent simulated verification emails
// @access  Public (dev mode helper)
router.get('/simulated-emails', (req, res) => {
  return res.status(200).json({ emails: getRecentEmails() });
});

module.exports = router;
