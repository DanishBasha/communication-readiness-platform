import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';

export async function runSeed() {
  console.log('--- Seeding Master Database with Demo Data & College Structure ---');
  
  const client = new Client({
    connectionString: config.database.url
  });

  try {
    await client.connect();

    // 1. Seed Programs
    console.log('Seeding programs...');
    const programHope = await client.query(`
      INSERT INTO college.programs (name, description)
      VALUES ('HOPE', 'High-calibre problem solving and competitive coding accelerator')
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id;
    `);
    const hopeProgramId = programHope.rows[0].id;

    const programPep = await client.query(`
      INSERT INTO college.programs (name, description)
      VALUES ('PEP', 'Professional Enhancement Program spanning 21 industry-aligned technical domains')
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id;
    `);
    const pepProgramId = programPep.rows[0].id;

    const programDept = await client.query(`
      INSERT INTO college.programs (name, description)
      VALUES ('DEPARTMENT', 'Standard departmental curriculum and placement preparation')
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id;
    `);
    const deptProgramId = programDept.rows[0].id;

    // 2. Seed Domains (HOPE Elite, HOPE Non-Elite, 21 PEP Domains, Department)
    console.log('Seeding domains...');
    const domainsToSeed = [
      { name: 'HOPE Elite', programId: hopeProgramId, category: 'HOPE' },
      { name: 'HOPE Non-Elite', programId: hopeProgramId, category: 'HOPE' },
      { name: 'Full Stack Development', programId: pepProgramId, category: 'PEP' },
      { name: 'Cloud Computing & DevOps', programId: pepProgramId, category: 'PEP' },
      { name: 'Cybersecurity & Ethical Hacking', programId: pepProgramId, category: 'PEP' },
      { name: 'AI & Machine Learning', programId: pepProgramId, category: 'PEP' },
      { name: 'Data Engineering & Big Data', programId: pepProgramId, category: 'PEP' },
      { name: 'Mobile Application Development', programId: pepProgramId, category: 'PEP' },
      { name: 'Embedded Systems & Firmware', programId: pepProgramId, category: 'PEP' },
      { name: 'Internet of Things (IoT)', programId: pepProgramId, category: 'PEP' },
      { name: 'Blockchain & Web3', programId: pepProgramId, category: 'PEP' },
      { name: 'UI/UX & Product Design', programId: pepProgramId, category: 'PEP' },
      { name: 'VLSI & Hardware Design', programId: pepProgramId, category: 'PEP' },
      { name: 'Robotics & Automation', programId: pepProgramId, category: 'PEP' },
      { name: 'Game Development (Unity/Unreal)', programId: pepProgramId, category: 'PEP' },
      { name: 'Network Engineering & 5G', programId: pepProgramId, category: 'PEP' },
      { name: 'Software Quality Assurance & Automation', programId: pepProgramId, category: 'PEP' },
      { name: 'Site Reliability Engineering (SRE)', programId: pepProgramId, category: 'PEP' },
      { name: 'FinTech & Quantitative Engineering', programId: pepProgramId, category: 'PEP' },
      { name: 'AR/VR & Spatial Computing', programId: pepProgramId, category: 'PEP' },
      { name: 'Natural Language Processing (NLP)', programId: pepProgramId, category: 'PEP' },
      { name: 'Computer Vision & Graphics', programId: pepProgramId, category: 'PEP' },
      { name: 'Enterprise Java Systems', programId: pepProgramId, category: 'PEP' },
      { name: 'Department General Stream', programId: deptProgramId, category: 'DEPARTMENT' }
    ];

    const domainIdMap: Record<string, string> = {};

    for (const d of domainsToSeed) {
      const res = await client.query(`
        INSERT INTO college.domains (name, program_id, track_category)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET track_category = EXCLUDED.track_category
        RETURNING id, name;
      `, [d.name, d.programId, d.category]);
      domainIdMap[d.name] = res.rows[0].id;
    }

    // 3. Seed Users with hashed passwords
    console.log('Seeding core stakeholder accounts...');
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    const usersToSeed = [
      { name: 'Super Administrator', email: 'admin@college.edu', role: 'PROGRAM_ADMIN' },
      { name: 'Dr. S. Ranganathan', email: 'mentor@college.edu', role: 'FACULTY_MENTOR' },
      { name: 'Prof. K. Venkatesh (Placement Dean)', email: 'coordinator@college.edu', role: 'PLACEMENT_COORDINATOR' },
      { name: 'Vikramaditya Sharma', email: 'trainer@college.edu', role: 'TRAINER' },
      { name: 'Candidate Student', email: 'student@college.edu', role: 'STUDENT' },
      { name: 'Prof. K. Venkatesh (Placement Officer)', email: 'placement.dean@college.edu', role: 'PLACEMENT_COORDINATOR' },
      { name: 'Dr. S. Ranganathan', email: 'ranganathan.s@college.edu', role: 'FACULTY_MENTOR' },
      { name: 'Dr. Ananya Roy (HOPE Elite Lead)', email: 'ananya.roy@college.edu', role: 'PROGRAM_ADMIN' },
      { name: 'Vikramaditya Sharma', email: 'vikram.sharma@techtraining.org', role: 'TRAINER' },
      { name: 'Sneha Kapur', email: 'sneha.k@codecraft.io', role: 'TRAINER' },
      { name: 'Rajesh Nambiar', email: 'rajesh@cyberedge.com', role: 'TRAINER' },
      { name: 'Aravind Kumar', email: 'aravind.k@college.edu', role: 'STUDENT' },
      { name: 'Pooja Sundaram', email: 'pooja.s@college.edu', role: 'STUDENT' },
      { name: 'Karthik Raja', email: 'karthik.r@college.edu', role: 'STUDENT' },
      { name: 'Deepa Natarajan', email: 'deepa.n@college.edu', role: 'STUDENT' },
      { name: 'Manoj Kumar V', email: 'manoj.k@college.edu', role: 'STUDENT' },
      { name: 'Sanjay Krishnan', email: 'sanjay.k@college.edu', role: 'STUDENT' },
      { name: 'Swetha Balan', email: 'swetha.b@college.edu', role: 'STUDENT' },
      { name: 'Harish R', email: 'harish.r@college.edu', role: 'STUDENT' },
      { name: 'Divya Bharathi', email: 'divya.b@college.edu', role: 'STUDENT' },
      { name: 'Gowtham S', email: 'gowtham.s@college.edu', role: 'STUDENT' }
    ];

    const userIdMap: Record<string, string> = {};

    for (const u of usersToSeed) {
      const res = await client.query(`
        INSERT INTO identity.users (name, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, 'ACTIVE')
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
        RETURNING id, email;
      `, [u.name, u.email, defaultPasswordHash, u.role]);
      userIdMap[u.email] = res.rows[0].id;
    }

    const mentorId = userIdMap['ranganathan.s@college.edu'];
    const aravindUserId = userIdMap['aravind.k@college.edu'];

    // 4. Seed Trainer Tenures
    console.log('Seeding visiting trainer tenures...');
    await client.query(`
      INSERT INTO college.trainer_tenures (trainer_id, domain_id, company_or_institute, start_date, end_date, is_active)
      VALUES 
        ($1, $2, 'SkillMatrix Academy', '2026-09-15', '2026-09-29', true),
        ($3, $4, 'CodeCraft Solutions', '2026-09-10', '2026-09-24', true),
        ($5, $6, 'CyberEdge Global', '2026-08-01', '2026-08-15', false)
      ON CONFLICT DO NOTHING;
    `, [
      userIdMap['vikram.sharma@techtraining.org'], domainIdMap['Cloud Computing & DevOps'],
      userIdMap['sneha.k@codecraft.io'], domainIdMap['Full Stack Development'],
      userIdMap['rajesh@cyberedge.com'], domainIdMap['Cybersecurity & Ethical Hacking']
    ]);

    // 5. Seed Students (Aravind Kumar + Roster Mentees)
    console.log('Seeding students & assignments...');
    const studentsToSeed = [
      { email: 'student@college.edu', roll: '22CS1001', dept: 'Computer Science & Engineering', year: 2026, track: 'HOPE_ELITE', domain: 'Full Stack Development', leetcode: null, github: null, leetcodeSolved: 0, githubRepos: 0 },
      { email: 'aravind.k@college.edu', roll: '21CS1084', dept: 'Computer Science & Engineering', year: 2026, track: 'HOPE_ELITE', domain: 'Full Stack Development', leetcode: 'aravind_coder', github: 'https://github.com/aravind-dev', leetcodeSolved: 248, githubRepos: 18 },
      { email: 'pooja.s@college.edu', roll: '21CS1092', dept: 'Computer Science & Engineering', year: 2026, track: 'HOPE_ELITE', domain: 'AI & Machine Learning', leetcode: 'pooja_s', github: 'https://github.com/poojasundaram', leetcodeSolved: 310, githubRepos: 22 },
      { email: 'karthik.r@college.edu', roll: '21CS1015', dept: 'Information Technology', year: 2026, track: 'PEP', domain: 'Cloud Computing & DevOps', leetcode: 'karthik_cloud', github: 'https://github.com/karthikraja', leetcodeSolved: 140, githubRepos: 12 },
      { email: 'deepa.n@college.edu', roll: '21CS1038', dept: 'Computer Science & Engineering', year: 2026, track: 'PEP', domain: 'Cybersecurity & Ethical Hacking', leetcode: 'deepa_sec', github: 'https://github.com/deepanatarajan', leetcodeSolved: 195, githubRepos: 14 },
      { email: 'manoj.k@college.edu', roll: '21CS1055', dept: 'Electronics & Communication', year: 2026, track: 'DEPARTMENT', domain: 'Department General Stream', leetcode: 'manoj_ece', github: 'https://github.com/manojkumar', leetcodeSolved: 65, githubRepos: 5 },
      { email: 'sanjay.k@college.edu', roll: '21CS1102', dept: 'Computer Science & Engineering', year: 2026, track: 'HOPE_NON_ELITE', domain: 'Enterprise Java Systems', leetcode: 'sanjay_java', github: 'https://github.com/sanjaykrishnan', leetcodeSolved: 175, githubRepos: 10 },
      { email: 'swetha.b@college.edu', roll: '21CS1118', dept: 'Information Technology', year: 2026, track: 'PEP', domain: 'UI/UX & Product Design', leetcode: 'swetha_ux', github: 'https://github.com/swethabalan', leetcodeSolved: 110, githubRepos: 15 },
      { email: 'harish.r@college.edu', roll: '21CS1049', dept: 'Mechanical Engineering', year: 2026, track: 'DEPARTMENT', domain: 'Department General Stream', leetcode: 'harish_r', github: 'https://github.com/harishr', leetcodeSolved: 80, githubRepos: 6 },
      { email: 'divya.b@college.edu', roll: '21CS1040', dept: 'Computer Science & Engineering', year: 2026, track: 'PEP', domain: 'Data Engineering & Big Data', leetcode: 'divya_data', github: 'https://github.com/divyabharathi', leetcodeSolved: 220, githubRepos: 19 },
      { email: 'gowtham.s@college.edu', roll: '21CS1044', dept: 'Computer Science & Engineering', year: 2026, track: 'HOPE_NON_ELITE', domain: 'HOPE Non-Elite', leetcode: 'gowtham_coder', github: 'https://github.com/gowthams', leetcodeSolved: 130, githubRepos: 8 }
    ];

    const studentIdMap: Record<string, string> = {};

    for (const s of studentsToSeed) {
      const uId = userIdMap[s.email];
      const dId = domainIdMap[s.domain] || null;
      const res = await client.query(`
        INSERT INTO college.students (
          user_id, roll_number, department, batch_year, track, domain_id, mentor_id,
          github_handle, leetcode_handle, leetcode_solved, github_repos
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (roll_number) DO UPDATE SET 
          track = EXCLUDED.track, domain_id = EXCLUDED.domain_id, mentor_id = EXCLUDED.mentor_id,
          leetcode_solved = EXCLUDED.leetcode_solved, github_repos = EXCLUDED.github_repos
        RETURNING id;
      `, [uId, s.roll, s.dept, s.year, s.track, dId, mentorId, s.github, s.leetcode, s.leetcodeSolved, s.githubRepos]);
      studentIdMap[s.email] = res.rows[0].id;
    }

    const aravindStudentId = studentIdMap['aravind.k@college.edu'];

    // 6. Seed Criteria Tasks
    console.log('Seeding criteria tasks...');
    const criteriaTasks = [
      { title: 'Solve 50 LeetCode Medium Questions', description: 'Minimum 50 Medium problems in DP, Graphs, and Trees.', track: 'ALL' },
      { title: 'Resume Review & Verification', description: 'Complete ATS score audit and upload verified version.', track: 'ALL' },
      { title: 'Attend 3 Full Proctored Mock Interviews', description: 'Score at least 75% aggregate on communication and technical questions.', track: 'ALL' },
      { title: 'Complete Cloud / Domain Certification', description: 'AWS Cloud Practitioner / Azure Fundamentals or Domain Equivalent.', track: 'PEP' },
      { title: 'Internal Hackathon / Project Milestone', description: 'Deploy full-stack project with live URL and GitHub documentation.', track: 'HOPE' }
    ];

    const taskIdMap: string[] = [];
    for (const ct of criteriaTasks) {
      const res = await client.query(`
        INSERT INTO college.criteria_tasks (title, description, target_track, is_mandatory)
        VALUES ($1, $2, $3, true)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [ct.title, ct.description, ct.track]);
      if (res.rows.length > 0) {
        taskIdMap.push(res.rows[0].id);
      }
    }

    // If tasks already existed, fetch their IDs
    if (taskIdMap.length === 0) {
      const allTasks = await client.query('SELECT id FROM college.criteria_tasks ORDER BY created_at ASC');
      allTasks.rows.forEach(r => taskIdMap.push(r.id));
    }

    // 7. Seed Student Task Status for Aravind Kumar
    console.log('Seeding student task statuses...');
    if (taskIdMap.length >= 5) {
      await client.query(`
        INSERT INTO college.student_task_status (student_id, task_id, is_completed, completed_at, verified_by_mentor, mentor_user_id, verified_at)
        VALUES
          ($1, $2, true, '2026-09-10', true, $7, '2026-09-10'),
          ($1, $3, true, '2026-09-12', true, $7, '2026-09-12'),
          ($1, $4, true, '2026-09-14', false, NULL, NULL),
          ($1, $5, false, NULL, false, NULL, NULL),
          ($1, $6, true, '2026-09-15', false, NULL, NULL)
        ON CONFLICT (student_id, task_id) DO UPDATE SET is_completed = EXCLUDED.is_completed, verified_by_mentor = EXCLUDED.verified_by_mentor;
      `, [aravindStudentId, taskIdMap[0], taskIdMap[1], taskIdMap[2], taskIdMap[3], taskIdMap[4], mentorId]);
    }

    // 8. Seed Resume for Aravind Kumar
    console.log('Seeding student resume...');
    await client.query(`
      INSERT INTO college.resumes (
        student_id, file_name, file_url, parsed_summary, parsed_skills, parsed_projects, raw_text
      )
      VALUES (
        $1,
        'Aravind_Kumar_CSE_Resume.pdf',
        'https://storage.college.edu/resumes/21CS1084.pdf',
        'Full Stack & Distributed Systems enthusiast with expertise in Java, Spring Boot, React, and PostgreSQL. Built high-concurrency microservices and real-time streaming pipelines.',
        '{"languages":["Java","TypeScript","Python","C++","SQL"],"frameworks":["Spring Boot","React","Node.js","Express","Tailwind CSS"],"databases":["PostgreSQL","Redis","MongoDB"],"tools":["Docker","Kafka","Git","AWS (S3, EC2)","Linux"]}',
        '[{"title":"Microservices E-Commerce Pipeline","techStack":["Java","Spring Boot","Kafka","PostgreSQL","Docker"],"description":"Event-driven architecture with Kafka order processing handling 1,500 requests/sec with Redis caching."},{"title":"Campus Interview Readiness Portal","techStack":["React","TypeScript","Tailwind CSS","Node.js"],"description":"Role-based placement preparation portal with live voice evaluation and proctoring analytics."}]',
        'Aravind Kumar | Computer Science & Engineering | CGPA 8.9 | Skills: Java, Spring Boot, React, Kafka, Redis, Docker...'
      )
      ON CONFLICT (student_id) DO UPDATE SET 
        parsed_summary = EXCLUDED.parsed_summary, parsed_skills = EXCLUDED.parsed_skills, parsed_projects = EXCLUDED.parsed_projects;
    `, [aravindStudentId]);

    // 9. Seed Interview Assignments
    console.log('Seeding mock interview assignments...');
    await client.query(`
      INSERT INTO assessment.interview_assignments (title, assigned_by_id, assigned_by_role, target_track_or_domain, domain_id, due_date, is_mandatory)
      VALUES 
        ('University-Wide Pre-Placement Mock Drill #2', $1, 'PLACEMENT_COORDINATOR', 'All Batches (2026)', NULL, '2026-09-25', true),
        ('HOPE Elite Concurrency & Distributed Systems Mock', $2, 'PROGRAM_ADMIN', 'HOPE Elite', $3, '2026-09-22', true),
        ('Cloud Domain Weekend Architecture Drill', $4, 'TRAINER', 'Cloud Computing & DevOps', $5, '2026-09-21', false)
      ON CONFLICT DO NOTHING;
    `, [
      userIdMap['placement.dean@college.edu'],
      userIdMap['ananya.roy@college.edu'],
      domainIdMap['HOPE Elite'],
      userIdMap['vikram.sharma@techtraining.org'],
      domainIdMap['Cloud Computing & DevOps']
    ]);

    // 10. Seed Listening Passage
    console.log('Seeding listening passage...');
    await client.query(`
      INSERT INTO listening.passages (title, narrative_text, duration_seconds, questions, domain_tag)
      VALUES (
        'Client System Requirements: Real-Time Payment Settlement Gateway',
        'The client, FinPay Systems, requires a resilient settlement engine processing domestic merchant transactions. Each transaction payload contains a merchant identifier, timestamp in UTC, and an idempotent transaction reference. The system must guarantee a maximum end-to-end latency of 250 milliseconds with ninety-nine point nine nine percent availability. In the event of a banking network partition, the settlement ledger must reject incoming charge requests with error code 503 rather than queuing indefinite retries. All transaction state events must be audited in an immutable append-only ledger before issuing confirmation webhooks to merchants.',
        65,
        '[{"id":"lq-1","questionText":"What is the maximum end-to-end latency specified by FinPay Systems for merchant transactions?","expectedAnswer":"250 milliseconds"},{"id":"lq-2","questionText":"What should the settlement engine do if a banking network partition occurs?","expectedAnswer":"Reject incoming charge requests with error code 503 instead of queuing indefinite retries."},{"id":"lq-3","questionText":"What must happen before confirmation webhooks are dispatched to merchants?","expectedAnswer":"All transaction state events must be audited into an immutable append-only ledger."}]',
        'FINTECH_GATEWAY'
      )
      ON CONFLICT DO NOTHING;
    `);

    // 11. Seed Initial Diagnostic Report for Aravind
    console.log('Seeding historical interview report for Aravind...');
    const dummySession = await client.query(`
      INSERT INTO assessment.interview_sessions (student_id, session_type, current_difficulty, turn_index, tab_switch_count, status, started_at, completed_at)
      VALUES ($1, 'MOCK_INTERVIEW', 'ADVANCED', 3, 1, 'COMPLETED', '2026-09-16 10:00:00', '2026-09-16 10:25:00')
      RETURNING id;
    `, [aravindStudentId]);
    const sessId = dummySession.rows[0].id;

    await client.query(`
      INSERT INTO assessment.final_reports (
        session_id, student_id, overall_score, technical_score, communication_score, average_wpm,
        total_filler_words, filler_breakdown, skill_breakdown, actionable_next_steps, tab_switches, is_flagged, created_at
      )
      VALUES (
        $1, $2, 82, 86, 74, 118, 14,
        '{"uh": 6, "um": 5, "like": 2, "actually": 1}',
        '[{"skill":"Java & OOP Principles","score":90,"status":"STRONG","recommendation":"Solid command of memory model and concurrency."},{"skill":"Distributed Systems & Kafka","score":85,"status":"STRONG","recommendation":"Articulated partition offsets and consumer lag well."},{"skill":"Database Indexing & PostgreSQL","score":62,"status":"MODERATE","recommendation":"Review composite B-Tree index column order and EXPLAIN ANALYZE."},{"skill":"System Design & Trade-offs","score":48,"status":"NEEDS_WORK","recommendation":"Practice CAP theorem trade-offs and caching invalidation strategies."}]',
        '["Practice slowing down opening thoughts by taking a 2-second breath before answering rather than saying \\"um\\".","Your speaking speed (118 WPM) is slightly hesitant; target a steady conversational 130–145 WPM.","Study B-Tree composite indexing in PostgreSQL to answer query optimization questions with deeper authority."]',
        1, false, '2026-09-16 10:25:00'
      )
      ON CONFLICT (session_id) DO NOTHING;
    `, [sessId, aravindStudentId]);

    console.log('--- Seeding Completed Successfully ---');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('Seed process finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
