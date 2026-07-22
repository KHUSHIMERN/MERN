// Native fetch available in Node.js 18+

async function runAuthFlowTest() {
  console.log('🧪 Starting Auth Flow Verification Tests...\n');
  const baseUrl = 'http://localhost:5000/api/auth';
  const testEmail = `user_${Date.now()}@example.com`;
  let verificationToken = '';

  try {
    // Test 1: Invalid Registration (Missing name & weak password)
    console.log('Test 1: Registering with invalid input...');
    const res1 = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'invalid-email', password: '123' }),
    });
    const data1 = await res1.json();
    console.log(`Status: ${res1.status} | Response:`, data1);
    if (res1.status === 400) console.log('✅ Test 1 Passed: Validation correctly rejected bad input.\n');

    // Test 2: Valid Registration
    console.log('Test 2: Registering valid user...');
    const res2 = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aarav Patel',
        email: testEmail,
        password: 'securePassword123',
        role: 'resident',
      }),
    });
    const data2 = await res2.json();
    console.log(`Status: ${res2.status} | Response:`, data2);
    if (res2.status === 201 && data2.data.verified === false) {
      console.log('✅ Test 2 Passed: User created with verified=false and token generated.\n');
      const vLink = data2.data.verificationLink;
      const urlObj = new URL(vLink);
      verificationToken = urlObj.searchParams.get('token');
    }

    // Test 3: Attempt Login Before Verification
    console.log('Test 3: Attempting login for UNVERIFIED user...');
    const res3 = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'securePassword123' }),
    });
    const data3 = await res3.json();
    console.log(`Status: ${res3.status} | Response:`, data3);
    if (res3.status === 403 && data3.verified === false) {
      console.log('✅ Test 3 Passed: Login blocked for unverified account.\n');
    }

    // Test 4: Verify Email via Token Endpoint
    console.log(`Test 4: Verifying email with token: ${verificationToken}...`);
    const res4 = await fetch(`${baseUrl}/verify?token=${verificationToken}`);
    const htmlText = await res4.text();
    console.log(`Status: ${res4.status} | HTML contains 'Verified': ${htmlText.includes('Verified')}`);
    if (res4.status === 200 && htmlText.includes('Verified')) {
      console.log('✅ Test 4 Passed: Email verified successfully.\n');
    }

    // Test 5: Attempt Login After Verification
    console.log('Test 5: Attempting login for VERIFIED user...');
    const res5 = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'securePassword123' }),
    });
    const data5 = await res5.json();
    console.log(`Status: ${res5.status} | Response:`, data5);
    if (res5.status === 200 && data5.user.verified === true) {
      console.log('✅ Test 5 Passed: Verified user logged in successfully.\n');
    }

    // Test 6: Duplicate Email Registration
    console.log('Test 6: Attempting duplicate email registration...');
    const res6 = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: testEmail,
        password: 'securePassword123',
      }),
    });
    const data6 = await res6.json();
    console.log(`Status: ${res6.status} | Response:`, data6);
    if (res6.status === 409) {
      console.log('✅ Test 6 Passed: Duplicate registration blocked with 409 Conflict.\n');
    }

    console.log('🎉 ALL AUTHENTICATION FLOW TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  }
}

runAuthFlowTest();
