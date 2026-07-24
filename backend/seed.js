const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Event = require('./models/Event');

const seedData = async () => {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log('ℹ️ Database already contains data. Skipping seed.');
      return;
    }

    console.log('🌱 Seeding initial user accounts and local Tier 2-4 events...');

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('password123', salt);

    // 1. Create Verified Organizer
    const organizer = await User.create({
      name: 'Rohan Sharma (Indore Events)',
      email: 'organizer@indore.org',
      password: defaultPassword,
      role: 'organizer',
      isVerified: true,
      interests: ['Career & Jobs', 'Skill Workshops'],
      city: 'Indore',
      language: 'en',
    });

    // 2. Create Verified Resident
    const resident = await User.create({
      name: 'Ananya Verma',
      email: 'resident@indore.org',
      password: defaultPassword,
      role: 'resident',
      isVerified: true,
      interests: ['Career & Jobs', 'Health & Wellness', 'Cultural Festivals'],
      city: 'Indore',
      language: 'en',
    });

    // 3. Create Unverified User (For testing acceptance criterion #4)
    await User.create({
      name: 'Unverified Test User',
      email: 'unverified@indore.org',
      password: defaultPassword,
      role: 'resident',
      isVerified: false,
      verificationToken: 'test-verification-token-12345',
      verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      interests: ['Skill Workshops'],
      city: 'Jaipur',
      language: 'en',
    });

    // 4. Create Initial Events
    const events = [
      {
        title: 'Tier 2 Youth Tech & Career Job Fair 2026',
        description: 'Connect with over 45 hiring tech companies, manufacturing firms, and startups in MP. On-the-spot interviews and resume review stalls for freshers and experienced professionals.',
        category: 'Career & Jobs',
        city: 'Indore',
        tier: 'Tier 2',
        location: 'Brilliant Convention Centre, Vijay Nagar, Indore',
        date: '2026-08-15',
        time: '10:00 AM - 05:00 PM',
        organizer: organizer._id,
        organizerName: organizer.name,
        capacity: 250,
        attendees: [{ user: resident._id }],
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
        tags: ['Career', 'Jobs', 'Hiring', 'Indore', 'Tier 2'],
        language: 'en',
        isFeatured: true,
      },
      {
        title: 'Free Blood Donation & Community Health Camp',
        description: 'Organized in partnership with Red Cross Society & City Hospital. Free health checkups, blood sugar & pressure screenings, and voluntary blood donation drive with donor certificates.',
        category: 'Health & Wellness',
        city: 'Jaipur',
        tier: 'Tier 2',
        location: 'Community Hall, Malviya Nagar, Jaipur',
        date: '2026-08-10',
        time: '09:00 AM - 03:00 PM',
        organizer: organizer._id,
        organizerName: 'Jaipur Red Cross Chapter',
        capacity: 150,
        attendees: [],
        image: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&q=80',
        tags: ['Health', 'Blood Donation', 'Jaipur', 'Wellness'],
        language: 'hi',
        isFeatured: true,
      },
      {
        title: 'Madhubani & Folk Artisans Heritage Exhibition',
        description: 'A grand showcase of traditional handicrafts, terracotta, and folk art created by local women self-help groups. Workshops on pottery and live cultural folk music performances.',
        category: 'Cultural Festivals',
        city: 'Patna',
        tier: 'Tier 2',
        location: 'Gandhi Maidan Cultural Complex, Patna',
        date: '2026-08-20',
        time: '11:00 AM - 08:00 PM',
        organizer: organizer._id,
        organizerName: 'Bihar Heritage Forum',
        capacity: 300,
        attendees: [],
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
        tags: ['Culture', 'Art', 'Heritage', 'Patna'],
        language: 'hi',
        isFeatured: false,
      },
      {
        title: 'Hands-on AI & Web Development Bootcamp for Students',
        description: 'Learn modern full-stack development, AI tools, and React.js. Perfect for college students and local aspiring developers aiming to build portfolio projects.',
        category: 'Skill Workshops',
        city: 'Coimbatore',
        tier: 'Tier 2',
        location: 'PSG Tech Auditorium, Peelamedu, Coimbatore',
        date: '2026-08-25',
        time: '02:00 PM - 06:00 PM',
        organizer: organizer._id,
        organizerName: 'Coding Community TN',
        capacity: 100,
        attendees: [],
        image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
        tags: ['Coding', 'AI', 'Skills', 'Coimbatore'],
        language: 'en',
        isFeatured: true,
      },
      {
        title: 'Swachh City E-Waste Recycling & Civic Awareness Drive',
        description: 'Bring your broken electronics, plastic waste, and old batteries for safe recycling. Earn eco-reward points and free saplings for your home garden.',
        category: 'Civic & Community',
        city: 'Bhopal',
        tier: 'Tier 2',
        location: 'Smart City Park, TT Nagar, Bhopal',
        date: '2026-08-12',
        time: '08:00 AM - 12:00 PM',
        organizer: organizer._id,
        organizerName: 'Green Bhopal Action Club',
        capacity: 200,
        attendees: [],
        image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
        tags: ['Civic', 'Environment', 'Bhopal', 'Tier 2'],
        language: 'hi',
        isFeatured: false,
      },
    ];

    const createdEvents = await Event.insertMany(events);

    // Link RSVP to resident
    resident.rsvpedEvents.push(createdEvents[0]._id);
    await resident.save();

    console.log('✅ Seeding complete! Sample accounts created:');
    console.log(' - Organizer: organizer@indore.org | password123 (Verified)');
    console.log(' - Resident:  resident@indore.org  | password123 (Verified)');
    console.log(' - Unverified: unverified@indore.org | password123 (Unverified)');
  } catch (err) {
    console.error('Seed Error:', err.message);
  }
};

module.exports = seedData;
