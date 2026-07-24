const express = require('express');
const User = require('../models/User');
const RoleRequest = require('../models/RoleRequest');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/roles/requests
// @desc    Submit organizer role request (saved in DB with userId, message, status='pending', createdAt)
// @access  Private (Resident)
router.post('/requests', auth, async (req, res) => {
  try {
    const user = req.user;
    const { message, description } = req.body;
    const requestMessage = (message || description || '').trim();

    // Check 1: Prevent role request if user is already organizer or admin
    if (user.role === 'organizer' || user.role === 'admin') {
      return res.status(400).json({
        message: 'You are already an event organizer or administrator.',
      });
    }

    // Check 2: Prevent duplicate pending role request
    const existingPending = await RoleRequest.findOne({
      userId: user._id,
      status: 'pending',
    });

    if (existingPending) {
      return res.status(400).json({
        message: 'You already have a pending organizer role request under admin review.',
        request: existingPending,
      });
    }

    // Create RoleRequest document in MongoDB
    const roleRequest = new RoleRequest({
      userId: user._id,
      message: requestMessage,
      status: 'pending',
    });

    await roleRequest.save();

    // Sync on User model for fast profile rendering
    user.organizerRoleRequest = {
      status: 'pending',
      description: requestMessage,
      requestedAt: roleRequest.createdAt,
    };
    await user.save();

    return res.status(201).json({
      message: 'Organizer role request submitted successfully! Pending admin approval.',
      roleRequest: {
        id: roleRequest._id,
        userId: roleRequest.userId,
        message: roleRequest.message,
        status: roleRequest.status,
        createdAt: roleRequest.createdAt,
      },
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('POST /api/roles/requests Error:', error);
    return res.status(500).json({ message: 'Server error submitting role request.', error: error.message });
  }
});

// @route   GET /api/roles/requests
// @desc    Get paginated pending role requests (Admin route)
// @access  Private (Admin)
router.get('/requests', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Administrator rights required.' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const statusFilter = req.query.status || 'pending';
    const skip = (page - 1) * limit;

    const query = statusFilter === 'all' ? {} : { status: statusFilter };

    const total = await RoleRequest.countDocuments(query);
    const requests = await RoleRequest.find(query)
      .populate('userId', 'name email role contact city created_at')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      requests,
    });
  } catch (error) {
    console.error('GET /api/roles/requests Error:', error);
    return res.status(500).json({ message: 'Server error fetching role requests.', error: error.message });
  }
});

module.exports = router;
