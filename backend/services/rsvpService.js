const mongoose = require('mongoose');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const User = require('../models/User');

const ACTIVE_STATUSES = ['confirmed', 'waitlist'];

const uniqueIds = (values) => [...new Map(
  values.filter(Boolean).map((value) => [value.toString(), value])
).values()];

const legacyUserIds = (event, field) => {
  const values = Array.isArray(event[field]) ? event[field] : [];
  return values.map((value) => value?.user?._id || value?.user || value?._id || value);
};

const reconcileEventCaches = async (eventId) => {
  const [confirmed, waitlisted] = await Promise.all([
    RSVP.find({ eventId, status: 'confirmed' }).select('userId statusPresent').lean(),
    RSVP.find({ eventId, status: 'waitlist' }).select('userId').lean(),
  ]);

  const confirmedIds = uniqueIds(confirmed.map((record) => record.userId));
  const waitlistIds = uniqueIds(waitlisted.map((record) => record.userId));
  const checkedInIds = uniqueIds(
    confirmed.filter((record) => record.statusPresent).map((record) => record.userId)
  );
  const activeIds = uniqueIds([...confirmedIds, ...waitlistIds]);

  await Event.findByIdAndUpdate(eventId, {
    $set: {
      attendeesCount: confirmedIds.length,
      waitlistCount: waitlistIds.length,
      rsvpedUsers: confirmedIds,
      waitlistUsers: waitlistIds,
      checkedInCount: checkedInIds.length,
      checkedInUsers: checkedInIds,
    },
  });

  if (activeIds.length) {
    await User.updateMany(
      { _id: { $in: activeIds } },
      { $addToSet: { rsvpedEvents: eventId } }
    );
  }
  await User.updateMany(
    { _id: { $nin: activeIds }, rsvpedEvents: eventId },
    { $pull: { rsvpedEvents: eventId } }
  );

  return {
    confirmedCount: confirmedIds.length,
    waitlistCount: waitlistIds.length,
  };
};

const migrateLegacyRsvpsForEvent = async (eventOrId) => {
  const event = eventOrId?._id ? eventOrId : await Event.findById(eventOrId);
  if (!event) return null;

  // Once normalized records exist they are the source of truth. This guard
  // also prevents legacy reconciliation from racing live capacity allocation.
  const hasNormalizedRecords = await RSVP.exists({ eventId: event._id });
  if (hasNormalizedRecords) return event;

  const confirmedIds = uniqueIds([
    ...legacyUserIds(event, 'rsvpedUsers'),
    ...legacyUserIds(event, 'attendees'),
  ]);
  const confirmedKeys = new Set(confirmedIds.map((id) => id.toString()));
  const waitlistIds = uniqueIds(legacyUserIds(event, 'waitlistUsers'))
    .filter((id) => !confirmedKeys.has(id.toString()));
  const now = new Date();

  const operations = [
    ...confirmedIds.map((userId) => ({
      updateOne: {
        filter: { eventId: event._id, userId },
        update: {
          $setOnInsert: {
            eventId: event._id,
            userId,
            status: 'confirmed',
            confirmedAt: now,
          },
        },
        upsert: true,
      },
    })),
    ...waitlistIds.map((userId) => ({
      updateOne: {
        filter: { eventId: event._id, userId },
        update: {
          $setOnInsert: {
            eventId: event._id,
            userId,
            status: 'waitlist',
            waitlistedAt: now,
          },
        },
        upsert: true,
      },
    })),
  ];

  if (!operations.length) return event;

  try {
    await RSVP.bulkWrite(operations, { ordered: false });
  } catch (error) {
    const onlyDuplicates = error.code === 11000
      || error.writeErrors?.every((item) => item.code === 11000);
    if (!onlyDuplicates) throw error;
  }
  await reconcileEventCaches(event._id);
  return event;
};

const waitlistPosition = async (record) => {
  if (!record || record.status !== 'waitlist') return 0;
  const queuedAt = record.waitlistedAt || record.createdAt;
  return RSVP.countDocuments({
    eventId: record.eventId,
    status: 'waitlist',
    $or: [
      { waitlistedAt: { $lt: queuedAt } },
      { waitlistedAt: queuedAt, _id: { $lte: record._id } },
      { waitlistedAt: null, createdAt: { $lte: record.createdAt } },
    ],
  });
};

const enrichEventsWithRsvp = async (events, userId = null) => {
  const normalized = events.map((event) => event.toObject ? event.toObject() : { ...event });
  const objectIds = normalized
    .map((event) => event._id)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!objectIds.length) return normalized;

  const [counts, userRecords] = await Promise.all([
    RSVP.aggregate([
      { $match: { eventId: { $in: objectIds }, status: { $in: ACTIVE_STATUSES } } },
      { $group: { _id: { eventId: '$eventId', status: '$status' }, count: { $sum: 1 } } },
    ]),
    userId
      ? RSVP.find({ eventId: { $in: objectIds }, userId, status: { $in: ACTIVE_STATUSES } }).lean()
      : [],
  ]);

  const countMap = new Map();
  counts.forEach(({ _id, count }) => {
    const key = _id.eventId.toString();
    const current = countMap.get(key) || { confirmed: 0, waitlist: 0 };
    current[_id.status] = count;
    countMap.set(key, current);
  });
  const userMap = new Map(userRecords.map((record) => [record.eventId.toString(), record]));

  return Promise.all(normalized.map(async (event) => {
    const key = event._id.toString();
    const eventCounts = countMap.get(key) || { confirmed: 0, waitlist: 0 };
    const userRecord = userMap.get(key);
    return {
      ...event,
      attendeesCount: eventCounts.confirmed,
      rsvpCount: eventCounts.confirmed,
      confirmedCount: eventCounts.confirmed,
      waitlistCount: eventCounts.waitlist,
      userRegistrationStatus: userRecord?.status || 'none',
      userWaitlistPosition: userRecord ? await waitlistPosition(userRecord) : 0,
    };
  }));
};

module.exports = {
  ACTIVE_STATUSES,
  enrichEventsWithRsvp,
  migrateLegacyRsvpsForEvent,
  reconcileEventCaches,
  waitlistPosition,
};
