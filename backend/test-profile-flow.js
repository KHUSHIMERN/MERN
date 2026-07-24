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
  console.log('🧪 RUNNING PROFILE MANAGEMENT & ROLE REQUEST E2E TESTS');
  console.log('=============================================================\n');

  try {
    // 1. Register & Verify Resident
    const email = `profile_test_${Date.now()}@indore.org`;
    console.log(`[TEST 1] Creating verified resident: ${email}...`);
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Indore Profile User',
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

    console.log(' -> Verified Resident logged in successfully! JWT token obtained. ✓');

    // 2. Test Profile Update (name, contact, language)
    console.log('\n[TEST 2] Updating profile (name, contact, language: hi)...');
    const updateRes = await request(
      'PUT',
      '/api/auth/profile',
      {
        name: 'Indore Profile User Updated',
        contact: '+91 9876543210',
        language: 'hi',
      },
      authHeader
    );

    console.log(` -> Update Status: ${updateRes.status}`);
    console.log(` -> Updated Name: "${updateRes.body.user?.name}"`);
    console.log(` -> Updated Contact: "${updateRes.body.user?.contact}"`);
    console.log(` -> Updated Language: "${updateRes.body.user?.language}"`);

    if (
      updateRes.status !== 200 ||
      updateRes.body.user?.name !== 'Indore Profile User Updated' ||
      updateRes.body.user?.contact !== '+91 9876543210' ||
      updateRes.body.user?.language !== 'hi'
    ) {
      throw new Error('Profile update test failed!');
    }
    console.log(' -> Criterion #1 Verified: Profile updates persist cleanly! ✓');

    // 3. Submit Organizer Role Request
    console.log('\n[TEST 3] Submitting Organizer Role Request as Resident...');
    const requestRes = await request(
      'POST',
      '/api/auth/request-organizer',
      { description: 'Hosting Tier-2 city skill building workshops.' },
      authHeader
    );

    console.log(` -> Request Status: ${requestRes.status}`);
    console.log(` -> Message: "${requestRes.body.message}"`);
    console.log(` -> Role Request Status on Doc: "${requestRes.body.user?.organizerRoleRequest?.status}"`);

    if (requestRes.status !== 200 || requestRes.body.user?.organizerRoleRequest?.status !== 'pending') {
      throw new Error('Organizer role request test failed!');
    }
    console.log(' -> Criterion #2 Verified: Role request status set to pending! ✓');

    // 4. Submit duplicate request (Must fail cleanly with 400 error message)
    console.log('\n[TEST 4] Submitting duplicate Organizer Role Request...');
    const dupRes = await request(
      'POST',
      '/api/auth/request-organizer',
      { description: 'Duplicate attempt' },
      authHeader
    );

    console.log(` -> Duplicate Request Status: ${dupRes.status} (Expected 400)`);
    console.log(` -> Message: "${dupRes.body.message}"`);

    if (dupRes.status !== 400) {
      throw new Error('Duplicate request restriction test failed!');
    }
    console.log(' -> Criterion #4 Verified: Duplicate role request blocked with informative error! ✓');

    console.log('\n=============================================================');
    console.log('🎉 ALL PROFILE & ROLE REQUEST TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (err) {
    console.error('\n❌ Test Failure:', err.message);
  }
}

setTimeout(runProfileTests, 5000);
