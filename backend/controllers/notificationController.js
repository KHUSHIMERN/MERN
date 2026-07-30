const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const serializeNotification = (notification) => ({
  id: notification._id,
  type: notification.type,
  payload: notification.payload,
  isRead: notification.isRead,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
  event: notification.eventId && typeof notification.eventId === 'object'
    ? {
        _id: notification.eventId._id,
        title: notification.eventId.title,
        startDate: notification.eventId.startDate,
        date: notification.eventId.date,
        location: notification.eventId.location,
        category: notification.eventId.category,
      }
    : null,
});

exports.listNotifications = async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const filter = { userId: req.user._id };
  if (req.query.unread === 'true') filter.isRead = false;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('eventId', 'title startDate date location category')
      .sort({ createdAt: -1 })
      .limit(limit),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  return res.json({
    notifications: notifications.map(serializeNotification),
    unreadCount,
  });
};

exports.markNotificationRead = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ message: 'Notification not found.' });
  }
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: 'after' }
  ).populate('eventId', 'title startDate date location category');
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  return res.json({ notification: serializeNotification(notification) });
};

exports.markAllNotificationsRead = async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return res.json({ message: 'All notifications marked as read.', modifiedCount: result.modifiedCount });
};
