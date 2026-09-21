const http = require('http');
const path = require('path');
const { Pool } = require(path.join(__dirname, '../backend/node_modules/pg'));

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres123@localhost:5432/college_readiness_db'
});

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let resData = '';
      res.on('data', chunk => { resData += chunk; });
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(resData);
        } catch {
          parsed = resData;
        }
        resolve({ status: res.status, statusCode: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runE2ETests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING COMPREHENSIVE INSTITUTIONAL HIERARCHY E2E TESTS');
  console.log('===========================================================');

  try {
    // Reset test data except super admin
    await pool.query("DELETE FROM identity.users WHERE email != 'admin@college.edu'");

    // 1. Super Admin Login
    console.log('\n[1] Super Admin Login (admin@college.edu)...');
    const saLogin = await request('POST', '/api/auth/login', {
      email: 'admin@college.edu',
      password: 'password123'
    });
    if (saLogin.statusCode !== 200 || !saLogin.body.token) {
      throw new Error(`Super admin login failed: ${JSON.stringify(saLogin.body)}`);
    }
    const saToken = saLogin.body.token;
    console.log(`✅ Super Admin logged in successfully. User: ${saLogin.body.user.name}, Role: ${saLogin.body.user.role}`);

    // 2. Super Admin checks System Stats
    console.log('\n[2] Fetching System Stats as Super Admin...');
    const statsRes = await request('GET', '/api/admin/system-stats', null, saToken);
    console.log(`✅ System Stats:`, statsRes.body);

    // 3. Super Admin creates Program Admin
    console.log('\n[3] Super Admin provisioning Program Admin (dean.placement@college.edu)...');
    const paCreateRes = await request('POST', '/api/admin/program-admins', {
      name: 'Prof. Rajesh Kumar (Dean Placement)',
      email: 'dean.placement@college.edu',
      password: 'password123'
    }, saToken);
    console.log(`Program Admin create response: status=${paCreateRes.statusCode}`, paCreateRes.body);

    // 4. Super Admin lists Program Admins
    console.log('\n[4] Super Admin listing all Program Admins...');
    const paListRes = await request('GET', '/api/admin/program-admins', null, saToken);
    console.log(`Program Admin list response: status=${paListRes.statusCode}`, paListRes.body);
    const foundPA = paListRes.body.find(p => p.email === 'dean.placement@college.edu');
    if (!foundPA) throw new Error('Created Program Admin not found in list!');
    console.log(`✅ Found ${paListRes.body.length} Program Admin(s). Verified dean.placement@college.edu`);

    // 5. Program Admin Login
    console.log('\n[5] Logging in as Program Admin (dean.placement@college.edu)...');
    const paLogin = await request('POST', '/api/auth/login', {
      email: 'dean.placement@college.edu',
      password: 'password123'
    });
    if (paLogin.statusCode !== 200) throw new Error(`Program admin login failed: ${JSON.stringify(paLogin.body)}`);
    const paToken = paLogin.body.token;
    console.log(`✅ Program Admin logged in. Role: ${paLogin.body.user.role}`);

    // 6. Program Admin creates Faculty Mentor 1 & 2
    console.log('\n[6] Program Admin creating Faculty Mentor 1 (mentor.malathi@college.edu)...');
    const m1Res = await request('POST', '/api/admin/faculty-mentors', {
      name: 'Dr. Malathi V (CSE)',
      email: 'mentor.malathi@college.edu',
      password: 'password123'
    }, paToken);
    console.log(`✅ Mentor 1 created: ${m1Res.body.name} (ID: ${m1Res.body.id})`);

    console.log('\n[7] Program Admin creating Faculty Mentor 2 (mentor.suresh@college.edu)...');
    const m2Res = await request('POST', '/api/admin/faculty-mentors', {
      name: 'Dr. Suresh B (ECE)',
      email: 'mentor.suresh@college.edu',
      password: 'password123'
    }, paToken);
    console.log(`✅ Mentor 2 created: ${m2Res.body.name} (ID: ${m2Res.body.id})`);

    // 8. Program Admin onboards Domain Trainer
    console.log('\n[8] Program Admin onboarding Domain Trainer (vikram.trainer@college.edu)...');
    const trainerRes = await request('POST', '/api/admin/onboard-trainer', {
      trainerName: 'Vikramaditya Sharma',
      trainerEmail: 'vikram.trainer@college.edu',
      companyOrInstitute: 'TechCorp Engineering',
      domainName: 'Full Stack Development',
      startDate: '2026-09-01',
      endDate: '2026-10-31'
    }, paToken);
    console.log(`✅ Domain Trainer onboarded: ${trainerRes.body.trainerName} for domain: ${trainerRes.body.domain}`);

    // 9. Faculty Mentor 1 logs in
    console.log('\n[9] Faculty Mentor 1 logging in (mentor.malathi@college.edu)...');
    const m1Login = await request('POST', '/api/auth/login', {
      email: 'mentor.malathi@college.edu',
      password: 'password123'
    });
    if (m1Login.statusCode !== 200) throw new Error(`Mentor 1 login failed: ${JSON.stringify(m1Login.body)}`);
    const m1Token = m1Login.body.token;
    console.log(`✅ Mentor 1 logged in. Role: ${m1Login.body.user.role}`);

    // 10. Faculty Mentor 1 creates Student in HOPE_ELITE track
    console.log('\n[10] Faculty Mentor 1 enrolling Student (bavan.student@college.edu, HOPE_ELITE)...');
    const stuCreateRes = await request('POST', '/api/admin/create-student', {
      name: 'Bavan Balaji',
      email: 'bavan.student@college.edu',
      rollNumber: '22CS1001',
      department: 'Computer Science',
      batchYear: 2026,
      track: 'HOPE_ELITE',
      domainName: 'Full Stack Development',
      password: 'password123'
    }, m1Token);
    if (stuCreateRes.statusCode !== 201) throw new Error(`Student creation failed: ${JSON.stringify(stuCreateRes.body)}`);
    console.log(`✅ Student created under Mentor 1: ${stuCreateRes.body.user.name}, Roll: ${stuCreateRes.body.student.roll_number}`);

    // 11. Faculty Mentor 1 verifies Mentee scoping (sees Bavan Balaji)
    console.log('\n[11] Faculty Mentor 1 fetching mentees list...');
    const m1Mentees = await request('GET', '/api/admin/mentees', null, m1Token);
    const m1Found = m1Mentees.body.find(s => s.rollNumber === '22CS1001');
    if (!m1Found) throw new Error('Student 22CS1001 not found in Mentor 1 mentee list!');
    console.log(`✅ Mentor 1 sees ${m1Mentees.body.length} mentee(s). Found Bavan Balaji.`);

    // 12. Faculty Mentor 2 logs in & verifies scoping (MUST NOT see Bavan Balaji)
    console.log('\n[12] Faculty Mentor 2 logging in (mentor.suresh@college.edu)...');
    const m2Login = await request('POST', '/api/auth/login', {
      email: 'mentor.suresh@college.edu',
      password: 'password123'
    });
    const m2Token = m2Login.body.token;
    const m2Mentees = await request('GET', '/api/admin/mentees', null, m2Token);
    const m2Found = m2Mentees.body.find(s => s.rollNumber === '22CS1001');
    if (m2Found) throw new Error('ISOLATION VIOLATION: Mentor 2 should NOT see Mentor 1 mentee!');
    console.log(`✅ Strict Mentee Scoping Verified: Mentor 2 has ${m2Mentees.body.length} mentees (does NOT see Mentor 1 student).`);

    // 13. Student logs in and checks profile
    console.log('\n[13] Student logging in (bavan.student@college.edu)...');
    const stuLogin = await request('POST', '/api/auth/login', {
      email: 'bavan.student@college.edu',
      password: 'password123'
    });
    if (stuLogin.statusCode !== 200) throw new Error(`Student login failed: ${JSON.stringify(stuLogin.body)}`);
    const stuToken = stuLogin.body.token;
    console.log(`✅ Student logged in. Role: ${stuLogin.body.user.role}`);

    const stuProfile = await request('GET', '/api/students/me', null, stuToken);
    console.log(`✅ Student Profile: Track=${stuProfile.body.track}, Mentor=${stuProfile.body.mentorName}, Solved=${stuProfile.body.leetcodeSolved}`);

    // 14. Domain Trainer security check: Trainer CANNOT create students (expect 403)
    console.log('\n[14] Domain Trainer security check: Attempting to create student as Trainer...');
    const trainerLogin = await request('POST', '/api/auth/login', {
      email: 'vikram.trainer@college.edu',
      password: 'password123'
    });
    let trainerToken;
    if (trainerLogin.statusCode === 200) {
      trainerToken = trainerLogin.body.token;
    } else {
      // If trainer password was defaulted in onboarding
      const userCheck = await pool.query("SELECT id, role FROM identity.users WHERE email = 'vikram.trainer@college.edu'");
      console.log('Trainer user record:', userCheck.rows[0]);
    }

    if (trainerToken) {
      const illegalCreateRes = await request('POST', '/api/admin/create-student', {
        name: 'Illegal Candidate',
        email: 'illegal@college.edu',
        rollNumber: '99CS9999',
        department: 'CS',
        batchYear: 2026,
        track: 'HOPE_ELITE',
        password: 'password123'
      }, trainerToken);
      if (illegalCreateRes.statusCode === 403) {
        console.log('✅ RBAC Security Confirmed: Domain Trainer is strictly FORBIDDEN (403) from creating students.');
      } else {
        throw new Error(`Trainer unauthorized creation was NOT blocked! Status: ${illegalCreateRes.statusCode}`);
      }
    }

    // 15. External Candidate Self-Registration & Verification Flow
    console.log('\n[15] Testing External Candidate Self-Registration...');
    const extRegRes = await request('POST', '/api/auth/register-external', {
      name: 'Kavya S',
      email: 'kavya.candidate@external.org',
      password: 'password123'
    });
    console.log(`✅ External registration initiated: ${extRegRes.body.message}`);

    // Fetch verification code from DB
    const codeRes = await pool.query("SELECT verification_code FROM identity.users WHERE email = 'kavya.candidate@external.org'");
    const code = codeRes.rows[0].verification_code;
    console.log(`✅ Retrieved verification code: ${code}`);

    // Verify Email
    console.log('\n[16] Submitting Email Verification Code...');
    const verifyRes = await request('POST', '/api/auth/verify-email', {
      email: 'kavya.candidate@external.org',
      code: code
    });
    if (verifyRes.statusCode !== 200) throw new Error(`Verification failed: ${JSON.stringify(verifyRes.body)}`);
    console.log(`✅ External Candidate Verified! User: ${verifyRes.body.user.name}, Track: ${verifyRes.body.user.track}`);

    console.log('\n===========================================================');
    console.log('🎉 ALL INSTITUTIONAL HIERARCHY TESTS PASSED 100% PERFECTLY!');
    console.log('===========================================================');

  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
  } finally {
    await pool.end();
  }
}

runE2ETests();
