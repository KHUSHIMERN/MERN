const express = require('express');
const User = require('../models/User');
const RoleRequest = require('../models/RoleRequest');
const AuditLog = require('../models/AuditLog');
const { auth, requireRole } = require('../middleware/auth');

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
router.get('/requests', auth, requireRole('admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const statusFilter = req.query.status || 'pending';
    const skip = (page - 1) * limit;

    const query = statusFilter === 'all' ? {} : { status: statusFilter };

    const total = await RoleRequest.countDocuments(query);
    const requests = await RoleRequest.find(query)
      .populate('userId', 'name email role contact city createdAt')
      .populate('reviewedBy', 'name email')
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

// @route   PATCH /api/roles/requests/:id
// @desc    Approve or reject organizer role request (Admin only)
// @access  Private (Admin only)
router.patch('/requests/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: "Invalid status parameter. Must be either 'approved' or 'rejected'.",
      });
    }

    let roleRequest = await RoleRequest.findById(id);
    if (!roleRequest) {
      roleRequest = await RoleRequest.findOne({ userId: id, status: 'pending' });
    }

    if (!roleRequest) {
      return res.status(404).json({ message: 'Role request not found.' });
    }

    const targetUser = await User.findById(roleRequest.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user associated with request not found.' });
    }

    roleRequest.status = status;
    roleRequest.reviewedAt = new Date();
    roleRequest.reviewedBy = req.user._id;
    if (adminNote) roleRequest.adminNote = adminNote.trim();
    await roleRequest.save();

    if (status === 'approved') {
      targetUser.role = 'organizer';
      targetUser.organizerRoleRequest = {
        status: 'approved',
        description: roleRequest.message,
        requestedAt: roleRequest.createdAt,
        reviewedAt: roleRequest.reviewedAt,
        adminNote: roleRequest.adminNote,
      };
      await targetUser.save();

      const auditLog = new AuditLog({
        action: 'ROLE_REQUEST_APPROVED',
        adminId: req.user._id,
        targetUserId: targetUser._id,
        details: `Approved organizer role request for ${targetUser.email}. Note: ${adminNote || 'None'}`,
      });
      await auditLog.save();

      console.log(`\n======================================================`);
      console.log(`👑 ADMIN AUDIT LOG: ROLE REQUEST APPROVED`);
      console.log(`Admin: ${req.user.name} (${req.user.email})`);
      console.log(`Target User: ${targetUser.name} (${targetUser.email}) -> Promoted to ORGANIZER`);
      console.log(`======================================================\n`);

      return res.status(200).json({
        message: `Organizer role request APPROVED. User '${targetUser.name}' promoted to organizer!`,
        request: roleRequest,
        user: targetUser.toSafeObject(),
        auditLog,
      });
    } else {
      targetUser.organizerRoleRequest = {
        status: 'rejected',
        description: roleRequest.message,
        requestedAt: roleRequest.createdAt,
        reviewedAt: roleRequest.reviewedAt,
        adminNote: roleRequest.adminNote,
      };
      await targetUser.save();

      const auditLog = new AuditLog({
        action: 'ROLE_REQUEST_REJECTED',
        adminId: req.user._id,
        targetUserId: targetUser._id,
        details: `Rejected organizer role request for ${targetUser.email}. Note: ${adminNote || 'None'}`,
      });
      await auditLog.save();

      console.log(`\n======================================================`);
      console.log(`👑 ADMIN AUDIT LOG: ROLE REQUEST REJECTED`);
      console.log(`Admin: ${req.user.name} (${req.user.email})`);
      console.log(`Target User: ${targetUser.name} (${targetUser.email})`);
      console.log(`======================================================\n`);

      return res.status(200).json({
        message: `Organizer role request REJECTED for user '${targetUser.name}'.`,
        request: roleRequest,
        user: targetUser.toSafeObject(),
        auditLog,
      });
    }
  } catch (error) {
    console.error('PATCH /api/roles/requests/:id Error:', error);
    return res.status(500).json({ message: 'Server error updating role request status.', error: error.message });
  }
});

module.exports = router;
