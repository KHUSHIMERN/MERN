const INITIAL_EVENTS = [
  {
    id: 'evt-1',
    itemKey: 'evt1',
    title: 'Tech Summit Bengaluru 2026',
    description: 'An annual tech summit gathering AI developers, startup founders, and cloud engineers.',
    organizerId: 'org-tech-hub',
    category: 'tech',
    tags: ['ai', 'cloud', 'bengaluru', 'developers'],
    startDate: new Date('2026-08-15T09:00:00.000Z'),
    endDate: new Date('2026-08-17T18:00:00.000Z'),
    location: {
      placeName: 'Electronic City, Bengaluru',
      latitude: 12.8399,
      longitude: 77.677
    },
    published: true,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
    date: '2026-08-15',
    seatsLeft: 35
  },
  {
    id: 'evt-2',
    itemKey: 'evt2',
    title: 'Karnataka Cultural & Folk Festival',
    description: 'Celebrate rich heritage with Yakshagana, Dollu Kunitha, music, and local cuisine stalls.',
    organizerId: 'org-karnataka-heritage',
    category: 'culture',
    tags: ['culture', 'folk', 'mysuru', 'music', 'food'],
    startDate: new Date('2026-08-22T10:00:00.000Z'),
    endDate: new Date('2026-08-24T22:00:00.000Z'),
    location: {
      placeName: 'Palace Grounds, Mysuru',
      latitude: 12.3052,
      longitude: 76.6552
    },
    published: true,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    date: '2026-08-22',
    seatsLeft: 120
  },
  {
    id: 'evt-3',
    itemKey: 'evt3',
    title: 'Fullstack React & Node Workshop',
    description: 'Hands-on practical workshop covering React 19, i18n, Express, and MongoDB integration.',
    organizerId: 'org-dev-academy',
    category: 'workshop',
    tags: ['react', 'node', 'mongodb', 'workshop', 'javascript'],
    startDate: new Date('2026-09-02T10:00:00.000Z'),
    endDate: new Date('2026-09-02T17:00:00.000Z'),
    location: {
      placeName: 'Koramangala, Bengaluru',
      latitude: 12.9352,
      longitude: 77.6245
    },
    published: true,
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80',
    date: '2026-09-02',
    seatsLeft: 14
  },
  {
    id: 'evt-4',
    itemKey: 'evt4',
    title: 'Green City Cleanliness Drive',
    description: 'Join environmental volunteers for tree planting and park restoration initiative.',
    organizerId: 'org-green-earth',
    category: 'charity',
    tags: ['environment', 'charity', 'volunteer', 'cubbon-park'],
    startDate: new Date('2026-09-10T07:00:00.000Z'),
    endDate: new Date('2026-09-10T12:00:00.000Z'),
    location: {
      placeName: 'Cubbon Park, Bengaluru',
      latitude: 12.9763,
      longitude: 77.5929
    },
    published: true,
    image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&auto=format&fit=crop&q=80',
    date: '2026-09-10',
    seatsLeft: 80
  },
  {
    id: 'evt-5',
    itemKey: 'evt5',
    title: 'AI & Cloud Hackathon 2026',
    description: '48-hour competitive coding hackathon solving real-world civic challenges using LLMs.',
    organizerId: 'org-tech-hub',
    category: 'tech',
    tags: ['ai', 'hackathon', 'coding', 'cloud'],
    startDate: new Date('2026-09-18T09:00:00.000Z'),
    endDate: new Date('2026-09-20T18:00:00.000Z'),
    location: {
      placeName: 'Whitefield, Bengaluru',
      latitude: 12.9698,
      longitude: 77.7499
    },
    published: true,
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80',
    date: '2026-09-18',
    seatsLeft: 50
  },
  {
    id: 'evt-6',
    itemKey: 'evt6',
    title: 'Mysuru Dasara Music & Classical Evening',
    description: 'Enchanting Carnatic instrumental performance featuring veena and mridangam virtuosos.',
    organizerId: 'org-karnataka-heritage',
    category: 'culture',
    tags: ['culture', 'music', 'classical', 'mysuru'],
    startDate: new Date('2026-09-25T18:00:00.000Z'),
    endDate: new Date('2026-09-25T22:00:00.000Z'),
    location: {
      placeName: 'Jaganmohan Palace, Mysuru',
      latitude: 12.3061,
      longitude: 76.6497
    },
    published: true,
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
    date: '2026-09-25',
    seatsLeft: 60
  },
  {
    id: 'evt-7',
    itemKey: 'evt7',
    title: 'Startup Pitch & Investor Connect',
    description: 'Networking event connecting seed-stage founders with venture capital funds.',
    organizerId: 'org-venture-forum',
    category: 'workshop',
    tags: ['startup', 'investors', 'pitch', 'networking'],
    startDate: new Date('2026-10-05T11:00:00.000Z'),
    endDate: new Date('2026-10-05T17:00:00.000Z'),
    location: {
      placeName: 'Indiranagar, Bengaluru',
      latitude: 12.9784,
      longitude: 77.6408
    },
    published: false,
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&auto=format&fit=crop&q=80',
    date: '2026-10-05',
    seatsLeft: 25
  },
  {
    id: 'evt-8',
    itemKey: 'evt8',
    title: 'Nandi Hills Sunrise Cycle Marathon',
    description: 'Early morning 60km endurance cycling rally from Hebbal to Nandi Hills peak.',
    organizerId: 'org-sports-club',
    category: 'charity',
    tags: ['cycling', 'sports', 'marathon', 'fitness'],
    startDate: new Date('2026-10-12T05:00:00.000Z'),
    endDate: new Date('2026-10-12T11:00:00.000Z'),
    location: {
      placeName: 'Nandi Hills Base, Chikkaballapur',
      latitude: 13.3702,
      longitude: 77.6835
    },
    published: true,
    image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=600&auto=format&fit=crop&q=80',
    date: '2026-10-12',
    seatsLeft: 100
  },
  {
    id: 'evt-9',
    itemKey: 'evt9',
    title: 'Women in Tech Leadership Summit',
    description: 'Keynote panels, career mentoring circles, and leadership strategies for women engineers.',
    organizerId: 'org-wit-india',
    category: 'tech',
    tags: ['tech', 'leadership', 'women-in-tech', 'mentorship'],
    startDate: new Date('2026-10-20T09:30:00.000Z'),
    endDate: new Date('2026-10-20T17:30:00.000Z'),
    location: {
      placeName: 'MG Road, Bengaluru',
      latitude: 12.9756,
      longitude: 77.6066
    },
    published: true,
    image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=600&auto=format&fit=crop&q=80',
    date: '2026-10-20',
    seatsLeft: 45
  },
  {
    id: 'evt-10',
    itemKey: 'evt10',
    title: 'Urban Permaculture & Organic Farming Expo',
    description: 'Interactive stalls and workshops on rooftop gardening, composting, and hydroponics.',
    organizerId: 'org-green-earth',
    category: 'charity',
    tags: ['farming', 'organic', 'environment', 'gardening'],
    startDate: new Date('2026-11-01T10:00:00.000Z'),
    endDate: new Date('2026-11-02T18:00:00.000Z'),
    location: {
      placeName: 'Lalbagh Botanical Garden, Bengaluru',
      latitude: 12.9507,
      longitude: 77.5848
    },
    published: false,
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
    date: '2026-11-01',
    seatsLeft: 70
  }
];

const memoryRegistrations = [
  {
    id: 'reg-101',
    eventId: 'evt-1',
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    ticketType: 'VIP Pass',
    attendees: 1,
    notes: 'Keynote Speaker',
    agreeTerms: true,
    statusPresent: true,
    checkInAt: '2026-07-27T09:15:00.000Z',
    rsvpStatus: 'confirmed',
    markedBy: 'Organizer Admin (admin@eventpulse.org)',
    createdAt: '2026-07-20T10:00:00.000Z'
  },
  {
    id: 'reg-102',
    eventId: 'evt-1',
    fullName: 'Priya Venkatesh',
    email: 'priya.v@example.com',
    ticketType: 'standard',
    attendees: 2,
    notes: 'Arriving with co-founder',
    agreeTerms: true,
    statusPresent: false,
    checkInAt: null,
    rsvpStatus: 'confirmed',
    markedBy: null,
    createdAt: '2026-07-21T11:30:00.000Z'
  },
  {
    id: 'reg-103',
    eventId: 'evt-1',
    fullName: 'Rohan Deshmukh',
    email: 'rohan.d@example.com',
    ticketType: 'student',
    attendees: 1,
    notes: '',
    agreeTerms: true,
    statusPresent: true,
    checkInAt: '2026-07-27T09:45:12.000Z',
    rsvpStatus: 'confirmed',
    markedBy: 'Organizer Admin (admin@eventpulse.org)',
    createdAt: '2026-07-22T08:15:00.000Z'
  },
  {
    id: 'reg-104',
    eventId: 'evt-1',
    fullName: 'Ananya Rao',
    email: 'ananya.rao@example.com',
    ticketType: 'standard',
    attendees: 1,
    notes: 'Dietary preference: Vegan',
    agreeTerms: true,
    statusPresent: false,
    checkInAt: null,
    rsvpStatus: 'confirmed',
    markedBy: null,
    createdAt: '2026-07-23T14:20:00.000Z'
  },
  {
    id: 'reg-105',
    eventId: 'evt-1',
    fullName: 'Karthik Subbaraj',
    email: 'karthik.sub@example.com',
    ticketType: 'standard',
    attendees: 1,
    notes: 'Waitlisted registrant',
    agreeTerms: true,
    statusPresent: false,
    checkInAt: null,
    rsvpStatus: 'waitlist',
    markedBy: null,
    createdAt: '2026-07-24T16:05:00.000Z'
  },
  {
    id: 'reg-106',
    eventId: 'evt-1',
    fullName: 'Meera Nambiar',
    email: 'meera.nambiar@example.com',
    ticketType: 'VIP Pass',
    attendees: 1,
    notes: 'Panelist',
    agreeTerms: true,
    statusPresent: false,
    checkInAt: null,
    rsvpStatus: 'waitlist',
    markedBy: null,
    createdAt: '2026-07-25T09:10:00.000Z'
  },
  {
    id: 'reg-107',
    eventId: 'evt-1',
    fullName: 'Siddharth Menon',
    email: 'sid.menon@example.com',
    ticketType: 'standard',
    attendees: 1,
    notes: '',
    agreeTerms: true,
    statusPresent: true,
    checkInAt: '2026-07-27T10:05:30.000Z',
    rsvpStatus: 'confirmed',
    markedBy: 'Organizer Admin (admin@eventpulse.org)',
    createdAt: '2026-07-25T11:00:00.000Z'
  },
  {
    id: 'reg-108',
    eventId: 'evt-1',
    fullName: 'Vikram Sundaram',
    email: 'vikram.s@example.com',
    ticketType: 'student',
    attendees: 1,
    notes: '',
    agreeTerms: true,
    statusPresent: false,
    checkInAt: null,
    rsvpStatus: 'confirmed',
    markedBy: null,
    createdAt: '2026-07-26T15:40:00.000Z'
  },
  {
    id: 'reg-201',
    eventId: 'evt-2',
    fullName: 'Deepak Gowda',
    email: 'deepak.gowda@example.com',
    ticketType: 'standard',
    attendees: 3,
    notes: 'Family booking',
    agreeTerms: true,
    statusPresent: true,
    checkInAt: '2026-07-27T08:30:00.000Z',
    rsvpStatus: 'confirmed',
    markedBy: 'Organizer Admin (admin@eventpulse.org)',
    createdAt: '2026-07-21T09:00:00.000Z'
  },
  {
    id: 'reg-202',
    eventId: 'evt-2',
    fullName: 'Shalini Hegde',
    email: 'shalini.h@example.com',
    ticketType: 'VIP Pass',
    attendees: 2,
    notes: 'Front row seats',
    agreeTerms: true,
    statusPresent: false,
    checkInAt: null,
    rsvpStatus: 'confirmed',
    markedBy: null,
    createdAt: '2026-07-22T13:45:00.000Z'
  }
];

const memoryAuditLogs = [
  {
    id: 'log-1',
    action: 'ATTENDANCE_CHECKIN',
    eventId: 'evt-1',
    registrationId: 'reg-101',
    attendeeName: 'Aarav Sharma',
    attendeeEmail: 'aarav.sharma@example.com',
    statusPresent: true,
    checkInAt: '2026-07-27T09:15:00.000Z',
    performedBy: 'Organizer Admin (admin@eventpulse.org)',
    userRole: 'organizer',
    timestamp: '2026-07-27T09:15:00.000Z'
  },
  {
    id: 'log-2',
    action: 'ATTENDANCE_CHECKIN',
    eventId: 'evt-1',
    registrationId: 'reg-103',
    attendeeName: 'Rohan Deshmukh',
    attendeeEmail: 'rohan.d@example.com',
    statusPresent: true,
    checkInAt: '2026-07-27T09:45:12.000Z',
    performedBy: 'Organizer Admin (admin@eventpulse.org)',
    userRole: 'organizer',
    timestamp: '2026-07-27T09:45:12.000Z'
  }
];

module.exports = { INITIAL_EVENTS, memoryRegistrations, memoryAuditLogs };
