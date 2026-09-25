/**
 * Route test script — tests every registered route
 * Run: node run_route_tests.mjs
 */
import http from 'http';

const BASE = 'http://127.0.0.1:5000';

// Known seeded IDs
const BATCH_ID = 'c8ebcfc6-16a2-4dcc-be52-c18de17fa081';
const ARJUN_STUDENT_ID = '88d44510-1e24-4949-b55c-bdd3fcaf9663';

const TS = Date.now();
const TEST_EMAIL = `curl_test_${TS}@test.com`;
const TEST_PASSWORD = 'TestPass123!';
const TEST_ROLL = `CURL${TS}`;

// Seeded users — confirmed password from bcrypt hash check
const ADMIN_EMAIL = 'admin@crp.dev';
const ADMIN_PASSWORD = 'Staff@123';
const MENTOR_EMAIL = 'mentor@crp.dev';
const MENTOR_PASSWORD = 'Staff@123';

// ── HTTP helper ───────────────────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers,
      timeout: 15000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, body: parsed, raw: data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Test runner ───────────────────────────────────────────────────────────────

const results = [];

function result(route, method, authType, expected, got, extra) {
  const pass = Array.isArray(expected) ? expected.includes(got) : got === expected;
  results.push({ route, method, authType, expected: Array.isArray(expected) ? expected.join('/') : expected, got, result: pass ? 'PASS' : 'FAIL', extra });
  const icon = pass ? '✓' : '✗';
  console.log(`${icon} [${got}] ${method} ${route}${extra ? ' — ' + extra : ''}`);
  return pass;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log(`\n=== Backend Route Tests — ${new Date().toISOString()} ===\n`);

  let studentToken = null;
  let studentId = null;
  let studentUserId = null;
  let adminToken = null;
  let mentorToken = null;

  // ── 1. GET /api/health (public) ──────────────────────────────────────────
  try {
    const r = await request('GET', '/api/health');
    result('/api/health', 'GET', 'None', 200, r.status);
  } catch (e) {
    result('/api/health', 'GET', 'None', 200, 'ERR', e.message);
  }

  // ── 2. POST /api/auth/register ───────────────────────────────────────────
  try {
    const r = await request('POST', '/api/auth/register', {
      name: 'Curl Test User',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      rollNumber: TEST_ROLL,
      batchId: BATCH_ID,
    });
    result('/api/auth/register', 'POST', 'None', 201, r.status, r.status !== 201 ? JSON.stringify(r.body) : '');
    if (r.status === 201 && r.body?.data) {
      studentToken = r.body.data.token;
      studentId = r.body.data.studentId;
      studentUserId = r.body.data.user?.id;
      console.log(`   → studentId=${studentId}, userId=${studentUserId}`);
    }
  } catch (e) {
    result('/api/auth/register', 'POST', 'None', 201, 'ERR', e.message);
  }

  // ── 3. POST /api/auth/register — duplicate email ─────────────────────────
  try {
    const r = await request('POST', '/api/auth/register', {
      name: 'Curl Test User 2',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      rollNumber: `ROLL_DUP_${TS}`,
      batchId: BATCH_ID,
    });
    result('/api/auth/register (duplicate)', 'POST', 'None', 409, r.status);
  } catch (e) {
    result('/api/auth/register (duplicate)', 'POST', 'None', 409, 'ERR', e.message);
  }

  // ── 4. POST /api/auth/login ──────────────────────────────────────────────
  try {
    const r = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
    result('/api/auth/login', 'POST', 'None', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
    if (r.status === 200 && r.body?.data) {
      // Don't overwrite token; just confirm it works
      if (!studentToken) studentToken = r.body.data.token;
    }
  } catch (e) {
    result('/api/auth/login', 'POST', 'None', 200, 'ERR', e.message);
  }

  // ── 5. POST /api/auth/login — wrong password ─────────────────────────────
  try {
    const r = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: 'WrongPass999!' });
    result('/api/auth/login (wrong password)', 'POST', 'None', 401, r.status);
  } catch (e) {
    result('/api/auth/login (wrong password)', 'POST', 'None', 401, 'ERR', e.message);
  }

  // ── 6. GET /api/auth/me ──────────────────────────────────────────────────
  try {
    const r = await request('GET', '/api/auth/me', null, studentToken);
    result('/api/auth/me', 'GET', 'STUDENT', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
    // Fill studentId from /me if not already set
    if (r.status === 200 && !studentId) studentId = r.body?.data?.studentId;
  } catch (e) {
    result('/api/auth/me', 'GET', 'STUDENT', 200, 'ERR', e.message);
  }

  // ── 7. GET /api/auth/me — no token ──────────────────────────────────────
  try {
    const r = await request('GET', '/api/auth/me');
    result('/api/auth/me (no token)', 'GET', 'None', 401, r.status);
  } catch (e) {
    result('/api/auth/me (no token)', 'GET', 'None', 401, 'ERR', e.message);
  }

  // ── 8. POST /api/auth/logout ─────────────────────────────────────────────
  let tokenBeforeLogout = studentToken;
  try {
    const r = await request('POST', '/api/auth/logout', null, studentToken);
    result('/api/auth/logout', 'POST', 'STUDENT', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
  } catch (e) {
    result('/api/auth/logout', 'POST', 'STUDENT', 200, 'ERR', e.message);
  }

  // ── 9. GET /api/auth/me after logout (should be 401 — token revoked) ─────
  try {
    const r = await request('GET', '/api/auth/me', null, tokenBeforeLogout);
    result('/api/auth/me (after logout)', 'GET', 'revoked', 401, r.status,
      r.status === 401 ? '' : JSON.stringify(r.body));
  } catch (e) {
    result('/api/auth/me (after logout)', 'GET', 'revoked', 401, 'ERR', e.message);
  }

  // ── 10. Re-login to get fresh token ─────────────────────────────────────
  try {
    const r = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
    if (r.status === 200) {
      studentToken = r.body.data.token;
      console.log('   → Fresh token acquired after re-login');
    }
    result('/api/auth/login (fresh after logout)', 'POST', 'None', 200, r.status);
  } catch (e) {
    result('/api/auth/login (fresh after logout)', 'POST', 'None', 200, 'ERR', e.message);
  }

  // ── ORG ROUTES ───────────────────────────────────────────────────────────

  // ── 11. GET /api/org/institutions ────────────────────────────────────────
  try {
    const r = await request('GET', '/api/org/institutions');
    result('/api/org/institutions', 'GET', 'None', 200, r.status);
  } catch (e) {
    result('/api/org/institutions', 'GET', 'None', 200, 'ERR', e.message);
  }

  // ── 12. GET /api/org/programs ────────────────────────────────────────────
  try {
    const r = await request('GET', '/api/org/programs');
    result('/api/org/programs', 'GET', 'None', 200, r.status);
  } catch (e) {
    result('/api/org/programs', 'GET', 'None', 200, 'ERR', e.message);
  }

  // ── 13. GET /api/org/batches ─────────────────────────────────────────────
  try {
    const r = await request('GET', '/api/org/batches');
    result('/api/org/batches', 'GET', 'None', 200, r.status);
  } catch (e) {
    result('/api/org/batches', 'GET', 'None', 200, 'ERR', e.message);
  }

  // ── 14. GET /api/org/subdivisions ────────────────────────────────────────
  try {
    const r = await request('GET', '/api/org/subdivisions');
    result('/api/org/subdivisions', 'GET', 'None', 200, r.status);
  } catch (e) {
    result('/api/org/subdivisions', 'GET', 'None', 200, 'ERR', e.message);
  }

  // ── STUDENT ROUTES ───────────────────────────────────────────────────────

  // ── 15. GET /api/students/:studentId ─────────────────────────────────────
  if (studentId) {
    try {
      const r = await request('GET', `/api/students/${studentId}`, null, studentToken);
      result(`/api/students/:studentId`, 'GET', 'STUDENT', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
    } catch (e) {
      result('/api/students/:studentId', 'GET', 'STUDENT', 200, 'ERR', e.message);
    }
  } else {
    // Fallback: use arjun's student ID to test 403 (other student's record)
    try {
      const r = await request('GET', `/api/students/${ARJUN_STUDENT_ID}`, null, studentToken);
      result('/api/students/:studentId (other student → 403)', 'GET', 'STUDENT', 403, r.status);
    } catch (e) {
      result('/api/students/:studentId', 'GET', 'STUDENT', 403, 'ERR', e.message);
    }
  }

  // ── 16. GET /api/students/:studentId — no auth ───────────────────────────
  if (studentId) {
    try {
      const r = await request('GET', `/api/students/${studentId}`);
      result('/api/students/:studentId (no auth)', 'GET', 'None', 401, r.status);
    } catch (e) {
      result('/api/students/:studentId (no auth)', 'GET', 'None', 401, 'ERR', e.message);
    }
  }

  // ── 17. PATCH /api/students/:studentId ───────────────────────────────────
  if (studentId) {
    try {
      const r = await request('PATCH', `/api/students/${studentId}`, {
        codingHandles: { github: 'curltest', leetcode: 'curltest', leetcodeSolved: 42 }
      }, studentToken);
      result('/api/students/:studentId', 'PATCH', 'STUDENT', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
    } catch (e) {
      result('/api/students/:studentId', 'PATCH', 'STUDENT', 200, 'ERR', e.message);
    }
  }

  // ── 18. PATCH /api/students/:studentId (other student's record → 403) ────
  if (studentId) {
    try {
      const r = await request('PATCH', `/api/students/${ARJUN_STUDENT_ID}`, {}, studentToken);
      result('/api/students/:studentId (other student → 403)', 'PATCH', 'STUDENT', 403, r.status);
    } catch (e) {
      result('/api/students/:studentId (other, 403)', 'PATCH', 'STUDENT', 403, 'ERR', e.message);
    }
  }

  // ── ADMIN ROUTES ─────────────────────────────────────────────────────────

  // ── 19. Login as admin ───────────────────────────────────────────────────
  let adminLoginStatus = null;
  try {
    const r = await request('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminLoginStatus = r.status;
    if (r.status === 200) {
      adminToken = r.body.data.token;
      console.log(`   → Admin token acquired`);
    } else {
      console.log(`   → Admin login failed (${r.status}): ${JSON.stringify(r.body)}`);
    }
    result('/api/auth/login (admin)', 'POST', 'None', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
  } catch (e) {
    result('/api/auth/login (admin)', 'POST', 'None', 200, 'ERR', e.message);
  }

  // ── 20. GET /api/admin/users — student token → 403 ───────────────────────
  try {
    const r = await request('GET', '/api/admin/users', null, studentToken);
    result('/api/admin/users (student token → 403)', 'GET', 'STUDENT', 403, r.status);
  } catch (e) {
    result('/api/admin/users (student token → 403)', 'GET', 'STUDENT', 403, 'ERR', e.message);
  }

  // ── 21. GET /api/admin/users — admin token ───────────────────────────────
  if (adminToken) {
    try {
      const r = await request('GET', '/api/admin/users', null, adminToken);
      result('/api/admin/users', 'GET', 'PROGRAM_ADMIN', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
    } catch (e) {
      result('/api/admin/users', 'GET', 'PROGRAM_ADMIN', 200, 'ERR', e.message);
    }
  } else {
    results.push({ route: '/api/admin/users', method: 'GET', authType: 'PROGRAM_ADMIN', expected: 200, got: 'SKIP', result: 'SKIP', extra: 'admin login failed' });
    console.log('SKIP GET /api/admin/users — admin token not available');
  }

  // ── 22. GET /api/admin/users?role=STUDENT ────────────────────────────────
  if (adminToken) {
    try {
      const r = await request('GET', '/api/admin/users?role=STUDENT', null, adminToken);
      result('/api/admin/users?role=STUDENT', 'GET', 'PROGRAM_ADMIN', 200, r.status);
    } catch (e) {
      result('/api/admin/users?role=STUDENT', 'GET', 'PROGRAM_ADMIN', 200, 'ERR', e.message);
    }
  }

  // ── 23. PATCH /api/admin/users/:id/role ──────────────────────────────────
  // Change test user (STUDENT) to TRAINER and back
  if (adminToken && studentUserId) {
    try {
      const r = await request('PATCH', `/api/admin/users/${studentUserId}/role`, { role: 'TRAINER' }, adminToken);
      result('/api/admin/users/:id/role', 'PATCH', 'PROGRAM_ADMIN', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
      // Restore to STUDENT
      if (r.status === 200) {
        await request('PATCH', `/api/admin/users/${studentUserId}/role`, { role: 'STUDENT' }, adminToken);
      }
    } catch (e) {
      result('/api/admin/users/:id/role', 'PATCH', 'PROGRAM_ADMIN', 200, 'ERR', e.message);
    }
  } else {
    results.push({ route: '/api/admin/users/:id/role', method: 'PATCH', authType: 'PROGRAM_ADMIN', expected: 200, got: 'SKIP', result: 'SKIP', extra: 'admin token or userId missing' });
    console.log('SKIP PATCH /api/admin/users/:id/role');
  }

  // ── 24. PATCH /api/admin/users/:id/role — try to grant PROGRAM_ADMIN → 403 ─
  if (adminToken && studentUserId) {
    try {
      const r = await request('PATCH', `/api/admin/users/${studentUserId}/role`, { role: 'PROGRAM_ADMIN' }, adminToken);
      result('/api/admin/users/:id/role (→PROGRAM_ADMIN → 403)', 'PATCH', 'PROGRAM_ADMIN', 403, r.status);
    } catch (e) {
      result('/api/admin/users/:id/role (→PROGRAM_ADMIN)', 'PATCH', 'PROGRAM_ADMIN', 403, 'ERR', e.message);
    }
  }

  // ── 25. PATCH /api/admin/users/:id/status ────────────────────────────────
  if (adminToken && studentUserId) {
    try {
      const r = await request('PATCH', `/api/admin/users/${studentUserId}/status`, { status: 'INACTIVE' }, adminToken);
      result('/api/admin/users/:id/status', 'PATCH', 'PROGRAM_ADMIN', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
      // Restore to ACTIVE
      if (r.status === 200) {
        await request('PATCH', `/api/admin/users/${studentUserId}/status`, { status: 'ACTIVE' }, adminToken);
      }
    } catch (e) {
      result('/api/admin/users/:id/status', 'PATCH', 'PROGRAM_ADMIN', 200, 'ERR', e.message);
    }
  }

  // ── MENTOR ROUTES ────────────────────────────────────────────────────────

  // ── Re-login student — admin role change increments token_version, revoking the old token ─
  try {
    const r = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
    if (r.status === 200) {
      studentToken = r.body.data.token;
      console.log('   → Student token refreshed after admin role/status change (token_version incremented)');
    }
  } catch {}

  // ── 26. Login as mentor ──────────────────────────────────────────────────
  try {
    const r = await request('POST', '/api/auth/login', { email: MENTOR_EMAIL, password: MENTOR_PASSWORD });
    if (r.status === 200) {
      mentorToken = r.body.data.token;
      console.log(`   → Mentor token acquired`);
    } else {
      console.log(`   → Mentor login failed (${r.status}): ${JSON.stringify(r.body)}`);
    }
    result('/api/auth/login (mentor)', 'POST', 'None', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
  } catch (e) {
    result('/api/auth/login (mentor)', 'POST', 'None', 200, 'ERR', e.message);
  }

  // ── 27. GET /api/mentors/my-students — student token → 403 ───────────────
  try {
    const r = await request('GET', '/api/mentors/my-students', null, studentToken);
    result('/api/mentors/my-students (student → 403)', 'GET', 'STUDENT', 403, r.status);
  } catch (e) {
    result('/api/mentors/my-students (student → 403)', 'GET', 'STUDENT', 403, 'ERR', e.message);
  }

  // ── 28. GET /api/mentors/my-students — mentor token ─────────────────────
  if (mentorToken) {
    try {
      const r = await request('GET', '/api/mentors/my-students', null, mentorToken);
      result('/api/mentors/my-students', 'GET', 'FACULTY_MENTOR', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
    } catch (e) {
      result('/api/mentors/my-students', 'GET', 'FACULTY_MENTOR', 200, 'ERR', e.message);
    }
  } else {
    results.push({ route: '/api/mentors/my-students', method: 'GET', authType: 'FACULTY_MENTOR', expected: 200, got: 'SKIP', result: 'SKIP', extra: 'mentor login failed' });
    console.log('SKIP GET /api/mentors/my-students');
  }

  // ── 29. POST /api/mentors/assign — student token → 403 ───────────────────
  try {
    const r = await request('POST', '/api/mentors/assign', {
      studentId: ARJUN_STUDENT_ID,
      mentorId: '00000000-0000-0000-0000-000000000000',
    }, studentToken);
    result('/api/mentors/assign (student → 403)', 'POST', 'STUDENT', 403, r.status);
  } catch (e) {
    result('/api/mentors/assign (student → 403)', 'POST', 'STUDENT', 403, 'ERR', e.message);
  }

  // ── 30. POST /api/mentors/assign — admin token, mentor + student must exist ─
  if (adminToken) {
    // First get the mentor userId from DB-queried data — we'll look up via /admin/users
    // Try to get the mentor userId from the users list
    let mentorUserId = null;
    try {
      const listR = await request('GET', '/api/admin/users?role=FACULTY_MENTOR', null, adminToken);
      if (listR.status === 200 && listR.body?.data?.users?.length > 0) {
        mentorUserId = listR.body.data.users[0].id;
        console.log(`   → Found mentor userId=${mentorUserId}`);
      }
    } catch {}

    if (mentorUserId && studentId) {
      try {
        const r = await request('POST', '/api/mentors/assign', {
          studentId,
          mentorId: mentorUserId,
        }, adminToken);
        result('/api/mentors/assign', 'POST', 'PROGRAM_ADMIN', [200, 201], r.status, r.status >= 400 ? JSON.stringify(r.body) : '');
      } catch (e) {
        result('/api/mentors/assign', 'POST', 'PROGRAM_ADMIN', [200, 201], 'ERR', e.message);
      }
    } else {
      results.push({ route: '/api/mentors/assign', method: 'POST', authType: 'PROGRAM_ADMIN', expected: 201, got: 'SKIP', result: 'SKIP', extra: 'mentorUserId not found' });
      console.log('SKIP POST /api/mentors/assign — mentorUserId not available');
    }
  }

  // ── SESSION / INTERVIEW ROUTES ───────────────────────────────────────────

  // ── 31. GET /api/sessions/bank-fallback?difficulty=EASY ─────────────────
  try {
    const r = await request('GET', '/api/sessions/bank-fallback?difficulty=EASY', null, studentToken);
    result('/api/sessions/bank-fallback?difficulty=EASY', 'GET', 'STUDENT', 200, r.status, r.status !== 200 ? JSON.stringify(r.body) : '');
  } catch (e) {
    result('/api/sessions/bank-fallback?difficulty=EASY', 'GET', 'STUDENT', 200, 'ERR', e.message);
  }

  // ── 32. GET /api/sessions/bank-fallback?difficulty=MEDIUM ────────────────
  try {
    const r = await request('GET', '/api/sessions/bank-fallback?difficulty=MEDIUM', null, studentToken);
    result('/api/sessions/bank-fallback?difficulty=MEDIUM', 'GET', 'STUDENT', 200, r.status);
  } catch (e) {
    result('/api/sessions/bank-fallback?difficulty=MEDIUM', 'GET', 'STUDENT', 200, 'ERR', e.message);
  }

  // ── 33. GET /api/sessions/bank-fallback?difficulty=ADVANCED ──────────────
  try {
    const r = await request('GET', '/api/sessions/bank-fallback?difficulty=ADVANCED', null, studentToken);
    result('/api/sessions/bank-fallback?difficulty=ADVANCED', 'GET', 'STUDENT', 200, r.status);
  } catch (e) {
    result('/api/sessions/bank-fallback?difficulty=ADVANCED', 'GET', 'STUDENT', 200, 'ERR', e.message);
  }

  // ── 34. GET /api/sessions/bank-fallback — no auth → 401 ──────────────────
  try {
    const r = await request('GET', '/api/sessions/bank-fallback?difficulty=EASY');
    result('/api/sessions/bank-fallback (no auth → 401)', 'GET', 'None', 401, r.status);
  } catch (e) {
    result('/api/sessions/bank-fallback (no auth → 401)', 'GET', 'None', 401, 'ERR', e.message);
  }

  // ── 35. GET /api/sessions/bank-fallback — invalid difficulty → 400 ────────
  try {
    const r = await request('GET', '/api/sessions/bank-fallback?difficulty=BOGUS', null, studentToken);
    result('/api/sessions/bank-fallback (invalid difficulty → 400)', 'GET', 'STUDENT', 400, r.status);
  } catch (e) {
    result('/api/sessions/bank-fallback (invalid difficulty → 400)', 'GET', 'STUDENT', 400, 'ERR', e.message);
  }

  // ── Print summary table ──────────────────────────────────────────────────
  const pad = (s, n) => String(s).padEnd(n);
  const LINE = '─'.repeat(130);

  console.log(`\n\n${LINE}`);
  console.log(`${'Route'.padEnd(55)} ${'Method'.padEnd(8)} ${'Auth'.padEnd(22)} ${'Exp'.padEnd(8)} ${'Got'.padEnd(8)} Result`);
  console.log(LINE);

  let pass = 0, fail = 0, skip = 0;
  for (const r of results) {
    const icon = r.result === 'PASS' ? 'PASS' : r.result === 'SKIP' ? 'SKIP' : 'FAIL';
    const extra = r.extra ? `  ← ${r.extra}` : '';
    console.log(`${pad(r.route, 55)} ${pad(r.method, 8)} ${pad(r.authType, 22)} ${pad(r.expected, 8)} ${pad(r.got, 8)} ${icon}${extra}`);
    if (r.result === 'PASS') pass++;
    else if (r.result === 'SKIP') skip++;
    else fail++;
  }

  console.log(LINE);
  console.log(`Total: ${results.length}  |  PASS: ${pass}  |  FAIL: ${fail}  |  SKIP: ${skip}`);
  console.log(LINE);

  if (fail > 0) {
    console.log('\n=== FAILURES ===');
    for (const r of results.filter(r => r.result === 'FAIL')) {
      console.log(`\nFAIL: ${r.method} ${r.route}`);
      console.log(`  Expected: ${r.expected}  Got: ${r.got}`);
      if (r.extra) console.log(`  Detail: ${r.extra}`);
    }
  }

  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(2);
});
