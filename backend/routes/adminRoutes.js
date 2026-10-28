const express = require('express');
const User = require('../models/User');
const RoleRequest = require('../models/RoleRequest');
const AuditLog = require('../models/AuditLog');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Middleware: All routes under /api/admin require authentication and 'admin' role
router.use(auth, requireRole('admin'));

// @route   GET /api/admin/roles/requests
// @desc    View paginated list of organizer role requests (Filter by status: pending, approved, rejected, all)
// @access  Private (Admin only)
router.get('/roles/requests', async (req, res) => {
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
    console.error('GET /api/admin/roles/requests Error:', error);
    return res.status(500).json({ message: 'Server error fetching role requests.', error: error.message });
  }
});

// @route   PATCH /api/admin/roles/requests/:id
// @desc    Approve or reject organizer role request
// @access  Private (Admin only)
router.patch('/roles/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: "Invalid status parameter. Must be either 'approved' or 'rejected'.",
      });
    }

    // 1. Find role request by ID (or by userId if ID matches userId)
    let roleRequest = await RoleRequest.findById(id);
    if (!roleRequest) {
      roleRequest = await RoleRequest.findOne({ userId: id, status: 'pending' });
    }

    if (!roleRequest) {
      return res.status(404).json({ message: 'Role request not found.' });
    }

    // 2. Find target user
    const targetUser = await User.findById(roleRequest.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user associated with request not found.' });
    }

    // 3. Perform Status Update & Role Change
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

      // Create Audit Log entry for approval
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
      // Rejection logic
      targetUser.organizerRoleRequest = {
        status: 'rejected',
        description: roleRequest.message,
        requestedAt: roleRequest.createdAt,
        reviewedAt: roleRequest.reviewedAt,
        adminNote: roleRequest.adminNote,
      };
      await targetUser.save();

      // Create Audit Log entry for rejection
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
    console.error('PATCH /api/admin/roles/requests/:id Error:', error);
    return res.status(500).json({ message: 'Server error processing role request status update.', error: error.message });
  }
});

// @route   GET /api/admin/audit-logs
// @desc    View administrative audit logs
// @access  Private (Admin only)
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('adminId', 'name email')
      .populate('targetUserId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(50);

    return res.status(200).json({ success: true, count: logs.length, logs });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching audit logs.' });
  }
});

// @route   GET /api/admin/users
// @desc    View list of registered users with optional filter (all, unverified, verified)
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status === 'unverified') {
      query.isVerified = false;
    } else if (status === 'verified') {
      query.isVerified = true;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }, { city: searchRegex }];
    }

    const users = await User.find(query)
      .select('-password -verificationToken')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('GET /api/admin/users Error:', error);
    return res.status(500).json({ message: 'Server error fetching users.', error: error.message });
  }
});

// @route   PATCH /api/admin/users/:id/verify
// @desc    Admin manually verify or toggle verification for a user account
// @access  Private (Admin only)
router.patch('/users/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified = true } = req.body;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    targetUser.isVerified = Boolean(isVerified);
    if (targetUser.isVerified) {
      targetUser.verificationToken = null;
      targetUser.verificationTokenExpires = null;
    }
    await targetUser.save();

    const auditLog = new AuditLog({
      action: targetUser.isVerified ? 'USER_ACCOUNT_VERIFIED' : 'USER_ACCOUNT_UNVERIFIED',
      adminId: req.user._id,
      targetUserId: targetUser._id,
      attendeeName: targetUser.name,
      attendeeEmail: targetUser.email,
      details: `Admin ${req.user.name} set verification status to ${targetUser.isVerified} for user ${targetUser.email}`,
    });
    await auditLog.save();

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.name} (${targetUser.email}) verification status updated to: ${targetUser.isVerified ? 'Verified' : 'Unverified'}.`,
      user: targetUser.toSafeObject(),
    });
  } catch (error) {
    console.error('PATCH /api/admin/users/:id/verify Error:', error);
    return res.status(500).json({ message: 'Server error updating user verification.', error: error.message });
  }
});

module.exports = router;
