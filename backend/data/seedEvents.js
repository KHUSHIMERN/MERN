const INITIAL_EVENTS = [
  {
    id: 'evt-1',
    itemKey: 'evt1',
    title: 'Tech Summit Bengaluru 2026',
    title_hi: 'टेक समिट बेंगलुरु 2026',
    description_hi: 'एआई डेवलपर्स, स्टार्टअप संस्थापकों और क्लाउड इंजीनियरों को एक साथ लाने वाला वार्षिक टेक शिखर सम्मेलन।',
    title_kn: 'ಟೆಕ್ ಸಮ್ಮಿಟ್ ಬೆಂಗಳೂರು 2026',
    description_kn: 'ಎಐ ಡೆವಲಪರ್‌ಗಳು, ಸ್ಟಾರ್ಟಪ್ ಸಂಸ್ಥಾಪಕರು ಮತ್ತು ಕ್ಲೌಡ್ ಎಂಜಿನಿಯರ್‌ಗಳನ್ನು ಒಟ್ಟುಗೂಡಿಸುವ ವಾರ್ಷಿಕ ತಂತ್ರಜ್ಞಾನ ಸಮ್ಮೇಳನ.',
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
    title_hi: 'कर्नाटक सांस्कृतिक एवं लोक महोत्सव',
    description_hi: 'यक्षगान, डोलू कुनिथा, संगीत और स्थानीय व्यंजनों के स्टालों के साथ समृद्ध विरासत का जश्न मनाएं।',
    title_kn: 'ಕರ್ನಾಟಕ ಸಾಂಸ್ಕೃತಿಕ ಮತ್ತು ಜಾನಪದ ಉತ್ಸವ',
    description_kn: 'ಯಕ್ಷಗಾನ, ಡೊಳ್ಳು ಕುಣಿತ, ಸಂಗೀತ ಮತ್ತು ಸ್ಥಳೀಯ ಪಾಕಪದ್ಧತಿಯ ಮಳಿಗೆಗಳೊಂದಿಗೆ ಶ್ರೀಮಂತ ಪರಂಪರೆಯನ್ನು ಆಚರಿಸಿ.',
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
    title_hi: 'फुलस्टैक रिएक्ट एवं नोड कार्यशाला',
    description_hi: 'रिएक्ट 19, i18n, एक्सप्रेस और मोंगोडीबी एकीकरण पर व्यावहारिक कोडिंग कार्यशाला।',
    title_kn: 'ಫುಲ್‌ಸ್ಟಾಕ್ ರಿಯಾಕ್ಟ್ ಮತ್ತು ನೋಡ್ ಕಾರ್ಯಾಗಾರ',
    description_kn: 'ರಿಯಾಕ್ಟ್ 19, ಐ18ಎನ್, ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಮತ್ತು ಮಾಂಗೋಡಿಬಿ ಸಂಯೋಜನೆಯ ಕುರಿತು ಪ್ರಾಯೋಗಿಕ ಕಾರ್ಯಾಗಾರ.',
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
  },
  {
    id: 'evt-11',
    itemKey: 'evt11',
    title: 'Patna Coding & AI Workshop',
    title_hi: 'पटना कोडिंग एवं एआई कार्यशाला',
    description: 'Hands-on practical coding workshop covering Python, web development, and AI algorithms near Patna.',
    description_hi: 'पटना में पायथन, वेब डेवलपमेंट और एआई एल्गोरिदम पर व्यावहारिक कोडिंग कार्यशाला।',
    organizerId: 'org-bihar-devs',
    category: 'workshop',
    city: 'Patna',
    tier: 'Tier 2',
    tags: ['coding', 'ai', 'workshop', 'patna', 'python', 'developer'],
    startDate: new Date('2026-11-07T10:00:00.000Z'),
    endDate: new Date('2026-11-08T17:00:00.000Z'),
    location: {
      placeName: 'Fraser Road, Patna',
      latitude: 25.6100,
      longitude: 85.1414
    },
    published: true,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
    date: '2026-11-07',
    seatsLeft: 40
  },
  {
    id: 'evt-12',
    itemKey: 'evt12',
    title: 'Jaipur Community Mega Job Fair & Career Expo',
    title_hi: 'जयपुर कम्युनिटी मेगा जॉब फेयर एवं करियर एक्सपो',
    title_kn: 'ಜೈಪುರ ಸಮುದಾಯ ಮೆಗಾ ಜಾಬ್ ಫೇರ್ ಮತ್ತು ವೃತ್ತಿ ಎಕ್ಸ್‌ಪೋ',
    description: 'Free mega job fair connecting job seekers, college graduates, and professionals with 40+ hiring companies, IT startups, and vocational skill institutions.',
    description_hi: 'नौकरी चाहने वालों और पेशेवरों को 40 से अधिक कंपनियों और स्टार्टअप से जोड़ने वाला निःशुल्क रोजगार मेला।',
    description_kn: 'ಉದ್ಯೋಗಾಕಾಂಕ್ಷಿಗಳು ಮತ್ತು ವೃತ್ತಿಪರರನ್ನು 40 ಕ್ಕೂ ಹೆಚ್ಚು ಕಂಪನಿಗಳು ಮತ್ತು ಸ್ಟಾರ್ಟಪ್‌ಗಳೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುವ ಉಚಿತ ಮೆಗಾ ಉದ್ಯೋಗ ಮೇಳ.',
    organizerId: 'org-career-services',
    category: 'career',
    city: 'Jaipur',
    tier: 'Tier 2',
    tags: ['job', 'jobs', 'fairs', 'career', 'free', 'hiring', 'interview', 'jaipur'],
    startDate: new Date('2026-11-20T10:00:00.000Z'),
    endDate: new Date('2026-11-20T17:00:00.000Z'),
    location: {
      placeName: 'Vidhyadhar Nagar Community Hall, Jaipur',
      latitude: 26.9622,
      longitude: 75.7725
    },
    isFree: true,
    price: 0,
    published: true,
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=80',
    date: '2026-11-20',
    seatsLeft: 250
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

const memoryFeedbacks = [
  {
    _id: 'fb-101',
    id: 'fb-101',
    eventId: 'evt-1',
    userId: 'user-aarav-1',
    userName: 'Aarav Sharma',
    userEmail: 'aarav.sharma@example.com',
    rating: 5,
    comment: 'Incredible sessions on AI agents and scalable cloud architectures. The speaker panels were world-class!',
    isVerifiedAttendee: true,
    createdAt: '2026-08-18T10:30:00.000Z',
    updatedAt: '2026-08-18T10:30:00.000Z'
  },
  {
    _id: 'fb-102',
    id: 'fb-102',
    eventId: 'evt-1',
    userId: 'user-priya-2',
    userName: 'Priya Venkatesh',
    userEmail: 'priya.v@example.com',
    rating: 4,
    comment: 'Great networking opportunity and developer workshops. Venue catering could be expanded.',
    isVerifiedAttendee: true,
    createdAt: '2026-08-18T14:15:00.000Z',
    updatedAt: '2026-08-18T14:15:00.000Z'
  },
  {
    _id: 'fb-103',
    id: 'fb-103',
    eventId: 'evt-1',
    userId: 'user-rohan-3',
    userName: 'Rohan Deshmukh',
    userEmail: 'rohan.d@example.com',
    rating: 5,
    comment: 'Hands down the best tech developer conference in Bengaluru this year. 10/10 recommendation!',
    isVerifiedAttendee: true,
    createdAt: '2026-08-19T09:00:00.000Z',
    updatedAt: '2026-08-19T09:00:00.000Z'
  },
  {
    _id: 'fb-104',
    id: 'fb-104',
    eventId: 'evt-3',
    userId: 'user-ananya-4',
    userName: 'Ananya Rao',
    userEmail: 'ananya.r@example.com',
    rating: 5,
    comment: 'Hands-on live coding exercises were super clear and well paced for React beginners.',
    isVerifiedAttendee: true,
    createdAt: '2026-08-21T11:20:00.000Z',
    updatedAt: '2026-08-21T11:20:00.000Z'
  }
];

const SKILL_MAPPINGS = {
  'evt-1': { isVolunteerOpportunity: true, requiredSkills: ['AI & Cloud', 'Web Development', 'Event Coordination', 'Public Speaking'] },
  'evt-2': { isVolunteerOpportunity: true, requiredSkills: ['Crowd Management', 'Hospitality', 'Music & Arts', 'First Aid'] },
  'evt-3': { isVolunteerOpportunity: true, requiredSkills: ['Coding', 'Web Development', 'Teaching & Mentoring'] },
  'evt-4': { isVolunteerOpportunity: true, requiredSkills: ['Photography', 'Social Media', 'Music & Arts'] },
  'evt-5': { isVolunteerOpportunity: false, requiredSkills: ['Event Coordination', 'Public Speaking', 'Graphic Design'] },
  'evt-pending-1': { isVolunteerOpportunity: true, requiredSkills: ['Environmental Science', 'Community Organizing', 'Teaching & Mentoring'] },
};

// Ensure initial events have verification, report tracking, and volunteer skill defaults
INITIAL_EVENTS.forEach((evt) => {
  if (evt.isVerified === undefined) evt.isVerified = true;
  if (!evt.verificationStatus) evt.verificationStatus = 'verified';
  if (evt.reportsCount === undefined) evt.reportsCount = 0;
  if (evt.volunteers === undefined) evt.volunteers = [];

  const mapping = SKILL_MAPPINGS[evt.id];
  if (mapping) {
    evt.isVolunteerOpportunity = mapping.isVolunteerOpportunity;
    evt.requiredSkills = mapping.requiredSkills;
  } else {
    if (evt.isVolunteerOpportunity === undefined) {
      evt.isVolunteerOpportunity = evt.category === 'Skill Workshops' || evt.category === 'Civic & Community';
    }
    if (!evt.requiredSkills || evt.requiredSkills.length === 0) {
      evt.requiredSkills = ['Community Organizing', 'Communication'];
    }
  }
});

// Sample pending event to verify admin approval queue
if (!INITIAL_EVENTS.find((e) => e.id === 'evt-pending-1')) {
  INITIAL_EVENTS.push({
    id: 'evt-pending-1',
    itemKey: 'evtPending1',
    title: 'Youth Green Energy & Solar Workshop Bhopal',
    description: 'Community-led technical training for rooftop solar installations and renewable battery management in Tier-2/3 districts.',
    organizerId: 'org-green-energy',
    category: 'Skill Workshops',
    tags: ['solar', 'energy', 'bhopal', 'green'],
    startDate: new Date('2026-09-12T10:00:00.000Z'),
    endDate: new Date('2026-09-12T16:00:00.000Z'),
    location: {
      placeName: 'Arera Colony Community Center, Bhopal',
      latitude: 23.2156,
      longitude: 77.4354,
    },
    city: 'Bhopal',
    published: true,
    isVerified: false,
    verificationStatus: 'pending',
    reportsCount: 0,
    image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
    date: '2026-09-12',
    seatsLeft: 40,
  });
}

const memoryReports = [
  {
    _id: 'rep-1',
    id: 'rep-1',
    eventId: 'evt-2',
    eventTitle: 'Karnataka Cultural & Folk Festival',
    reporterId: 'user-resident-1',
    reporterName: 'Vikram Patel',
    reporterEmail: 'vikram.p@example.com',
    reason: 'misleading',
    details: 'Ticket prices at venue differ from the free entry claim posted in initial description.',
    status: 'pending',
    actionTaken: 'none',
    adminNotes: '',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z'
  }
];

module.exports = {
  INITIAL_EVENTS,
  memoryRegistrations,
  memoryAuditLogs,
  memoryFeedbacks,
  memoryReports
};
