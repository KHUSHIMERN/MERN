const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        host: 'localhost',
        port: 5000,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTask3Tests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING TASK 3: ADMIN ROLE APPROVAL & AUDIT LOGGING E2E TESTS');
  console.log('=============================================================\n');

  try {
    // 1. Create a Resident and submit an Organizer Role Request
    const residentEmail = `resident_task3_${Date.now()}@indore.org`;
    console.log(`[TEST 1] Registering resident for approval test: ${residentEmail}...`);
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Task 3 Resident',
      email: residentEmail,
      password: 'password123',
      role: 'resident',
    });

    const token = regRes.body.verificationToken;
    await request('GET', `/api/auth/verify?token=${token}`);

    const residentLogin = await request('POST', '/api/auth/login', { email: residentEmail, password: 'password123' });
    const residentHeader = { Authorization: `Bearer ${residentLogin.body.token}` };

    // Resident submits role request
    const roleReq = await request(
      'POST',
      '/api/roles/requests',
      { message: 'Requesting organizer access to publish health fairs.' },
      residentHeader
    );
    const requestId = roleReq.body.roleRequest?.id || roleReq.body.user?._id;
    console.log(` -> Role request created for ${residentEmail}! Request ID: ${requestId}`);

    // 2. Non-Admin Security Access Control Check
    console.log('\n[TEST 2] Testing non-admin access to admin endpoint /api/admin/roles/requests...');
    const unauthorizedRes = await request('GET', '/api/admin/roles/requests', null, residentHeader);
    console.log(` -> Non-Admin Access Status: ${unauthorizedRes.status} (Expected 403)`);
    console.log(` -> Error Message: "${unauthorizedRes.body.message}"`);

    if (unauthorizedRes.status !== 403) {
      throw new Error('Security check failed! Non-admin user was not blocked.');
    }
    console.log(' -> requireRole("admin") Middleware Verified: Non-admin blocked! ✓');

    // 3. Admin Login & View Paginated Role Requests
    console.log('\n[TEST 3] Admin login & fetching pending role requests...');
    // Login with seeded admin account
    const adminLogin = await request('POST', '/api/auth/login', { email: 'admin@indore.org', password: 'password123' });
    
    // If seeded admin account doesn't exist, create one directly in DB
    let adminHeader = null;
    if (adminLogin.status === 200 && adminLogin.body.token) {
      adminHeader = { Authorization: `Bearer ${adminLogin.body.token}` };
    } else {
      // Seeded admin login attempt fallback
      const adminReg = await request('POST', '/api/auth/register', {
        name: 'Super Admin',
        email: `admin_${Date.now()}@indore.org`,
        password: 'password123',
        role: 'resident',
      });
      await request('GET', `/api/auth/verify?token=${adminReg.body.verificationToken}`);
      const aLogin = await request('POST', '/api/auth/login', { email: adminReg.body.email, password: 'password123' });
      adminHeader = { Authorization: `Bearer ${aLogin.body.token}` };
    }

    const adminRequestsRes = await request('GET', '/api/admin/roles/requests?status=pending', null, adminHeader);
    console.log(` -> Admin Role Requests Fetch Status: ${adminRequestsRes.status}`);
    console.log(` -> Pending Requests Count: ${adminRequestsRes.body.count}`);

    if (adminRequestsRes.status !== 200 || !Array.isArray(adminRequestsRes.body.requests)) {
      throw new Error('Admin role requests fetch failed!');
    }

    // 4. Admin Approves Role Request via PATCH /api/admin/roles/requests/:id
    console.log(`\n[TEST 4] Admin approving role request ID: ${requestId}...`);
    const approveRes = await request(
      'PATCH',
      `/api/admin/roles/requests/${requestId}`,
      { status: 'approved', adminNote: 'Verified local health NGO credentials.' },
      adminHeader
    );

    console.log(` -> Approval Status: ${approveRes.status}`);
    console.log(` -> Message: "${approveRes.body.message}"`);
    console.log(` -> Request Status on Doc: "${approveRes.body.request?.status}"`);
    console.log(` -> Promoted User Role: "${approveRes.body.user?.role}" (Expected "organizer")`);
    console.log(` -> Audit Log Action Recorded: "${approveRes.body.auditLog?.action}"`);

    if (
      approveRes.status !== 200 ||
      approveRes.body.request?.status !== 'approved' ||
      approveRes.body.user?.role !== 'organizer' ||
      approveRes.body.auditLog?.action !== 'ROLE_REQUEST_APPROVED'
    ) {
      throw new Error('Admin role request approval test failed!');
    }
    console.log(' -> User successfully promoted to ORGANIZER with AuditLog entry! ✓');

    console.log('\n=============================================================');
    console.log('🎉 ALL TASK 3 ADMIN APPROVAL & AUDIT LOG TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (err) {
    console.error('\n❌ Test Failure:', err.message);
  }
}

setTimeout(runTask3Tests, 5000);
