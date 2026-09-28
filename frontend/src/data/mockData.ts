import { StudentProfile, CriteriaTask, TrainerTenure, InterviewAssignment, QuestionTurn, DynamicProgram } from '../types';

export const INITIAL_CRITERIA_TASKS: CriteriaTask[] = [
  {
    id: 'crit-1',
    title: 'Solve 50 LeetCode Medium Questions',
    description: 'Minimum 50 Medium problems in DP, Graphs, and Trees.',
    targetTrack: 'ALL',
    isCompleted: true,
    verifiedByMentor: true,
    verifiedAt: '2026-09-10'
  },
  {
    id: 'crit-2',
    title: 'Resume Review & Verification',
    description: 'Complete ATS score audit and upload verified version.',
    targetTrack: 'ALL',
    isCompleted: true,
    verifiedByMentor: true,
    verifiedAt: '2026-09-12'
  },
  {
    id: 'crit-3',
    title: 'Attend 3 Full Proctored Mock Interviews',
    description: 'Score at least 75% aggregate on communication and technical questions.',
    targetTrack: 'ALL',
    isCompleted: true,
    verifiedByMentor: false
  },
  {
    id: 'crit-4',
    title: 'Complete Cloud / Domain Certification',
    description: 'Industry recognized cloud or technical specialization certification.',
    targetTrack: 'ALL',
    isCompleted: false,
    verifiedByMentor: false
  },
  {
    id: 'crit-5',
    title: 'Internal Capstone Project Milestone',
    description: 'Deploy full-stack project with live URL and GitHub documentation.',
    targetTrack: 'ALL',
    isCompleted: true,
    verifiedByMentor: false
  }
];

export const DEFAULT_CLEAN_STUDENT: StudentProfile = {
  id: 'stu-fresh',
  name: 'Candidate Student',
  rollNumber: '22CS1001',
  email: 'student@college.edu',
  department: 'Computer Science & Engineering',
  batchYear: 2026,
  track: 'General Track',
  mentorName: 'Dr. S. Ranganathan',
  mentorEmail: 'ranganathan.s@college.edu',
  codingHandles: {
    github: undefined,
    leetcode: undefined,
    hackerrank: undefined,
    codeforces: undefined,
    codechef: undefined,
    leetcodeSolved: 0,
    githubRepos: 0
  },
  resume: null,
  criteriaTasks: INITIAL_CRITERIA_TASKS.map(t => ({ ...t, isCompleted: false, verifiedByMentor: false })),
  recentReports: []
};

export const INITIAL_STUDENT_PROFILE: StudentProfile = {
  id: 'stu-101',
  name: 'Aravind Kumar',
  rollNumber: '21CS1084',
  email: 'aravind.k@college.edu',
  department: 'Computer Science & Engineering',
  batchYear: 2026,
  track: 'General Track',
  mentorName: 'Dr. S. Ranganathan',
  mentorEmail: 'ranganathan.s@college.edu',
  codingHandles: {
    github: 'https://github.com/aravind-dev',
    leetcode: 'aravind_coder',
    hackerrank: 'aravind_k',
    codeforces: 'aravind_master',
    codechef: 'aravind_4star',
    leetcodeSolved: 248,
    githubRepos: 18
  },
  resume: {
    fileName: 'Aravind_Kumar_CSE_Resume.pdf',
    parsedAt: '2026-09-15',
    summary: 'Full Stack & Distributed Systems enthusiast with expertise in Java, Spring Boot, React, and PostgreSQL. Built high-concurrency microservices and real-time streaming pipelines.',
    skills: {
      languages: ['Java', 'TypeScript', 'Python', 'C++', 'SQL'],
      frameworks: ['Spring Boot', 'React', 'Node.js', 'Express', 'Tailwind CSS'],
      databases: ['PostgreSQL', 'Redis', 'MongoDB'],
      tools: ['Docker', 'Kafka', 'Git', 'AWS (S3, EC2)', 'Linux']
    },
    projects: [
      {
        title: 'Microservices E-Commerce Pipeline',
        techStack: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL', 'Docker'],
        description: 'Event-driven architecture with Kafka order processing handling 1,500 requests/sec with Redis caching.'
      },
      {
        title: 'Campus Interview Readiness Portal',
        techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js'],
        description: 'Role-based placement preparation portal with live voice evaluation and proctoring analytics.'
      }
    ]
  },
  criteriaTasks: INITIAL_CRITERIA_TASKS,
  recentReports: [
    {
      id: 'rep-001',
      date: '2026-09-16',
      sessionType: 'MOCK_INTERVIEW',
      overallScore: 82,
      technicalScore: 86,
      communicationScore: 74,
      averageWpm: 118,
      totalFillerWords: 14,
      fillerWordBreakdown: { 'uh': 6, 'um': 5, 'like': 2, 'actually': 1 },
      skillBreakdown: [
        { skill: 'Java & OOP Principles', score: 90, status: 'STRONG', recommendation: 'Solid command of memory model and concurrency.' },
        { skill: 'Distributed Systems & Kafka', score: 85, status: 'STRONG', recommendation: 'Articulated partition offsets and consumer lag well.' },
        { skill: 'Database Indexing & PostgreSQL', score: 62, status: 'MODERATE', recommendation: 'Review composite B-Tree index column order and EXPLAIN ANALYZE.' },
        { skill: 'System Design & Trade-offs', score: 48, status: 'NEEDS_WORK', recommendation: 'Practice CAP theorem trade-offs and caching invalidation strategies.' }
      ],
      actionableNextSteps: [
        'Practice slowing down opening thoughts by taking a 2-second breath before answering rather than saying "um".',
        'Your speaking speed (118 WPM) is slightly hesitant; target a steady conversational 130–145 WPM.',
        'Study B-Tree composite indexing in PostgreSQL to answer query optimization questions with deeper authority.'
      ],
      tabSwitches: 1,
      isFlagged: false
    }
  ]
};

export const MOCK_INTERVIEW_QUESTIONS: QuestionTurn[] = [
  {
    id: 'q-1',
    questionNumber: 1,
    questionText: 'I see in your resume you built a Microservices E-Commerce pipeline using Kafka. Could you explain why you chose Kafka over RabbitMQ, and how you handled consumer backpressure?',
    difficulty: 'EASY'
  },
  {
    id: 'q-2',
    questionNumber: 2,
    questionText: 'In your PostgreSQL order database, how did you design transaction isolation to prevent double-spending or inventory race conditions under heavy concurrent checkout traffic?',
    difficulty: 'MEDIUM'
  },
  {
    id: 'q-3',
    questionNumber: 3,
    questionText: 'Suppose one of your payment microservices experiences high latency and begins timing out. Walk me through how you would implement the Circuit Breaker pattern with fallback degradation.',
    difficulty: 'MEDIUM'
  },
  {
    id: 'q-4',
    questionNumber: 4,
    questionText: 'Let us dive deeper into Java concurrency. Can you contrast the memory semantics of the volatile keyword versus synchronized blocks, and explain what happening at the CPU cache level?',
    difficulty: 'ADVANCED'
  }
];

export const LISTENING_PASSAGES = [
  {
    id: 'pass-finpay',
    title: 'FinPay Systems: Real-Time Payment Settlement Gateway',
    durationSeconds: 65,
    domain: 'FinTech & Distributed Systems',
    narrativeText: `The client, FinPay Systems, requires a resilient settlement engine processing domestic merchant transactions. Each transaction payload contains a merchant identifier, timestamp in UTC, and an idempotent transaction reference. The system must guarantee a maximum end-to-end latency of 250 milliseconds with ninety-nine point nine nine percent availability. In the event of a banking network partition, the settlement ledger must reject incoming charge requests with error code 503 rather than queuing indefinite retries. All transaction state events must be audited in an immutable append-only ledger before issuing confirmation webhooks to merchants.`,
    questions: [
      {
        id: 'lq-1',
        questionText: 'What is the maximum end-to-end latency specified by FinPay Systems for merchant transactions?',
        expectedAnswer: '250 milliseconds',
        keywords: ['250', 'millisecond', 'latency']
      },
      {
        id: 'lq-2',
        questionText: 'What should the settlement engine do if a banking network partition occurs?',
        expectedAnswer: 'Reject incoming charge requests with error code 503 instead of queuing indefinite retries.',
        keywords: ['reject', '503', 'partition', 'indefinite', 'retry']
      },
      {
        id: 'lq-3',
        questionText: 'What must happen before confirmation webhooks are dispatched to merchants?',
        expectedAnswer: 'All transaction state events must be audited into an immutable append-only ledger.',
        keywords: ['audit', 'immutable', 'append-only', 'ledger', 'events']
      }
    ]
  },
  {
    id: 'pass-cloudscale',
    title: 'CloudScale: Microservices Decoupling & API Gateway Migration',
    durationSeconds: 58,
    domain: 'Cloud Computing & DevOps',
    narrativeText: `CloudScale Infrastructure is decomposing a legacy monolith into event-driven containerized microservices hosted on Kubernetes. To prevent catastrophic cascading failures, the API gateway enforces token-bucket rate limiting capped at 5,000 requests per second per tenant. Inter-service communications must migrate from synchronous REST to asynchronous Apache Kafka topic partitions. In the event of persistent worker node depletion, consumer pods must automatically scale using Horizontal Pod Autoscalers driven by Prometheus lag metrics.`,
    questions: [
      {
        id: 'lq-1',
        questionText: 'What rate-limiting algorithm and throughput limit does the API gateway enforce per tenant?',
        expectedAnswer: 'Token-bucket rate limiting capped at 5,000 requests per second per tenant.',
        keywords: ['token-bucket', '5000', 'rate limit', 'requests per second']
      },
      {
        id: 'lq-2',
        questionText: 'How must inter-service communications be handled during the migration?',
        expectedAnswer: 'Migrate from synchronous REST to asynchronous Apache Kafka topic partitions.',
        keywords: ['kafka', 'asynchronous', 'topic', 'partitions', 'rest']
      },
      {
        id: 'lq-3',
        questionText: 'What metric and mechanism trigger pod autoscaling under heavy worker load?',
        expectedAnswer: 'Horizontal Pod Autoscalers driven by Prometheus lag metrics.',
        keywords: ['horizontal pod autoscaler', 'hpa', 'prometheus', 'lag']
      }
    ]
  },
  {
    id: 'pass-neurodata',
    title: 'NeuroData AI: Low-Latency Feature Store & Model Inference',
    durationSeconds: 62,
    domain: 'AI / Machine Learning',
    narrativeText: `NeuroData AI operates a distributed real-time recommendation pipeline serving online predictions. The feature store separates real-time online features stored in Redis clusters with sub-10-millisecond read SLAs from offline training features maintained in Parquet lakehouses. Model inference servers receive compressed payload vectors via gRPC channels. If the p99 inference latency exceeds 80 milliseconds, the load balancer must fallback to cached pre-computed embeddings and trigger an alert to the telemetry on-call channel.`,
    questions: [
      {
        id: 'lq-1',
        questionText: 'What is the read latency SLA and storage engine used for the online feature store?',
        expectedAnswer: 'Sub-10-millisecond read SLA using Redis clusters.',
        keywords: ['10', 'millisecond', 'redis', 'sub-10']
      },
      {
        id: 'lq-2',
        questionText: 'What communication protocol is mandated for streaming compressed payload vectors to model servers?',
        expectedAnswer: 'gRPC channels.',
        keywords: ['grpc', 'channel', 'protocol']
      },
      {
        id: 'lq-3',
        questionText: 'What fallback action must the load balancer execute if p99 latency breaches 80 milliseconds?',
        expectedAnswer: 'Fallback to cached pre-computed embeddings and alert the telemetry on-call channel.',
        keywords: ['cached', 'embeddings', 'fallback', 'pre-computed', 'alert']
      }
    ]
  },
  {
    id: 'pass-cybershield',
    title: 'CyberShield: Zero-Trust Identity Federation & Token Rotation',
    durationSeconds: 60,
    domain: 'Cybersecurity & Auth',
    narrativeText: `CyberShield is implementing an enterprise-wide Zero Trust access control plane across 15 global satellite offices. User authentication requires hardware-backed FIDO2 security keys paired with mutual TLS device certificates. OAuth access tokens carry an ephemeral lifespan of exactly 15 minutes, after which refresh tokens must perform an atomic single-use exchange. If token replay is detected, the authentication server immediately invalidates all active sessions for that principal and issues a high-priority security event to the SIEM dashboard.`,
    questions: [
      {
        id: 'lq-1',
        questionText: 'What hardware and device requirements are enforced for user authentication?',
        expectedAnswer: 'Hardware-backed FIDO2 security keys paired with mutual TLS device certificates.',
        keywords: ['fido2', 'hardware', 'mutual tls', 'mtls', 'certificate']
      },
      {
        id: 'lq-2',
        questionText: 'What is the exact lifespan of issued OAuth access tokens?',
        expectedAnswer: '15 minutes.',
        keywords: ['15', 'minute', 'ephemeral']
      },
      {
        id: 'lq-3',
        questionText: 'What immediate security remediation occurs if token replay is detected?',
        expectedAnswer: 'Immediately invalidates all active sessions for that principal and dispatches an alert to the SIEM dashboard.',
        keywords: ['invalidate', 'sessions', 'principal', 'siem', 'replay']
      }
    ]
  }
];

export const LISTENING_PASSAGE = LISTENING_PASSAGES[0];

export const MOCK_TRAINER_TENURES: TrainerTenure[] = [
  {
    id: 'trn-1',
    trainerName: 'Vikramaditya Sharma',
    trainerEmail: 'vikram.sharma@techtraining.org',
    companyOrInstitute: 'SkillMatrix Academy',
    domain: 'Cloud Computing & DevOps',
    startDate: '2026-09-15',
    endDate: '2026-09-29',
    isActive: true
  },
  {
    id: 'trn-2',
    trainerName: 'Sneha Kapur',
    trainerEmail: 'sneha.k@codecraft.io',
    companyOrInstitute: 'CodeCraft Solutions',
    domain: 'Full Stack Development',
    startDate: '2026-09-10',
    endDate: '2026-09-24',
    isActive: true
  },
  {
    id: 'trn-3',
    trainerName: 'Rajesh Nambiar',
    trainerEmail: 'rajesh@cyberedge.com',
    companyOrInstitute: 'CyberEdge Global',
    domain: 'Cybersecurity & Ethical Hacking',
    startDate: '2026-08-01',
    endDate: '2026-08-15',
    isActive: false
  }
];

export const MOCK_ASSIGNMENTS: InterviewAssignment[] = [
  {
    id: 'asg-1',
    title: 'University-Wide Pre-Placement Mock Drill #2',
    sessionType: 'MOCK_INTERVIEW',
    assignedByRole: 'PLACEMENT_COORDINATOR',
    assignedByName: 'Prof. K. Venkatesh (Placement Officer)',
    assignedByEmail: 'coord@college.edu',
    collegeId: 'col-1',
    targetScope: 'ALL_STUDENTS',
    targetDomainOrTrack: 'All Batches (2026)',
    domainOrTopic: 'Full Stack & System Architecture',
    difficulty: 'MEDIUM',
    customInstructions: 'Evaluate clear technical communication, trade-off reasoning, and structured problem solving.',
    dueDate: '2026-10-05',
    isMandatory: true,
    createdAt: '2026-09-20',
    submissions: [
      {
        studentId: 'stu-21cs1084',
        studentName: 'Aravind Kumar',
        studentRollNumber: '21CS1084',
        score: 86,
        sessionType: 'MOCK_INTERVIEW',
        submittedAt: '2026-09-22T10:30:00Z',
        status: 'COMPLETED'
      }
    ]
  },
  {
    id: 'asg-2',
    title: 'Auditory Precision Drill: FinPay Transaction Gateway',
    sessionType: 'LISTENING_COMPREHENSION',
    assignedByRole: 'FACULTY_MENTOR',
    assignedByName: 'Dr. S. Sundaram (Faculty Mentor)',
    assignedByEmail: 'mentor@college.edu',
    collegeId: 'col-1',
    targetScope: 'MY_MENTEES',
    targetDomainOrTrack: 'Assigned Mentees',
    listeningPassageId: 'pass-finpay',
    difficulty: 'MEDIUM',
    customInstructions: 'Listen closely to the transaction flow narrative. Pay strict attention to retry timeouts and distributed lock parameters.',
    dueDate: '2026-10-08',
    isMandatory: true,
    createdAt: '2026-09-22',
    submissions: []
  },
  {
    id: 'asg-3',
    title: 'Cloud Architecture & Microservices Technical Drill',
    sessionType: 'MOCK_INTERVIEW',
    assignedByRole: 'TRAINER',
    assignedByName: 'Vikramaditya Sharma (Visiting Trainer)',
    assignedByEmail: 'vikram.sharma@techtraining.org',
    collegeId: 'col-1',
    targetScope: 'PROGRAM',
    targetDomainOrTrack: 'Cloud Computing & DevOps',
    domainOrTopic: 'Cloud Computing & DevOps',
    difficulty: 'ADVANCED',
    customInstructions: 'Focus on Kafka partition rebalancing, Kubernetes ingress controllers, and zero-downtime rolling deploys.',
    dueDate: '2026-10-10',
    isMandatory: false,
    createdAt: '2026-09-24',
    submissions: []
  },
  {
    id: 'asg-4',
    title: 'Zero-Trust Architecture Listening Assessment',
    sessionType: 'LISTENING_COMPREHENSION',
    assignedByRole: 'PROGRAM_ADMIN',
    assignedByName: 'Technical Program Lead',
    assignedByEmail: 'program@college.edu',
    collegeId: 'col-1',
    targetScope: 'ALL_STUDENTS',
    targetDomainOrTrack: 'Institutional Engineering Stream',
    listeningPassageId: 'pass-cybershield',
    difficulty: 'ADVANCED',
    customInstructions: 'Listen to the multi-office zero trust briefing and answer security remediation questions.',
    dueDate: '2026-10-12',
    isMandatory: true,
    createdAt: '2026-09-25',
    submissions: []
  }
];

export const MOCK_MENTEES_LIST = [
  { id: 'm-1', name: 'Aravind Kumar', rollNumber: '21CS1084', department: 'Computer Science & Engineering', track: 'General Track', domain: 'Full Stack', score: 82, checklist: '4/5', status: 'ON_TRACK' },
  { id: 'm-2', name: 'Pooja Sundaram', rollNumber: '21CS1092', department: 'Computer Science & Engineering', track: 'General Track', domain: 'AI/ML', score: 88, checklist: '5/5', status: 'PLACEMENT_READY' },
  { id: 'm-3', name: 'Karthik Raja', rollNumber: '21CS1015', department: 'Information Technology', track: 'General Track', domain: 'Cloud & DevOps', score: 71, checklist: '3/5', status: 'NEEDS_ATTENTION' },
  { id: 'm-4', name: 'Deepa Natarajan', rollNumber: '21CS1038', department: 'Information Technology', track: 'General Track', domain: 'Cybersecurity', score: 76, checklist: '4/5', status: 'ON_TRACK' },
  { id: 'm-5', name: 'Manoj Kumar V', rollNumber: '21CS1055', department: 'Mechanical Engineering', track: 'General Track', domain: 'Core Engineering', score: 58, checklist: '2/5', status: 'AT_RISK' },
  { id: 'm-6', name: 'Sanjay Krishnan', rollNumber: '21CS1102', department: 'Electronics & Communication', track: 'General Track', domain: 'Core Systems', score: 74, checklist: '3/5', status: 'ON_TRACK' },
  { id: 'm-7', name: 'Swetha Balan', rollNumber: '21CS1118', department: 'Information Technology', track: 'General Track', domain: 'UI/UX Design', score: 79, checklist: '4/5', status: 'ON_TRACK' },
  { id: 'm-8', name: 'Harish R', rollNumber: '21CS1049', department: 'Computer Science & Engineering', track: 'General Track', domain: 'Software Engineering', score: 64, checklist: '3/5', status: 'NEEDS_ATTENTION' },
  { id: 'm-9', name: 'Divya Bharathi', rollNumber: '21CS1040', department: 'AI & Data Science', track: 'General Track', domain: 'Data Engineering', score: 84, checklist: '5/5', status: 'PLACEMENT_READY' },
  { id: 'm-10', name: 'Gowtham S', rollNumber: '21CS1044', department: 'Electronics & Communication', track: 'General Track', domain: 'Problem Solving', score: 69, checklist: '2/5', status: 'NEEDS_ATTENTION' }
];

export const MOCK_COLLEGES = [
  {
    id: 'col-1',
    name: "St. Joseph's College of Engineering",
    code: 'SJCE-3118',
    campusCity: 'Chennai, Tamil Nadu',
    createdAt: '2026-01-15T09:00:00Z',
    superAdminEmail: 'superadmin@college.edu',
    superAdminName: 'Dr. Rajesh Nair',
    superAdminStatus: 'ACTIVE' as const
  },
  {
    id: 'col-2',
    name: 'Sri Sairam Engineering College',
    code: 'SEC-1412',
    campusCity: 'Chennai, Tamil Nadu',
    createdAt: '2026-03-10T10:30:00Z',
    superAdminEmail: 'superadmin.sairam@college.edu',
    superAdminName: 'Dr. Meenakshi Sundaram',
    superAdminStatus: 'PENDING_INVITE' as const
  },
  {
    id: 'col-3',
    name: 'Chennai Institute of Technology',
    code: 'CIT-1115',
    campusCity: 'Kundrathur, Chennai',
    createdAt: '2026-05-18T14:15:00Z',
    superAdminEmail: 'admin.cit@college.edu',
    superAdminName: 'Dr. P. Ravichandran',
    superAdminStatus: 'ACTIVE' as const
  }
];

export const MOCK_DYNAMIC_DEPARTMENTS = [
  {
    id: 'dept-1',
    collegeId: 'col-1',
    name: 'Computer Science & Engineering',
    code: 'CSE',
    assignedAdminEmail: 'admin.cse@college.edu',
    assignedAdminName: 'Dr. A. Murugan',
    adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_MANAGE_STUDENTS'] as any[]
  },
  {
    id: 'dept-2',
    collegeId: 'col-1',
    name: 'Information Technology',
    code: 'IT',
    assignedAdminEmail: 'admin.it@college.edu',
    assignedAdminName: 'Dr. B. Vijayalakshmi',
    adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_MANAGE_STUDENTS'] as any[]
  },
  {
    id: 'dept-3',
    collegeId: 'col-1',
    name: 'Electronics & Communication Engineering',
    code: 'ECE',
    assignedAdminEmail: 'admin.ece@college.edu',
    assignedAdminName: 'Dr. K. Chandrasekar',
    adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS'] as any[]
  },
  {
    id: 'dept-4',
    collegeId: 'col-1',
    name: 'Artificial Intelligence & Data Science',
    code: 'AI&DS',
    assignedAdminEmail: 'admin.aids@college.edu',
    assignedAdminName: 'Dr. M. Sangeetha',
    adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_ASSIGN_LISTENING'] as any[]
  },
  {
    id: 'dept-5',
    collegeId: 'col-1',
    name: 'Mechanical Engineering',
    code: 'MECH',
    assignedAdminEmail: 'admin.mech@college.edu',
    assignedAdminName: 'Dr. R. Kannan',
    adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS'] as any[]
  }
];

export const MOCK_DYNAMIC_PROGRAMS: DynamicProgram[] = [];

export const ADMIN_PERMISSION_LABELS: Record<string, { label: string; desc: string }> = {
  'CAN_VIEW_STUDENT_PROGRESS': {
    label: 'View Students’ Progress',
    desc: 'Access live diagnostic reports, telemetry, WPM scores, and filler word analytics.'
  },
  'CAN_ASSIGN_INTERVIEWS': {
    label: 'Assign Mock Technical Interviews',
    desc: 'Schedule and mandate AI mock interview sessions with deadlines for candidates.'
  },
  'CAN_ASSIGN_LISTENING': {
    label: 'Assign Listening Labs',
    desc: 'Curate and assign multi-speaker audio listening comprehension lab sessions.'
  },
  'CAN_ASSIGN_TRAINERS': {
    label: 'Assign Domain Trainers',
    desc: 'Onboard and assign visiting industry trainers to specific programs or common tracks.'
  },
  'CAN_MANAGE_STUDENTS': {
    label: 'Manage Students & Scrutiny',
    desc: 'Enroll students, allocate tracks/sub-programs, and verify placement criteria.'
  },
  'CAN_ASSIGN_SUB_ADMINS': {
    label: 'Assign Admins to Other Programs',
    desc: 'Delegate administrative privileges to sub-programs or cross-program leads.'
  }
};

