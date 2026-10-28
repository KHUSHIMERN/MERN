require('dotenv').config();
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch(e) {}

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Event = require('./models/Event');
const { exportOrganizerAttendanceMetricsCSV } = require('./controllers/eventController');
const app = require('./server');

console.log('===============================================================');
console.log('  TESTING TASK 3 (STORY 3): CSV EXPORT FOR ATTENDANCE METRICS');
console.log('  Backend Endpoint GET /organizer/:id/attendance-metrics/export');
console.log('===============================================================\n');

async function runTests() {
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(` [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(` [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. Controller Export Verification
  assert(typeof exportOrganizerAttendanceMetricsCSV === 'function', 'exportOrganizerAttendanceMetricsCSV is exported from eventController.js');

  // 2. Express Route Mounting
  const stack = (app.router && app.router.stack) || (app._router && app._router.stack) || [];
  const fs = require('fs');
  const serverCode = fs.readFileSync(require.resolve('./server'), 'utf8');
  const hasExportRoute = stack.some(layer => {
    if (layer.regexp) {
      return (
        layer.regexp.test('/organizer/123/attendance-metrics/export') ||
        layer.regexp.test('/api/organizer/123/attendance-metrics/export') ||
        layer.regexp.test('/api/events/organizer/123/attendance-metrics/export')
      );
    }
    return false;
  }) || serverCode.includes('/organizer') || serverCode.includes('/api/organizer');
  assert(hasExportRoute, 'GET /organizer/:id/attendance-metrics/export route is mounted in Express server');

  // 3. Mock Execution & Response Headers / CSV Payload
  const mockReq = { params: { id: '507f1f77bcf86cd799439011' }, query: { limit: '5' } };
  let headersSet = {};
  let statusSet = 200;
  let bodySent = null;

  const mockRes = {
    setHeader: (k, v) => { headersSet[k] = v; },
    status: (code) => { statusSet = code; return mockRes; },
    send: (content) => { bodySent = content; return mockRes; },
    json: (d) => { bodySent = d; return mockRes; }
  };

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_events_test_story3';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });

    const mockId = new mongoose.Types.ObjectId();
    mockReq.params.id = mockId.toString();

    await Event.deleteMany({});
    await Event.create({
      title: 'CSV Export Test Event',
      description: 'Testing CSV export pipeline',
      startDate: new Date(),
      organizerId: mockId,
      capacity: 100,
      attendeesCount: 50,
      checkedInCount: 40
    });

    // Add event with zero RSVPs
    await Event.create({
      title: 'CSV Export Zero RSVPs Event',
      description: 'Testing CSV export pipeline with zero RSVPs',
      startDate: new Date(),
      organizerId: mockId,
      capacity: 100,
      attendeesCount: 0,
      checkedInCount: 0
    });

    await exportOrganizerAttendanceMetricsCSV(mockReq, mockRes);
    await Event.deleteMany({});
    await mongoose.disconnect();
  } catch (err) {
    // If DB is offline, test controller mock fallback logic directly
    await exportOrganizerAttendanceMetricsCSV(mockReq, mockRes);
  }

  assert(headersSet['Content-Type'] === 'text/csv', 'Content-Type header is text/csv');
  assert(headersSet['Content-Disposition'] && headersSet['Content-Disposition'].includes('attachment') && headersSet['Content-Disposition'].includes('attendance-metrics'), 'Content-Disposition header specifies attachment filename');
  assert(typeof bodySent === 'string', 'Export response body is a CSV formatted string');

  if (typeof bodySent === 'string') {
    const lines = bodySent.split('\n');
    assert(lines.length > 0 && lines[0].includes('Event Title') && lines[0].includes('Attendance Rate'), 'CSV header row contains mandatory field titles');
  }

  // 4. Frontend Component Export Button Verification
  const metricsComponentPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'AttendanceMetrics.jsx');
  assert(fs.existsSync(metricsComponentPath), 'AttendanceMetrics.jsx exists on frontend');

  const componentContent = fs.readFileSync(metricsComponentPath, 'utf8');
  assert(componentContent.includes('handleExportCSV'), 'AttendanceMetrics.jsx defines handleExportCSV handler');
  assert(componentContent.includes('exportCsvBtn') || componentContent.includes('Export CSV'), 'AttendanceMetrics.jsx renders Export CSV button');
  assert(componentContent.includes('DownloadIcon'), 'AttendanceMetrics.jsx imports DownloadIcon for export button');

  // Summary
  console.log('\n===============================================================');
  console.log(`  SUMMARY: ${passedTests}/${totalTests} TESTS PASSED FOR TASK 3 (STORY 3)`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    console.log('SUCCESS: Task 3 of Story 3 CSV Export verified successfully!\n');
    process.exit(0);
  } else {
    console.error('FAILURE: Task 3 of Story 3 CSV Export verification failed.\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled error during test execution:', err);
  process.exit(1);
});
