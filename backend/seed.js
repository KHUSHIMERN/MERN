const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('./models/Event');
const connectDB = require('./config/db');

dotenv.config();

const sampleEvents = [
  {
    title: 'Tier-2 Youth Job Fair & Skill Expo',
    description: 'Connect with over 40 leading regional employers, startups, and vocational training partners in Rajasthan.',
    category: 'career',
    location: 'Jaipur Exhibition Centre, Jaipur, Rajasthan',
    startDate: new Date('2026-08-15T10:00:00+05:30'),
    endDate: new Date('2026-08-15T17:00:00+05:30'),
    timezone: 'Asia/Kolkata',
    organizer: 'Rajasthan Skill Development Mission',
    capacity: 500,
    attendeesCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
    imageUrlAlt: 'Crowd of young job seekers interacting with recruiters at Rajasthan youth job fair booths'
  },
  {
    title: 'Global Tech & AI Workshop (Live Virtual)',
    description: 'Learn modern Web Dev & AI integration fundamentals with global guest speakers.',
    category: 'workshop',
    location: 'Online / Zoom Live Stream',
    startDate: new Date('2026-08-20T14:00:00-04:00'),
    endDate: new Date('2026-08-20T17:00:00-04:00'),
    timezone: 'America/New_York',
    organizer: 'OpenSource Community Global',
    capacity: 1000,
    attendeesCount: 680,
    imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600',
    imageUrlAlt: 'Developer presenting AI integration code on a large screen to virtual workshop attendees'
  },
  {
    title: 'Community Health & Blood Donation Drive',
    description: 'Annual health checkup camp and blood donor registration organized by local health volunteers.',
    category: 'health',
    location: 'Nehru Park Community Centre, Indore, MP',
    startDate: new Date('2026-09-01T09:00:00+05:30'),
    endDate: new Date('2026-09-01T15:00:00+05:30'),
    timezone: 'Asia/Kolkata',
    organizer: 'Indore Youth Welfare Forum',
    capacity: 300,
    attendeesCount: 95,
    imageUrl: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=600',
    imageUrlAlt: 'Medical volunteers assisting donors at community health and blood donation registration desk'
  },
  {
    title: 'European Micro-Entrepreneurship Conference',
    description: 'Keynotes on sustainable small-town entrepreneurship, local funding, and modern digital tools.',
    category: 'career',
    location: 'Hybrid / Europe Hub',
    startDate: new Date('2026-09-10T16:00:00+01:00'),
    endDate: new Date('2026-09-10T19:30:00+01:00'),
    timezone: 'Europe/London',
    organizer: 'Global Small Business Forum',
    capacity: 250,
    attendeesCount: 110,
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600',
    imageUrlAlt: 'Keynote speaker addressing an audience at European micro-entrepreneurship conference'
  },
  {
    title: 'Regional Folk Art & Music Festival',
    description: 'Celebrating local handicraft artisans, traditional dance performances, and street food stalls.',
    category: 'culture',
    location: 'Gandhi Maidan, Patna, Bihar',
    startDate: new Date('2026-09-25T17:30:00+05:30'),
    endDate: new Date('2026-09-25T22:00:00+05:30'),
    timezone: 'Asia/Kolkata',
    organizer: 'Bihar Cultural Academy',
    capacity: 800,
    attendeesCount: 420,
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
    imageUrlAlt: 'Folk dancers performing in traditional colorful attire on stage at Patna cultural festival'
  }
];

const seedDB = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected for seeding...');
    await Event.deleteMany({});
    console.log('Cleared existing events.');
    const seeded = await Event.insertMany(sampleEvents);
    console.log(`Successfully seeded ${seeded.length} events with valid IANA timezones!`);
    seeded.forEach(e => {
      console.log(` - ${e.title} [Timezone: ${e.timezone}] Start: ${e.startDate.toISOString()}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error seeding DB:', error);
    process.exit(1);
  }
};

seedDB();
