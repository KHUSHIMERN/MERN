const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const { migrateLegacyRsvpsForEvent } = require('../services/rsvpService');

const run = async () => {
  await connectDB();
  await RSVP.syncIndexes();

  const events = await Event.find({
    $or: [
      { 'rsvpedUsers.0': { $exists: true } },
      { 'attendees.0': { $exists: true } },
      { 'waitlistUsers.0': { $exists: true } },
    ],
  });

  let migrated = 0;
  for (const event of events) {
    const before = await RSVP.countDocuments({ eventId: event._id });
    await migrateLegacyRsvpsForEvent(event);
    const after = await RSVP.countDocuments({ eventId: event._id });
    if (after > before) migrated += after - before;
  }

  console.log(`RSVP migration complete: ${migrated} records created across ${events.length} legacy events.`);
};

run()
  .catch((error) => {
    console.error('RSVP migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
