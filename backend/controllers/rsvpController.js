const mongoose = require('mongoose');
const RSVP = require('../models/RSVP');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const {
  migrateLegacyRsvpsForEvent,
  reconcileEventCaches,
  waitlistPosition,
} = require('../services/rsvpService');

const validEventId = (id) => mongoose.Types.ObjectId.isValid(id);
const activeStatuses = ['confirmed', 'waitlist'];

const claimRegistrationRecord = async (eventId, userId) => {
  const now = new Date();
  let record = await RSVP.findOneAndUpdate(
    { eventId, userId, status: 'cancelled' },
    {
      $set: {
        status: 'pending',
        confirmedAt: null,
        waitlistedAt: null,
        promotedAt: null,
        cancelledAt: null,
      },
    },
    { returnDocument: 'after' }
  );
  if (record) return record;

  try {
    record = await RSVP.create({ eventId, userId, status: 'pending', createdAt: now });
    return record;
  } catch (error) {
    if (error.code !== 11000) throw error;
    return null;
  }
};

const rsvpEvent = async (req, res) => {
  const { id } = req.params;
  if (!validEventId(id)) return res.status(404).json({ message: 'Event not found' });
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (!['resident', 'attendee'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Only residents can RSVP for events.' });
  }

  let record = null;
  try {
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    await migrateLegacyRsvpsForEvent(event);
    const existing = await RSVP.findOne({ eventId: id, userId: req.user._id });
    if (existing && activeStatuses.includes(existing.status)) {
      return res.status(409).json({
        message: 'You have already registered for this event.',
        status: existing.status,
        waitlistPosition: await waitlistPosition(existing),
      });
    }

    record = await claimRegistrationRecord(event._id, req.user._id);
    if (!record) {
      const concurrent = await RSVP.findOne({ eventId: id, userId: req.user._id });
      return res.status(409).json({
        message: 'You have already registered for this event.',
        status: concurrent?.status,
      });
    }

    const reservedEvent = await Event.findOneAndUpdate(
      {
        _id: event._id,
        $expr: {
          $lt: [
            { $ifNull: ['$attendeesCount', 0] },
            { $ifNull: ['$capacity', 100] },
          ],
        },
      },
      {
        $inc: { attendeesCount: 1 },
        $addToSet: { rsvpedUsers: req.user._id },
        $pull: { waitlistUsers: req.user._id },
      },
      { returnDocument: 'after' }
    );

    const now = new Date();
    if (reservedEvent) {
      record = await RSVP.findOneAndUpdate(
        { _id: record._id, status: 'pending' },
        { $set: { status: 'confirmed', confirmedAt: now, waitlistedAt: null } },
        { returnDocument: 'after' }
      );
      if (!record) {
        await Event.findByIdAndUpdate(event._id, {
          $inc: { attendeesCount: -1 },
          $pull: { rsvpedUsers: req.user._id },
        });
        throw new Error('Registration state changed during capacity allocation.');
      }
    } else {
      await Event.findByIdAndUpdate(event._id, {
        $inc: { waitlistCount: 1 },
        $addToSet: { waitlistUsers: req.user._id },
      });
      record = await RSVP.findOneAndUpdate(
        { _id: record._id, status: 'pending' },
        { $set: { status: 'waitlist', waitlistedAt: now, confirmedAt: null } },
        { returnDocument: 'after' }
      );
      if (!record) {
        await Event.findByIdAndUpdate(event._id, {
          $inc: { waitlistCount: -1 },
          $pull: { waitlistUsers: req.user._id },
        });
        throw new Error('Registration state changed during waitlist allocation.');
      }
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { rsvpedEvents: event._id } });
    const position = await waitlistPosition(record);
    return res.status(201).json({
      message: record.status === 'confirmed'
        ? 'RSVP confirmed successfully!'
        : 'Event is at capacity. Added to the waitlist.',
      rsvp: record,
      status: record.status,
      waitlistPosition: position,
    });
  } catch (error) {
    if (record?.status === 'pending') {
      await RSVP.updateOne(
        { _id: record._id, status: 'pending' },
        { $set: { status: 'cancelled', cancelledAt: new Date() } }
      );
    }
    console.error('RSVP Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const cancelRSVP = async (req, res) => {
  const { id } = req.params;
  if (!validEventId(id)) return res.status(404).json({ message: 'Event not found' });
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (!['resident', 'attendee'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Only residents can cancel RSVPs.' });
  }

  try {
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await migrateLegacyRsvpsForEvent(event);

    const cancelled = await RSVP.findOneAndUpdate(
      { eventId: id, userId: req.user._id, status: { $in: activeStatuses } },
      { $set: { status: 'cancelled', cancelledAt: new Date() } },
      { returnDocument: 'before' }
    );
    if (!cancelled) {
      return res.status(404).json({ message: 'No active registration found for this event.' });
    }

    await User.findByIdAndUpdate(req.user._id, { $pull: { rsvpedEvents: event._id } });
    let promoted = null;

    if (cancelled.status === 'confirmed') {
      await Event.findByIdAndUpdate(event._id, {
        $inc: { attendeesCount: -1 },
        $pull: { rsvpedUsers: req.user._id },
      });

      promoted = await RSVP.findOneAndUpdate(
        { eventId: id, status: 'waitlist' },
        {
          $set: {
            status: 'confirmed',
            confirmedAt: new Date(),
            promotedAt: new Date(),
          },
        },
        {
          sort: { waitlistedAt: 1, createdAt: 1, _id: 1 },
          returnDocument: 'after',
        }
      );

      if (promoted) {
        await Event.findByIdAndUpdate(event._id, {
          $inc: { attendeesCount: 1, waitlistCount: -1 },
          $pull: { waitlistUsers: promoted.userId },
          $addToSet: { rsvpedUsers: promoted.userId },
        });
        await User.findByIdAndUpdate(promoted.userId, {
          $addToSet: { rsvpedEvents: event._id },
        });
        await Notification.create({
          userId: promoted.userId,
          eventId: event._id,
          type: 'promoted_from_waitlist',
          payload: {
            status: 'confirmed',
            message: `Congratulations! You have been promoted to confirmed status for ${event.title}.`,
          },
        });
      }
    } else {
      await Event.findByIdAndUpdate(event._id, {
        $inc: { waitlistCount: -1 },
        $pull: { waitlistUsers: req.user._id },
      });
    }

    await reconcileEventCaches(event._id);
    const promotedUser = promoted
      ? await User.findById(promoted.userId).select('name email').lean()
      : null;

    return res.status(200).json({
      message: 'Registration successfully cancelled.',
      previousStatus: cancelled.status,
      slotFreed: cancelled.status === 'confirmed',
      promotedUser: promotedUser ? {
        id: promotedUser._id,
        name: promotedUser.name,
        email: promotedUser.email,
      } : null,
    });
  } catch (error) {
    console.error('Cancel RSVP Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const getCurrentUserRsvp = async (req, res) => {
  const { id } = req.params;
  if (!validEventId(id)) return res.status(404).json({ message: 'Event not found' });
  const record = await RSVP.findOne({
    eventId: id,
    userId: req.user._id,
    status: { $in: activeStatuses },
  });
  return res.json({
    status: record?.status || 'none',
    waitlistPosition: await waitlistPosition(record),
    rsvp: record,
  });
};

const getEventRSVPs = async (req, res) => {
  const { id } = req.params;
  if (!validEventId(id)) return res.status(404).json({ message: 'Event not found' });
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });

  try {
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await migrateLegacyRsvpsForEvent(event);

    const records = await RSVP.find({ eventId: id, status: { $in: activeStatuses } })
      .populate('userId', 'name email role')
      .sort({ status: 1, waitlistedAt: 1, createdAt: 1, _id: 1 });
    const confirmed = records.filter((record) => record.status === 'confirmed');
    const waitlist = records.filter((record) => record.status === 'waitlist');
    const current = records.find((record) => record.userId?._id?.equals(req.user._id));

    return res.json({
      eventId: id,
      capacity: event.capacity,
      confirmedCount: confirmed.length,
      waitlistCount: waitlist.length,
      confirmed: confirmed.map((record) => ({
        id: record.userId?._id,
        name: record.userId?.name,
        email: record.userId?.email,
        rsvpId: record._id,
        createdAt: record.createdAt,
      })),
      waitlist: waitlist.map((record, index) => ({
        id: record.userId?._id,
        name: record.userId?.name,
        email: record.userId?.email,
        rsvpId: record._id,
        createdAt: record.createdAt,
        position: index + 1,
      })),
      currentUser: {
        status: current?.status || 'none',
        waitlistPosition: current ? await waitlistPosition(current) : 0,
      },
    });
  } catch (error) {
    console.error('Get RSVPs Error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = { rsvpEvent, cancelRSVP, getCurrentUserRsvp, getEventRSVPs };
