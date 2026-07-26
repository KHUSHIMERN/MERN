const mongoose = require('mongoose');
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Database connection & startup helper
const connectDB = async () => {
  let mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.log('No MONGO_URI specified in environment. Starting in-memory MongoDB server...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    console.log(`In-memory MongoDB started at: ${mongoUri}`);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB.');
    
    // Seed default data if database is empty
    await seedDatabase();
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Seed database helper
const seedDatabase = async () => {
  const User = require('./models/User');
  const Event = require('./models/Event');

  console.log('Ensuring seed database data...');

  // Create or Update Users
  const users = [
    { name: 'Ravi Kumar', email: 'resident1@test.com', role: 'resident', password: 'password', isVerified: true },
    { name: 'Amit Singh', email: 'resident2@test.com', role: 'resident', password: 'password', isVerified: true },
    { name: 'Priya Sharma', email: 'resident3@test.com', role: 'resident', password: 'password', isVerified: true },
    { name: 'Neha Gupta', email: 'organizer1@test.com', role: 'organizer', password: 'password', isVerified: true },
    { name: 'Sanjay Verma', email: 'admin1@test.com', role: 'admin', password: 'password', isVerified: true },
    { name: 'Unverified User', email: 'unverified@test.com', role: 'resident', password: 'password', isVerified: false }
  ];

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create(u);
      console.log(`Seeded user: ${u.email}`);
    } else {
      exists.isVerified = u.isVerified;
      await exists.save();
    }
  }

  const organizer = await User.findOne({ role: 'organizer' });

  // Create Events if they don't exist
  const eventCount = await Event.countDocuments();
  if (eventCount === 0 && organizer) {
    const events = [
      {
        title: 'Tech Job Fair 2026',
        description: 'Discover job openings and connect with top local businesses and startups looking for technical talent.',
        location: 'City Convention Center, Tier 2 Hub',
        date: new Date('2026-09-15T10:00:00Z'),
        organizer: organizer._id,
        capacity: 2 // Small capacity to test waitlist easily
      },
      {
        title: 'Community Blood Donation Camp',
        description: 'Join hands with Red Cross for our annual community health drive. Save lives by donating blood.',
        location: 'Town Hall, Sector-4',
        date: new Date('2026-08-20T09:00:00Z'),
        organizer: organizer._id,
        capacity: 10
      },
      {
        title: 'Free Skill-Building Workshop',
        description: 'Hands-on training session on web development basics and digital marketing strategies for local businesses.',
        location: 'Government ITI Lab, Block-A',
        date: new Date('2026-08-05T14:00:00Z'),
        organizer: organizer._id,
        capacity: 1 // Single spot capacity to demonstrate waitlist queue instantly
      }
    ];

    const createdEvents = await Event.insertMany(events);
    console.log(`Seeded ${createdEvents.length} events.`);
  }
  console.log('Database seeding complete/verified.');
};

// Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
