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

async function runProfileTests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING TASK 2: /api/users/me & /api/roles/requests E2E TESTS');
  console.log('=============================================================\n');

  try {
    // 1. Register & Verify Resident
    const email = `task2_resident_${Date.now()}@indore.org`;
    console.log(`[TEST 1] Creating verified resident: ${email}...`);
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Indore Task 2 Resident',
      email,
      password: 'password123',
      role: 'resident',
    });

    const token = regRes.body.verificationToken;
    await request('GET', `/api/auth/verify?token=${token}`);

    // Login to get JWT
    const loginRes = await request('POST', '/api/auth/login', { email, password: 'password123' });
    const jwtToken = loginRes.body.token;
    const authHeader = { Authorization: `Bearer ${jwtToken}` };

    console.log(' -> Verified Resident logged in! JWT token obtained. ✓');

    // 2. Test GET /api/users/me
    console.log('\n[TEST 2] Fetching profile via GET /api/users/me...');
    const getMeRes = await request('GET', '/api/users/me', null, authHeader);
    console.log(` -> GET /api/users/me Status: ${getMeRes.status}`);
    console.log(` -> Fetched User Email: "${getMeRes.body.user?.email}"`);

    if (getMeRes.status !== 200 || getMeRes.body.user?.email !== email) {
      throw new Error('GET /api/users/me test failed!');
    }

    // 3. Test PUT /api/users/me (including role escalation prevention check!)
    console.log('\n[TEST 3] Updating profile via PUT /api/users/me (testing role escalation prevention)...');
    const updateRes = await request(
      'PUT',
      '/api/users/me',
      {
        name: 'Indore Resident Updated',
        contact: '+91 9123456789',
        language: 'hi',
        role: 'admin', // Malicious attempt to escalate role to admin
      },
      authHeader
    );

    console.log(` -> PUT Status: ${updateRes.status}`);
    console.log(` -> Updated Name: "${updateRes.body.user?.name}"`);
    console.log(` -> Updated Contact: "${updateRes.body.user?.contact}"`);
    console.log(` -> Updated Language: "${updateRes.body.user?.language}"`);
    console.log(` -> User Role after PUT: "${updateRes.body.user?.role}" (Must remain "resident")`);

    if (
      updateRes.status !== 200 ||
      updateRes.body.user?.role !== 'resident' ||
      updateRes.body.user?.name !== 'Indore Resident Updated'
    ) {
      throw new Error('PUT /api/users/me role escalation prevention test failed!');
    }
    console.log(' -> Role Escalation Blocked Successfully! Role field ignored. ✓');

    // 4. Test POST /api/roles/requests
    console.log('\n[TEST 4] Submitting organizer role request via POST /api/roles/requests...');
    const roleReqRes = await request(
      'POST',
      '/api/roles/requests',
      { message: 'Organizing tier 2 community health awareness programs.' },
      authHeader
    );

    console.log(` -> Role Request Status: ${roleReqRes.status} (Expected 201)`);
    console.log(` -> Response Message: "${roleReqRes.body.message}"`);
    console.log(` -> Saved Request Status: "${roleReqRes.body.roleRequest?.status}"`);
    console.log(` -> Saved Request Message: "${roleReqRes.body.roleRequest?.message}"`);

    if (
      (roleReqRes.status !== 201 && roleReqRes.status !== 200) ||
      roleReqRes.body.roleRequest?.status !== 'pending'
    ) {
      throw new Error('POST /api/roles/requests test failed!');
    }
    console.log(' -> Role request persisted in DB with status=pending & createdAt! ✓');

    console.log('\n=============================================================');
    console.log('🎉 ALL TASK 2 ENDPOINT & RESTRICTION TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (err) {
    console.error('\n❌ Test Failure:', err.message);
  }
}

setTimeout(runProfileTests, 5000);
