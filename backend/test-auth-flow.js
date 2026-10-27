const http = require('http');

// Helper to make HTTP JSON requests
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

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING AUTOMATED E2E AUTHENTICATION & VERIFICATION TESTS');
  console.log('=============================================================\n');

  try {
    // Test 1: Register new resident user
    const testEmail = `testresident_${Date.now()}@indore.org`;
    console.log(`[TEST 1] Registering new resident user: ${testEmail}...`);
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Indore Test Resident',
      email: testEmail,
      password: 'password123',
      confirmPassword: 'password123',
      role: 'resident',
    });

    console.log(` -> Register Status: ${regRes.status}`);
    console.log(` -> Message: ${regRes.body.message}`);
    console.log(` -> Verification Token Generated: ${regRes.body.verificationToken ? 'YES ✓' : 'NO ❌'}`);
    
    if (regRes.status !== 201 || !regRes.body.verificationToken) {
      throw new Error('Registration test failed!');
    }

    // Test 2: Attempt Login BEFORE Email Verification (Must fail with 403 per Acceptance Criterion #4)
    console.log('\n[TEST 2] Attempting login with UNVERIFIED user account...');
    const unverifiedLoginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'password123',
    });

    console.log(` -> Login Status: ${unverifiedLoginRes.status} (Expected 403)`);
    console.log(` -> Error Message: "${unverifiedLoginRes.body.message}"`);
    console.log(` -> isVerified flag: ${unverifiedLoginRes.body.isVerified}`);

    if (unverifiedLoginRes.status !== 403) {
      throw new Error('Unverified login check failed! Expected status 403.');
    }
    console.log(' -> Acceptance Criterion #4 Verified: Unverified user blocked successfully! ✓');

    // Test 3: Perform Email Verification using generated token
    const token = regRes.body.verificationToken;
    console.log(`\n[TEST 3] Calling Email Verification endpoint /api/auth/verify?token=${token}...`);
    const verifyRes = await request('GET', `/api/auth/verify?token=${token}`);

    console.log(` -> Verify Status: ${verifyRes.status}`);
    console.log(` -> Success Message: "${verifyRes.body.message}"`);

    if (verifyRes.status !== 200 || !verifyRes.body.success) {
      throw new Error('Verification test failed!');
    }
    console.log(' -> Acceptance Criterion #3 Verified: User marked as verified! ✓');

    // Test 4: Attempt Login AFTER Email Verification (Must succeed with 200 & return JWT)
    console.log('\n[TEST 4] Attempting login with VERIFIED user account...');
    const verifiedLoginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'password123',
    });

    console.log(` -> Login Status: ${verifiedLoginRes.status}`);
    console.log(` -> JWT Token Received: ${verifiedLoginRes.body.token ? 'YES ✓' : 'NO ❌'}`);
    console.log(` -> User Role stored on doc: "${verifiedLoginRes.body.user?.role}"`);
    console.log(` -> User isVerified status: ${verifiedLoginRes.body.user?.isVerified}`);

    if (verifiedLoginRes.status !== 200 || !verifiedLoginRes.body.token) {
      throw new Error('Verified login test failed!');
    }

    // Test 5: Verify role rejection for 'admin' signup
    console.log('\n[TEST 5] Testing Admin Role restriction on public signup...');
    const adminRegRes = await request('POST', '/api/auth/register', {
      name: 'Illegal Admin Attempt',
      email: `admin_${Date.now()}@test.com`,
      password: 'password123',
      role: 'admin',
    });

    console.log(` -> Admin Signup Status: ${adminRegRes.status} (Expected 400)`);
    console.log(` -> Error Message: "${adminRegRes.body.message}"`);

    if (adminRegRes.status !== 400) {
      throw new Error('Admin restriction test failed!');
    }

    console.log('\n=============================================================');
    console.log('🎉 ALL 5 E2E AUTHENTICATION & VERIFICATION TESTS PASSED 100%!');
    console.log('=============================================================\n');
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
  }
}

// Wait for server to boot up before calling tests
setTimeout(runTests, 3000);
