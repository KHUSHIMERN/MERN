const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Event = require('./models/Event');
const connectDB = require('./config/db');

dotenv.config();

const seedData = async () => {
  try {
    const existingUsers = await User.countDocuments();
    const existingEvents = await Event.countDocuments();

    if (existingUsers > 0 && existingEvents > 0) {
      console.log('ℹ️ Database already contains user and event data. Skipping seed.');
      return;
    }

    console.log('🌱 Seeding initial user accounts and local events...');

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('password123', salt);

    // 1. Seed Initial User Accounts (QA & DEV-KHUSHI)
    let organizer = await User.findOne({ email: 'organizer@indore.org' });
    if (!organizer) {
      organizer = await User.create({
        name: 'Rohan Sharma (Indore Events)',
        email: 'organizer@indore.org',
        password: defaultPassword,
        role: 'organizer',
        isVerified: true,
        interests: ['Career & Jobs', 'Skill Workshops'],
        city: 'Indore',
        language: 'en',
        preferredLanguage: 'en',
        preferredTimezone: 'Asia/Kolkata',
      });
    }

    let resident = await User.findOne({ email: 'resident@indore.org' });
    if (!resident) {
      resident = await User.create({
        name: 'Ananya Verma',
        email: 'resident@indore.org',
        password: defaultPassword,
        role: 'resident',
        isVerified: true,
        interests: ['Career & Jobs', 'Health & Wellness', 'Cultural Festivals'],
        city: 'Indore',
        language: 'en',
        preferredLanguage: 'en',
        preferredTimezone: 'Asia/Kolkata',
      });
    }

    let unverifiedUser = await User.findOne({ email: 'unverified@indore.org' });
    if (!unverifiedUser) {
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
        preferredLanguage: 'en',
        preferredTimezone: 'Asia/Kolkata',
      });
    }

    let adminUser = await User.findOne({ email: 'admin@indore.org' });
    if (!adminUser) {
      await User.create({
        name: 'Community System Admin',
        email: 'admin@indore.org',
        password: defaultPassword,
        role: 'admin',
        isVerified: true,
        interests: ['All'],
        city: 'Indore',
        language: 'en',
        preferredLanguage: 'en',
        preferredTimezone: 'Asia/Kolkata',
      });
    }

    // 2. Seed Unified Events (Combining DEV-KHUSHI and QA event attributes)
    if (existingEvents === 0) {
      const unifiedEvents = [
        {
          title: 'Tier-2 Youth Job Fair & Skill Expo 2026',
          title_hi: 'टियर-2 युवा रोजगार मेला एवं कौशल प्रदर्शनी 2026',
          description: 'Connect with over 45 regional employers, startups, and vocational training partners in Rajasthan & MP.',
          description_hi: 'राजस्थान और मध्य प्रदेश के 45 से अधिक क्षेत्रीय नियोक्ताओं और स्टार्ट-अप्स से जुड़ें।',
          category: 'Career & Jobs',
          city: 'Jaipur',
          tier: 'Tier 2',
          location: 'Jaipur Exhibition Centre, Jaipur, Rajasthan',
          startDate: new Date('2026-08-15T10:00:00+05:30'),
          endDate: new Date('2026-08-15T17:00:00+05:30'),
          date: '2026-08-15',
          time: '10:00 AM - 05:00 PM',
          timezone: 'Asia/Kolkata',
          organizer: organizer._id,
          organizerName: 'Rajasthan Skill Development Mission',
          capacity: 500,
          attendeesCount: 142,
          attendees: [{ user: resident._id }],
          rsvpedUsers: [resident._id],
          imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
          image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
          imageUrlAlt: 'Crowd of young job seekers interacting with recruiters at youth job fair booths',
          tags: ['Career', 'Jobs', 'Hiring', 'Jaipur', 'Tier 2'],
          language: 'en',
          isFeatured: true,
        },
        {
          title: 'Global Tech & AI Workshop (Live Virtual)',
          title_hi: 'ग्लोबल टेक और एआई कार्यशाला (लाइव वर्चुअल)',
          description: 'Learn modern Web Dev & AI integration fundamentals with global guest speakers.',
          description_hi: 'ग्लोबल वक्ताओं के साथ आधुनिक वेब देव और एआई एकीकरण के सिद्धांत सीखें।',
          category: 'Skill Workshops',
          city: 'Online / Remote',
          tier: 'Tier 2',
          location: 'Online / Zoom Live Stream',
          startDate: new Date('2026-08-20T14:00:00-04:00'),
          endDate: new Date('2026-08-20T17:00:00-04:00'),
          date: '2026-08-20',
          time: '02:00 PM - 05:00 PM EST',
          timezone: 'America/New_York',
          organizer: organizer._id,
          organizerName: 'OpenSource Community Global',
          capacity: 1000,
          attendeesCount: 680,
          attendees: [],
          rsvpedUsers: [],
          imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
          image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
          imageUrlAlt: 'Developer presenting AI integration code on a large screen to virtual workshop attendees',
          tags: ['Coding', 'AI', 'Skills', 'Workshop'],
          language: 'en',
          isFeatured: true,
        },
        {
          title: 'Community Health & Blood Donation Drive',
          title_hi: 'सामुदायिक स्वास्थ्य एवं रक्तदान शिविर',
          description: 'Annual health checkup camp and blood donor registration organized by local health volunteers.',
          description_hi: 'स्थानीय स्वास्थ्य स्वयंसेवकों द्वारा आयोजित वार्षिक स्वास्थ्य जांच शिविर और रक्तदान पंजीकरण।',
          category: 'Health & Wellness',
          city: 'Indore',
          tier: 'Tier 2',
          location: 'Nehru Park Community Centre, Indore, MP',
          startDate: new Date('2026-09-01T09:00:00+05:30'),
          endDate: new Date('2026-09-01T15:00:00+05:30'),
          date: '2026-09-01',
          time: '09:00 AM - 03:00 PM',
          timezone: 'Asia/Kolkata',
          organizer: organizer._id,
          organizerName: 'Indore Youth Welfare Forum & Red Cross',
          capacity: 300,
          attendeesCount: 95,
          attendees: [],
          rsvpedUsers: [],
          imageUrl: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800',
          image: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800',
          imageUrlAlt: 'Medical volunteers assisting donors at community health and blood donation registration desk',
          tags: ['Health', 'Blood Donation', 'Indore', 'Wellness'],
          language: 'hi',
          isFeatured: true,
        },
        {
          title: 'European Micro-Entrepreneurship Conference',
          title_hi: 'यूरोपीय सूक्ष्म-उद्यमिता सम्मेलन',
          description: 'Keynotes on sustainable small-town entrepreneurship, local funding, and modern digital tools.',
          description_hi: 'सतत छोटे शहर की उद्यमिता, स्थानीय वित्तपोषण और आधुनिक डिजिटल उपकरणों पर व्याख्यान।',
          category: 'Career & Jobs',
          city: 'London / Hybrid',
          tier: 'Tier 2',
          location: 'Hybrid / Europe Hub',
          startDate: new Date('2026-09-10T16:00:00+01:00'),
          endDate: new Date('2026-09-10T19:30:00+01:00'),
          date: '2026-09-10',
          time: '04:00 PM - 07:30 PM BST',
          timezone: 'Europe/London',
          organizer: organizer._id,
          organizerName: 'Global Small Business Forum',
          capacity: 250,
          attendeesCount: 110,
          attendees: [],
          rsvpedUsers: [],
          imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
          image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
          imageUrlAlt: 'Keynote speaker addressing an audience at European micro-entrepreneurship conference',
          tags: ['Business', 'Entrepreneurship', 'Global'],
          language: 'en',
          isFeatured: false,
        },
        {
          title: 'Regional Folk Art & Music Festival',
          title_hi: 'क्षेत्रीय लोक कला एवं संगीत महोत्सव',
          description: 'Celebrating local handicraft artisans, traditional dance performances, and street food stalls.',
          description_hi: 'स्थानीय हस्तशिल्प कारीगरों, पारंपरिक नृत्य प्रस्तुतियों और स्ट्रीट फूड स्टालों का उत्सव।',
          category: 'Cultural Festivals',
          city: 'Patna',
          tier: 'Tier 2',
          location: 'Gandhi Maidan, Patna, Bihar',
          startDate: new Date('2026-09-25T17:30:00+05:30'),
          endDate: new Date('2026-09-25T22:00:00+05:30'),
          date: '2026-09-25',
          time: '05:30 PM - 10:00 PM',
          timezone: 'Asia/Kolkata',
          organizer: organizer._id,
          organizerName: 'Bihar Cultural Academy',
          capacity: 800,
          attendeesCount: 420,
          attendees: [],
          rsvpedUsers: [],
          imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
          image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
          imageUrlAlt: 'Folk dancers performing in traditional colorful attire on stage at Patna cultural festival',
          tags: ['Culture', 'Art', 'Heritage', 'Patna'],
          language: 'hi',
          isFeatured: false,
        },
        {
          title: 'Swachh City E-Waste Recycling & Civic Awareness Drive',
          title_hi: 'स्वच्छ शहर ई-कचरा पुनर्चक्रण और नागरिक जागरूकता अभियान',
          description: 'Bring your broken electronics, plastic waste, and old batteries for safe recycling. Earn eco-reward points and free saplings.',
          description_hi: 'सुरक्षित पुनर्चक्रण के लिए अपने टूटे हुए इलेक्ट्रॉनिक्स, प्लास्टिक कचरा और पुरानी बैटरियां लाएं।',
          category: 'Civic & Community',
          city: 'Bhopal',
          tier: 'Tier 2',
          location: 'Smart City Park, TT Nagar, Bhopal',
          startDate: new Date('2026-08-12T08:00:00+05:30'),
          endDate: new Date('2026-08-12T12:00:00+05:30'),
          date: '2026-08-12',
          time: '08:00 AM - 12:00 PM',
          timezone: 'Asia/Kolkata',
          organizer: organizer._id,
          organizerName: 'Green Bhopal Action Club',
          capacity: 200,
          attendeesCount: 45,
          attendees: [],
          rsvpedUsers: [],
          imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800',
          image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800',
          imageUrlAlt: 'Civic awareness banner and recycling bin setup in Bhopal park',
          tags: ['Civic', 'Environment', 'Bhopal', 'Tier 2'],
          language: 'hi',
          isFeatured: false,
        },
      ];

      const createdEvents = await Event.insertMany(unifiedEvents);

      // Link RSVP to resident user
      if (createdEvents.length > 0) {
        if (!resident.rsvpedEvents.includes(createdEvents[0]._id)) {
          resident.rsvpedEvents.push(createdEvents[0]._id);
          await resident.save();
        }
      }
      console.log(`✅ Successfully seeded ${createdEvents.length} events!`);
    }

    console.log('✅ Seeding complete! Sample accounts created:');
    console.log(' - Organizer: organizer@indore.org | password123 (Verified)');
    console.log(' - Resident:  resident@indore.org  | password123 (Verified)');
    console.log(' - Unverified: unverified@indore.org | password123 (Unverified)');
    console.log(' - Admin:      admin@indore.org      | password123 (Verified)');
  } catch (err) {
    console.error('❌ Seed Error:', err.message);
  }
};

// Allow direct CLI execution (node seed.js) or module import in server.js
if (require.main === module) {
  const runDirectSeed = async () => {
    await connectDB();
    await seedData();
    process.exit(0);
  };
  runDirectSeed();
} else {
  module.exports = seedData;
}
