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

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 TESTING RBAC SCOPING, CREATION, AND REMOVAL HIERARCHY');
  console.log('===========================================================');

  try {
    // 0. Clean DB except root super admin
    await pool.query("DELETE FROM identity.users WHERE email != 'admin@college.edu'");

    // 1. Super Admin login
    console.log('\n[1] Super Admin login...');
    const saLogin = await request('POST', '/api/auth/login', { email: 'admin@college.edu', password: 'password123' });
    const saToken = saLogin.body.token;
    const saId = saLogin.body.user.id;
    console.log(`✅ Logged in as Super Admin (${saId})`);

    // 2. Super Admin provisions 2 Program Admins
    console.log('\n[2] Provisioning Program Admin 1 & 2...');
    const pa1 = await request('POST', '/api/admin/program-admins', {
      name: 'Dean Placement Alpha',
      email: 'dean.alpha@college.edu',
      password: 'password123'
    }, saToken);
    const pa2 = await request('POST', '/api/admin/program-admins', {
      name: 'Dean Placement Beta',
      email: 'dean.beta@college.edu',
      password: 'password123'
    }, saToken);
    console.log(`✅ PA 1: ${pa1.body.id}, PA 2: ${pa2.body.id}`);

    // Log into PA 1 and PA 2
    const pa1Login = await request('POST', '/api/auth/login', { email: 'dean.alpha@college.edu', password: 'password123' });
    const pa1Token = pa1Login.body.token;
    const pa2Login = await request('POST', '/api/auth/login', { email: 'dean.beta@college.edu', password: 'password123' });
    const pa2Token = pa2Login.body.token;

    // 3. Program Admin 1 creates a Student directly
    console.log('\n[3] Program Admin 1 creating student directly (requirement verified)...');
    const paStuRes = await request('POST', '/api/admin/create-student', {
      name: 'Alpha Direct Student',
      email: 'alpha.student@college.edu',
      rollNumber: '22CS9001',
      department: 'Computer Science',
      batchYear: 2026,
      track: 'HOPE_ELITE',
      password: 'password123'
    }, pa1Token);
    if (paStuRes.statusCode !== 201) throw new Error(`PA student creation failed: ${JSON.stringify(paStuRes.body)}`);
    console.log(`✅ Student created directly by PA 1: ${paStuRes.body.user.name} (User ID: ${paStuRes.body.user.id})`);

    // 4. Program Admin 1 onboards Faculty Mentor 1 and Domain Trainer
    console.log('\n[4] Program Admin 1 onboarding Faculty Mentor 1 and Trainer...');
    const m1Res = await request('POST', '/api/admin/faculty-mentors', {
      name: 'Dr. Mentor Alpha',
      email: 'mentor.alpha@college.edu',
      password: 'password123'
    }, pa1Token);
    const m1Login = await request('POST', '/api/auth/login', { email: 'mentor.alpha@college.edu', password: 'password123' });
    const m1Token = m1Login.body.token;
    const m1Id = m1Res.body.id;

    const trRes = await request('POST', '/api/admin/onboard-trainer', {
      trainerName: 'Trainer Alpha',
      trainerEmail: 'trainer.alpha@college.edu',
      companyOrInstitute: 'Alpha Industry Tech',
      domainName: 'Full Stack Development',
      startDate: '2026-09-01',
      endDate: '2026-10-31'
    }, pa1Token);
    console.log(`✅ Onboarded Mentor 1 (${m1Id}) and Trainer (${trRes.body.id})`);

    // Program Admin 2 onboards Faculty Mentor 2
    const m2Res = await request('POST', '/api/admin/faculty-mentors', {
      name: 'Dr. Mentor Beta',
      email: 'mentor.beta@college.edu',
      password: 'password123'
    }, pa2Token);
    const m2Login = await request('POST', '/api/auth/login', { email: 'mentor.beta@college.edu', password: 'password123' });
    const m2Token = m2Login.body.token;
    const m2Id = m2Res.body.id;

    // 5. Faculty Mentor 1 creates Mentee 1
    console.log('\n[5] Faculty Mentor 1 creating Mentee 1...');
    const m1StuRes = await request('POST', '/api/admin/create-student', {
      name: 'Mentor 1 Mentee',
      email: 'm1.mentee@college.edu',
      rollNumber: '22CS8001',
      department: 'Computer Science',
      batchYear: 2026,
      track: 'HOPE_ELITE',
      password: 'password123'
    }, m1Token);
    const m1StudentId = m1StuRes.body.student.id;
    const m1StudentUserId = m1StuRes.body.user.id;
    console.log(`✅ Mentee 1 created: Student ID=${m1StudentId}, User ID=${m1StudentUserId}`);

    // Faculty Mentor 2 creates Mentee 2
    const m2StuRes = await request('POST', '/api/admin/create-student', {
      name: 'Mentor 2 Mentee',
      email: 'm2.mentee@college.edu',
      rollNumber: '22CS8002',
      department: 'ECE',
      batchYear: 2026,
      track: 'PEP',
      password: 'password123'
    }, m2Token);
    const m2StudentId = m2StuRes.body.student.id;

    // 6. Test Scoped Inspection: Mentor 1 trying to view Mentor 2's student full history (MUST BE 403)
    console.log('\n[6] Testing Scoped Visibility: Mentor 1 attempting to view Mentor 2 Mentee...');
    const illegalView1 = await request('GET', `/api/admin/students/${m2StudentId}/full-history`, null, m1Token);
    if (illegalView1.statusCode === 403) {
      console.log(`✅ Blocked with 403 Forbidden as expected: ${illegalView1.body.error}`);
    } else {
      throw new Error(`Scoped access check failed: status ${illegalView1.statusCode}`);
    }

    // 7. Test Scoped Inspection: Program Admin 2 trying to view Student created by Program Admin 1
    console.log('\n[7] Testing Scoped Visibility: PA 2 attempting to view PA 1 student...');
    const illegalView2 = await request('GET', `/api/admin/students/${paStuRes.body.student.id}/full-history`, null, pa2Token);
    if (illegalView2.statusCode === 403) {
      console.log(`✅ Blocked with 403 Forbidden as expected: ${illegalView2.body.error}`);
    } else {
      throw new Error(`Scoped access check failed for PA: status ${illegalView2.statusCode}`);
    }

    // 8. Super Admin viewing ANY student full history (MUST BE 200 OK with full payload)
    console.log('\n[8] Super Admin viewing full history of Mentee 1...');
    const saView = await request('GET', `/api/admin/students/${m1StudentId}/full-history`, null, saToken);
    if (saView.statusCode !== 200) throw new Error(`Super Admin failed to view student: ${JSON.stringify(saView.body)}`);
    console.log(`✅ Super Admin full visibility verified: Student=${saView.body.student.name}, Checklist=${saView.body.checklist.length} tasks, Sessions=${saView.body.interviewSessions.length}`);

    // 9. Removal Immunity: Program Admin attempting to delete Super Admin (MUST BE 403)
    console.log('\n[9] Security Check: PA 1 attempting to remove Super Admin...');
    const illegalDeleteAdmin = await request('DELETE', `/api/admin/users/${saId}`, null, pa1Token);
    if (illegalDeleteAdmin.statusCode === 403) {
      console.log(`✅ Root Super Admin Immunity Verified: ${illegalDeleteAdmin.body.error}`);
    } else {
      throw new Error(`Super admin deletion was not blocked! Status: ${illegalDeleteAdmin.statusCode}`);
    }

    // 10. Removal Immunity: Super Admin attempting to delete Super Admin self (MUST BE 403)
    console.log('\n[10] Security Check: Super Admin attempting to delete root account...');
    const selfDeleteAdmin = await request('DELETE', `/api/admin/users/${saId}`, null, saToken);
    if (selfDeleteAdmin.statusCode === 403) {
      console.log(`✅ Permanent Protection Confirmed: ${selfDeleteAdmin.body.error}`);
    } else {
      throw new Error(`Root account self-deletion was not blocked! Status: ${selfDeleteAdmin.statusCode}`);
    }

    // 11. Faculty Mentor removing their own student (MUST BE 200)
    console.log('\n[11] Faculty Mentor 1 removing their own student...');
    const mentorDeleteRes = await request('DELETE', `/api/admin/users/${m1StudentUserId}`, null, m1Token);
    if (mentorDeleteRes.statusCode !== 200) throw new Error(`Mentor failed to remove student: ${JSON.stringify(mentorDeleteRes.body)}`);
    console.log(`✅ Mentor removal successful: ${mentorDeleteRes.body.message}`);

    // 12. Faculty Mentor attempting to remove another Mentor (MUST BE 403)
    console.log('\n[12] Security Check: Faculty Mentor 1 attempting to remove Faculty Mentor 2...');
    const mentorDeleteMentor = await request('DELETE', `/api/admin/users/${m2Id}`, null, m1Token);
    if (mentorDeleteMentor.statusCode === 403) {
      console.log(`✅ Blocked with 403 Forbidden: ${mentorDeleteMentor.body.error}`);
    } else {
      throw new Error(`Mentor was able to delete another mentor! Status: ${mentorDeleteMentor.statusCode}`);
    }

    // 13. Program Admin removing Faculty Mentor 1 and Student (MUST BE 200)
    console.log('\n[13] Program Admin 1 removing Faculty Mentor 1 and student...');
    const paDeleteMentor = await request('DELETE', `/api/admin/users/${m1Id}`, null, pa1Token);
    const paDeleteStudent = await request('DELETE', `/api/admin/users/${paStuRes.body.user.id}`, null, pa1Token);
    if (paDeleteMentor.statusCode !== 200 || paDeleteStudent.statusCode !== 200) {
      throw new Error(`PA removal failed: Mentor=${paDeleteMentor.statusCode}, Student=${paDeleteStudent.statusCode}`);
    }
    console.log(`✅ Program Admin removal of Mentor and Student successful!`);

    // 14. Super Admin removing Program Admin 2 (MUST BE 200)
    console.log('\n[14] Super Admin removing Program Admin 2...');
    const saDeletePA = await request('DELETE', `/api/admin/users/${pa2.body.id}`, null, saToken);
    if (saDeletePA.statusCode !== 200) throw new Error(`Super admin failed to delete PA: ${JSON.stringify(saDeletePA.body)}`);
    console.log(`✅ Super Admin removed Program Admin: ${saDeletePA.body.message}`);

    // Reset back to single clean root super admin
    await pool.query("DELETE FROM identity.users WHERE email != 'admin@college.edu'");
    console.log('\n===========================================================');
    console.log('🎉 ALL PERMISSIONS, SCOPING & REMOVAL TESTS PASSED 100%!');
    console.log('===========================================================');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
  } finally {
    await pool.end();
  }
}

runTests();
