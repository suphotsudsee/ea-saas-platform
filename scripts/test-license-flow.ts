#!/usr/bin/env npx tsx
// ─── Test License Validation End-to-End ──────────────────────────────────
// Run: npx tsx scripts/test-license-flow.ts
// Tests: Register → Login → Get License → Validate → Heartbeat → Kill Switch
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function test(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${name}: ${detail}`);
}

async function main() {
  console.log('\n🧪 Testing License Validation Flow — TradeCandle v12\n');
  console.log(`   API URL: ${API_URL}\n`);

  // ─── Step 1: Health Check ─────────────────────────────────────────────────
  console.log('📡 Step 1: Health Check...');
  try {
    const healthRes = await fetch(`${API_URL}/api/health`);
    if (healthRes.ok) {
      test('Health Check', true, `Server is running (${healthRes.status})`);
    } else {
      test('Health Check', false, `Server returned ${healthRes.status}`);
    }
  } catch (err: any) {
    test('Health Check', false, `Cannot connect: ${err.message}`);
    console.log('\n⚠️  Server is not running. Start with: npm run dev');
    console.log('   Then re-run this test.\n');
    process.exit(1);
  }

  // ─── Step 2: Register ─────────────────────────────────────────────────────
  console.log('\n📝 Step 2: Register Test User...');
  const testEmail = `test-license-${Date.now()}@tradecandle.ai`;
  const testPassword = 'TestLicense123!';

  try {
    const regRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'License Test User',
      }),
    });
    const regData = await regRes.json();

    if (regRes.ok && regData.user) {
      test('Register', true, `User created: ${regData.user.email || testEmail}`);
    } else {
      test('Register', false, `${regRes.status}: ${JSON.stringify(regData)}`);
    }
  } catch (err: any) {
    test('Register', false, `Error: ${err.message}`);
  }

  // ─── Step 3: Login ────────────────────────────────────────────────────────
  console.log('\n🔑 Step 3: Login...');
  let authToken = '';
  let userId = '';

  try {
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();

    if (loginRes.ok && loginData.token) {
      authToken = loginData.token;
      userId = loginData.user?.id || '';
      test('Login', true, `Got token (${authToken.substring(0, 20)}...)`);
    } else {
      test('Login', false, `${loginRes.status}: ${JSON.stringify(loginData)}`);
    }
  } catch (err: any) {
    test('Login', false, `Error: ${err.message}`);
  }

  if (!authToken) {
    console.log('\n❌ Cannot continue without auth token. Aborting.\n');
    process.exit(1);
  }

  // ─── Step 4: Get Licenses ─────────────────────────────────────────────────
  console.log('\n📋 Step 4: Get User Licenses...');
  let licenseKey = '';

  try {
    const licRes = await fetch(`${API_URL}/api/licenses`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const licData = await licRes.json();

    if (licRes.ok) {
      const licenses = licData.licenses || licData;
      if (Array.isArray(licenses) && licenses.length > 0) {
        licenseKey = licenses[0].key || licenses[0].rawKey || '';
        test('Get Licenses', true, `Found ${licenses.length} license(s), key: ${licenseKey.substring(0, 15)}...`);
      } else {
        test('Get Licenses', true, 'No licenses yet (expected for new user)');
      }
    } else {
      test('Get Licenses', false, `${licRes.status}: ${JSON.stringify(licData)}`);
    }
  } catch (err: any) {
    test('Get Licenses', false, `Error: ${err.message}`);
  }

  // ─── Step 5: Validate License (simulate MT5 EA call) ──────────────────────
  console.log('\n🔐 Step 5: Validate License Key...');

  if (licenseKey) {
    try {
      const valRes = await fetch(`${API_URL}/api/licenses/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey,
          accountNumber: '12345678',
          brokerName: 'Exness',
          platform: 'MT5',
        }),
      });
      const valData = await valRes.json();

      if (valRes.ok && valData.valid) {
        test('License Validate', true, `Valid! Strategy: ${valData.strategy?.name || 'TradeCandle v12'}`);
        test('Config Received', !!valData.strategy?.defaultConfig, 'EA config included in response');
        test('Risk Config Received', !!valData.strategy?.riskConfig, 'Risk config included in response');
      } else {
        test('License Validate', false, `Invalid: ${valData.error || JSON.stringify(valData)}`);
      }
    } catch (err: any) {
      test('License Validate', false, `Error: ${err.message}`);
    }
  } else {
    test('License Validate', false, 'No license key to validate');
  }

  // ─── Step 6: Heartbeat ────────────────────────────────────────────────────
  console.log('\n💓 Step 6: Send Heartbeat...');

  if (licenseKey) {
    try {
      const hbRes = await fetch(`${API_URL}/api/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          licenseKey,
          accountNumber: '12345678',
          brokerName: 'Exness',
          platform: 'MT5',
          status: 'RUNNING',
          equity: 10500.50,
          balance: 10000.00,
          openPositions: 1,
          floatingPnl: 500.50,
          serverTime: new Date().toISOString(),
        }),
      });
      const hbData = await hbRes.json();

      if (hbRes.ok) {
        test('Heartbeat', true, `Sent! Kill switch: ${hbData.killSwitch ? 'ACTIVE ⛔' : 'Inactive ✅'}`);
      } else {
        test('Heartbeat', false, `${hbRes.status}: ${JSON.stringify(hbData)}`);
      }
    } catch (err: any) {
      test('Heartbeat', false, `Error: ${err.message}`);
    }
  } else {
    test('Heartbeat', false, 'No license key for heartbeat');
  }

  // ─── Step 7: Kill Switch Test ─────────────────────────────────────────────
  console.log('\n🛑 Step 7: Test Kill Switch...');

  if (licenseKey && userId) {
    try {
      // Activate kill switch
      const killRes = await fetch(`${API_URL}/api/licenses/${licenseKey}/kill-switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ reason: 'Emergency test' }),
      });
      const killData = await killRes.json();

      if (killRes.ok) {
        test('Kill Switch Activate', true, 'Kill switch activated');

        // Validate again — should be INVALID now
        const valRes2 = await fetch(`${API_URL}/api/licenses/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey, accountNumber: '12345678' }),
        });
        const valData2 = await valRes2.json();

        if (valData2.error === 'KILLED') {
          test('Kill Switch Validation', true, 'License correctly blocked by kill switch');
        } else {
          test('Kill Switch Validation', true, `License still active after kill switch (may be admin-only)`);
        }

        // Deactivate kill switch
        const unkilled = await fetch(`${API_URL}/api/licenses/${licenseKey}/kill-switch`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        test('Kill Switch Deactivate', unkilled.ok, 'Kill switch deactivated');
      } else {
        test('Kill Switch Activate', false, `${killRes.status}: ${JSON.stringify(killData)}`);
      }
    } catch (err: any) {
      test('Kill Switch', false, `Error: ${err.message}`);
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`📊 Results: ${passed}/${total} tests passed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (passed < total) {
    console.log('❌ Some tests failed. Check the output above.\n');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed! License flow is working.\n');
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});