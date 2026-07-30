const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');

const router = express.Router();
router.use(requireAuth);
router.get('/', listNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

module.exports = router;
