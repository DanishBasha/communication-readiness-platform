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
    recentReports: [],
    coins: 5
  };
  
  export const INITIAL_STUDENT_PROFILE: StudentProfile = {
    id: 'stu-101',
    name: 'Aravind Kumar',
    rollNumber: '21CS1084',
    email: 'aravind.k@college.edu',
    department: 'Computer Science & Engineering',
    batchYear: 2026,
    track: 'General Track',
    coins: 5,
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
        technicalScore: 88,
        communicationScore: 84,
        fluencyScore: 86,
        department: 'Computer Science & Engineering',
        sessionType: 'MOCK_INTERVIEW',
        submittedAt: '2026-09-22T10:30:00Z',
        status: 'COMPLETED',
        recommendation: 'PLACEMENT_READY'
      },
      {
        studentId: 'stu-21cs1092',
        studentName: 'Pooja Sundaram',
        studentRollNumber: '21CS1092',
        score: 91,
        technicalScore: 92,
        communicationScore: 90,
        fluencyScore: 91,
        department: 'Computer Science & Engineering',
        sessionType: 'MOCK_INTERVIEW',
        submittedAt: '2026-09-23T14:15:00Z',
        status: 'COMPLETED',
        recommendation: 'PLACEMENT_READY'
      },
      {
        studentId: 'stu-21cs1015',
        studentName: 'Karthik Raja',
        studentRollNumber: '21CS1015',
        score: 72,
        technicalScore: 70,
        communicationScore: 74,
        fluencyScore: 72,
        department: 'Information Technology',
        sessionType: 'MOCK_INTERVIEW',
        submittedAt: '2026-09-24T09:45:00Z',
        status: 'COMPLETED',
        recommendation: 'ON_TRACK'
      },
      {
        studentId: 'stu-21cs1038',
        studentName: 'Deepa Natarajan',
        studentRollNumber: '21CS1038',
        score: 78,
        technicalScore: 80,
        communicationScore: 76,
        fluencyScore: 78,
        department: 'Information Technology',
        sessionType: 'MOCK_INTERVIEW',
        submittedAt: '2026-09-24T16:20:00Z',
        status: 'COMPLETED',
        recommendation: 'ON_TRACK'
      }
    ]
  },
  {
    id: 'asg-2',
    title: 'Listening Precision Drill: FinPay Transaction Gateway',
    sessionType: 'LISTENING_COMPREHENSION',
    assignedByRole: 'SUPER_ADMIN',
    assignedByName: 'College Super Admin Office',
    assignedByEmail: 'superadmin@college.edu',
    collegeId: 'col-1',
    targetScope: 'DEPARTMENT',
    targetDomainOrTrack: 'Information Technology, CSE',
    targetDepartments: ['Computer Science & Engineering', 'Information Technology'],
    listeningPassageId: 'pass-finpay',
    difficulty: 'MEDIUM',
    customInstructions: 'Listen closely to the transaction flow narrative. Pay strict attention to retry timeouts and distributed lock parameters.',
    dueDate: '2026-10-08',
    isMandatory: true,
    createdAt: '2026-09-22',
    submissions: [
      {
        studentId: 'stu-21cs1084',
        studentName: 'Aravind Kumar',
        studentRollNumber: '21CS1084',
        score: 82,
        technicalScore: 85,
        communicationScore: 80,
        fluencyScore: 81,
        department: 'Computer Science & Engineering',
        sessionType: 'LISTENING_COMPREHENSION',
        submittedAt: '2026-09-23T11:00:00Z',
        status: 'COMPLETED',
        recommendation: 'PLACEMENT_READY'
      },
      {
        studentId: 'stu-21cs1118',
        studentName: 'Swetha Balan',
        studentRollNumber: '21CS1118',
        score: 80,
        technicalScore: 82,
        communicationScore: 78,
        fluencyScore: 80,
        department: 'Information Technology',
        sessionType: 'LISTENING_COMPREHENSION',
        submittedAt: '2026-09-25T15:30:00Z',
        status: 'COMPLETED',
        recommendation: 'ON_TRACK'
      }
    ]
  },
  {
    id: 'asg-3',
    title: 'Cloud Architecture & Microservices Technical Drill',
    sessionType: 'MOCK_INTERVIEW',
    assignedByRole: 'PROGRAM_ADMIN',
    assignedByName: 'Systems & Cloud Program Lead',
    assignedByEmail: 'program@college.edu',
    collegeId: 'col-1',
    targetScope: 'PROGRAM',
    targetDomainOrTrack: 'Cloud Computing & DevOps',
    targetProgramName: 'Cloud Computing & DevOps',
    domainOrTopic: 'Cloud Computing & DevOps',
    difficulty: 'ADVANCED',
    customInstructions: 'Focus on Kafka partition rebalancing, Kubernetes ingress controllers, and zero-downtime rolling deploys.',
    dueDate: '2026-10-10',
    isMandatory: false,
    createdAt: '2026-09-24',
    submissions: [
      {
        studentId: 'stu-21cs1092',
        studentName: 'Pooja Sundaram',
        studentRollNumber: '21CS1092',
        score: 89,
        technicalScore: 90,
        communicationScore: 88,
        fluencyScore: 89,
        department: 'Computer Science & Engineering',
        sessionType: 'MOCK_INTERVIEW',
        submittedAt: '2026-09-26T12:00:00Z',
        status: 'COMPLETED',
        recommendation: 'PLACEMENT_READY'
      }
    ]
  },
  {
    id: 'asg-4',
    title: 'Zero-Trust Architecture Listening Assessment',
    sessionType: 'LISTENING_COMPREHENSION',
    assignedByRole: 'PROGRAM_ADMIN',
    assignedByName: 'Technical Program Lead',
    assignedByEmail: 'program@college.edu',
    collegeId: 'col-1',
    targetScope: 'PROGRAM',
    targetProgramName: 'Institutional Engineering Stream',
    targetDomainOrTrack: 'Institutional Engineering Stream',
    listeningPassageId: 'pass-cybershield',
    difficulty: 'ADVANCED',
    customInstructions: 'Listen to the multi-office zero trust briefing and answer security remediation questions.',
    dueDate: '2026-10-12',
    isMandatory: true,
    createdAt: '2026-09-25',
    submissions: [
      {
        studentId: 'stu-21cs1055',
        studentName: 'Manoj Kumar V',
        studentRollNumber: '21CS1055',
        score: 74,
        technicalScore: 76,
        communicationScore: 72,
        fluencyScore: 75,
        department: 'Mechanical Engineering',
        sessionType: 'LISTENING_COMPREHENSION',
        submittedAt: '2026-09-27T10:15:00Z',
        status: 'COMPLETED',
        recommendation: 'ON_TRACK'
      }
    ]
  },
  {
    id: 'asg-hope-1',
    title: 'Hope Fast-Track Technical Readiness Drill',
    sessionType: 'MOCK_INTERVIEW',
    assignedByRole: 'PROGRAM_ADMIN',
    assignedByName: 'Prof. Hope Administrator',
    assignedByEmail: 'hope@college.edu',
    collegeId: 'col-1',
    targetScope: 'PROGRAM',
    targetProgramName: 'Hope',
    targetDomainOrTrack: 'Hope',
    domainOrTopic: 'Full Stack & Advanced Architecture',
    difficulty: 'ADVANCED',
    customInstructions: 'Strict candidate technical defense on microservices, event streaming, and architectural trade-offs.',
    dueDate: '2026-10-14',
    isMandatory: true,
    createdAt: '2026-09-28',
    submissions: [
      {
        studentId: 'stu-21cs1084',
        studentName: 'Aravind Kumar',
        studentRollNumber: '21CS1084',
        score: 91,
        technicalScore: 92,
        communicationScore: 90,
        fluencyScore: 91,
        department: 'Computer Science & Engineering',
        sessionType: 'MOCK_INTERVIEW',
        submittedAt: '2026-09-29T11:00:00Z',
        status: 'COMPLETED',
        recommendation: 'PLACEMENT_READY'
      },
      {
        studentId: 'stu-21cs1092',
        studentName: 'Pooja Sundaram',
        studentRollNumber: '21CS1092',
        score: 94,
        technicalScore: 95,
        communicationScore: 93,
        fluencyScore: 94,
        department: 'Computer Science & Engineering',
        sessionType: 'MOCK_INTERVIEW',
        submittedAt: '2026-09-29T14:30:00Z',
        status: 'COMPLETED',
        recommendation: 'PLACEMENT_READY'
      }
    ]
  }
];

export const MOCK_MENTEES_LIST = [
  { id: 'm-1', name: 'Aravind Kumar', rollNumber: '21CS1084', email: 'aravind.k@college.edu', department: 'Computer Science & Engineering', className: 'Final Year CSE - Placement Core', batchYear: 2026, track: 'Hope', programName: 'Hope', programId: 'prog-hope', domain: 'Full Stack', score: 82, checklist: '4/5', status: 'ON_TRACK', coins: 5 },
  { id: 'm-2', name: 'Pooja Sundaram', rollNumber: '21CS1092', email: 'pooja.s@college.edu', department: 'Computer Science & Engineering', className: 'Final Year CSE - Placement Core', batchYear: 2026, track: 'Hope', programName: 'Hope', programId: 'prog-hope', domain: 'AI/ML', score: 88, checklist: '5/5', status: 'PLACEMENT_READY', coins: 5 },
  { id: 'm-3', name: 'Karthik Raja', rollNumber: '21CS1015', email: 'karthik.r@college.edu', department: 'Information Technology', className: '2nd Year IT - Section A', batchYear: 2027, track: 'Cloud Computing & DevOps', programName: 'Cloud Computing & DevOps', programId: 'prog-ccdo', domain: 'Cloud & DevOps', score: 71, checklist: '3/5', status: 'NEEDS_ATTENTION', coins: 5 },
  { id: 'm-4', name: 'Deepa Natarajan', rollNumber: '21CS1038', email: 'deepa.n@college.edu', department: 'Information Technology', className: '2nd Year IT - Section A', batchYear: 2027, track: 'DEPARTMENT', domain: 'Cybersecurity', score: 76, checklist: '4/5', status: 'ON_TRACK', coins: 5 },
  { id: 'm-5', name: 'Manoj Kumar V', rollNumber: '21CS1055', email: 'manoj.k@college.edu', department: 'Mechanical Engineering', className: '3rd Year Mechanical - A', batchYear: 2027, track: 'Institutional Engineering Stream', programName: 'Institutional Engineering Stream', programId: 'prog-ies', domain: 'Core Engineering', score: 58, checklist: '2/5', status: 'AT_RISK', coins: 5 },
  { id: 'm-6', name: 'Sanjay Krishnan', rollNumber: '21CS1102', email: 'sanjay.k@college.edu', department: 'Electronics & Communication', className: 'Final Year ECE - Core', batchYear: 2026, track: 'Hope', programName: 'Hope', programId: 'prog-hope', domain: 'Core Systems', score: 74, checklist: '3/5', status: 'ON_TRACK', coins: 5 },
  { id: 'm-7', name: 'Swetha Balan', rollNumber: '21CS1118', email: 'swetha.b@college.edu', department: 'Information Technology', className: '3rd Year IT - Section B', batchYear: 2026, track: 'DEPARTMENT', domain: 'UI/UX Design', score: 79, checklist: '4/5', status: 'ON_TRACK', coins: 5 },
  { id: 'm-8', name: 'Harish R', rollNumber: '21CS1049', email: 'harish.r@college.edu', department: 'Computer Science & Engineering', className: 'Final Year CSE - Placement Core', batchYear: 2026, track: 'DEPARTMENT', domain: 'Software Engineering', score: 64, checklist: '3/5', status: 'NEEDS_ATTENTION', coins: 5 },
  { id: 'm-9', name: 'Divya Bharathi', rollNumber: '21CS1040', email: 'divya.b@college.edu', department: 'Artificial Intelligence & Data Science', className: '3rd Year AIDS - Alpha', batchYear: 2027, track: 'Hope', programName: 'Hope', programId: 'prog-hope', domain: 'Data Engineering', score: 84, checklist: '5/5', status: 'PLACEMENT_READY', coins: 5 },
  { id: 'm-10', name: 'Gowtham S', rollNumber: '21CS1044', email: 'gowtham.s@college.edu', department: 'Electronics & Communication', className: '2nd Year ECE - Section B', batchYear: 2028, track: 'DEPARTMENT', domain: 'Problem Solving', score: 69, checklist: '2/5', status: 'NEEDS_ATTENTION', coins: 5 },
  { id: 'm-11', name: 'Priya Sundaram', rollNumber: '21IT1001', email: 'priya.s@college.edu', department: 'Information Technology', className: '2nd Year IT - Section A', batchYear: 2027, track: 'DEPARTMENT', domain: 'Distributed Systems', score: 83, checklist: '4/5', status: 'PLACEMENT_READY', coins: 5 },
  { id: 'm-12', name: 'Rahul Menon', rollNumber: '21IT1002', email: 'rahul.m@college.edu', department: 'Information Technology', className: '2nd Year IT - Section A', batchYear: 2027, track: 'Cloud Computing & DevOps', domain: 'Microservices', score: 75, checklist: '3/5', status: 'ON_TRACK', coins: 5 }
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

export const MOCK_DYNAMIC_PROGRAMS: DynamicProgram[] = [
  {
    id: 'prog-hope',
    collegeId: 'col-1',
    name: 'Hope',
    code: 'HOPE',
    description: 'High-potential Opportunistic Placement & Employability acceleration program for top campus candidates.',
    assignedAdminEmail: 'hope@college.edu',
    assignedAdminName: 'Prof. Hope Administrator',
    hasSubPrograms: false,
    adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_ASSIGN_LISTENING', 'CAN_MANAGE_STUDENTS'],
    createdAt: '2026-02-15'
  },
  {
    id: 'prog-ccdo',
    collegeId: 'col-1',
    name: 'Cloud Computing & DevOps',
    code: 'CCDO',
    description: 'Full Stack Cloud Architecture, Microservices, and Infrastructure as Code readiness track.',
    assignedAdminEmail: 'admin.cloud@college.edu',
    assignedAdminName: 'Prof. S. Ranganathan',
    hasSubPrograms: true,
    subPrograms: ['Microservices Architecture', 'Kubernetes & CI/CD'],
    adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_ASSIGN_LISTENING', 'CAN_MANAGE_STUDENTS'],
    createdAt: '2026-01-20'
  },
  {
    id: 'prog-ies',
    collegeId: 'col-1',
    name: 'Institutional Engineering Stream',
    code: 'IES',
    description: 'Core Systems, Embedded Systems, Network Security & Zero-Trust Architecture track.',
    assignedAdminEmail: 'admin.ies@college.edu',
    assignedAdminName: 'Dr. V. Ramanathan',
    hasSubPrograms: false,
    adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_ASSIGN_LISTENING'],
    createdAt: '2026-02-10'
  }
];

export const ADMIN_PERMISSION_LABELS: Record<string, { label: string; desc: string }> = {
  'CAN_VIEW_STUDENT_PROGRESS': {
    label: 'View Students’ Progress',
    desc: 'Access live performance reports, speaking speed (WPM), and filler word analytics.'
  },
  'CAN_ASSIGN_INTERVIEWS': {
    label: 'Assign Mock Technical Interviews',
    desc: 'Schedule and assign AI mock interview practice sessions with deadlines for students.'
  },
  'CAN_ASSIGN_LISTENING': {
    label: 'Assign Listening Labs',
    desc: 'Assign audio listening comprehension practice sessions to students.'
  },
  'CAN_MANAGE_STUDENTS': {
    label: 'Manage Students & Program Assignment',
    desc: 'Enroll students, assign tracks/programs, and verify placement checklist.'
  }
};

export const MOCK_DEPARTMENT_CLASSES: any[] = [
  {
    id: 'cls-it-2a',
    name: '2nd Year IT - Section A',
    department: 'Information Technology',
    batchYear: 2027,
    semester: 'Semester 4',
    facultyInCharge: 'Dr. B. Vijayalakshmi',
    enrolledStudentCount: 42,
    createdAt: '2026-02-01'
  },
  {
    id: 'cls-it-3b',
    name: '3rd Year IT - Section B',
    department: 'Information Technology',
    batchYear: 2026,
    semester: 'Semester 6',
    facultyInCharge: 'Prof. K. Venkatesh',
    enrolledStudentCount: 38,
    createdAt: '2026-02-05'
  },
  {
    id: 'cls-cse-final',
    name: 'Final Year CSE - Placement Core',
    department: 'Computer Science & Engineering',
    batchYear: 2026,
    semester: 'Semester 8',
    facultyInCharge: 'Dr. A. Murugan',
    enrolledStudentCount: 56,
    createdAt: '2026-01-20'
  }
];

export const MOCK_DEPARTMENT_STAFF: any[] = [
  {
    id: 'staff-it-01',
    name: 'Dr. B. Vijayalakshmi',
    email: 'counselor.it@college.edu',
    designation: 'Associate Professor & Class Counselor',
    staffId: 'IT-FAC-001',
    department: 'Information Technology',
    collegeId: 'col-1',
    status: 'ACTIVE',
    activationToken: 'act_token_it_01',
    assignedClasses: ['2nd Year IT - Section A'],
    createdAt: '2026-01-15'
  },
  {
    id: 'staff-it-02',
    name: 'Prof. K. Venkatesh',
    email: 'venkatesh.k@college.edu',
    designation: 'Senior Assistant Professor',
    staffId: 'IT-FAC-002',
    department: 'Information Technology',
    collegeId: 'col-1',
    status: 'ACTIVE',
    activationToken: 'act_token_it_02',
    assignedClasses: ['3rd Year IT - Section B'],
    createdAt: '2026-01-20'
  },
  {
    id: 'staff-it-03',
    name: 'Dr. S. Ranganathan',
    email: 'ranganathan.s@college.edu',
    designation: 'Professor & Research Mentor',
    staffId: 'IT-FAC-003',
    department: 'Information Technology',
    collegeId: 'col-1',
    status: 'ACTIVE',
    activationToken: 'act_token_it_03',
    assignedClasses: [],
    createdAt: '2026-02-01'
  },
  {
    id: 'staff-it-04',
    name: 'Dr. Ananya Sharma',
    email: 'ananya.sharma@college.edu',
    designation: 'Assistant Professor',
    staffId: 'IT-FAC-004',
    department: 'Information Technology',
    collegeId: 'col-1',
    status: 'ACTIVE',
    activationToken: 'act_token_it_04',
    assignedClasses: [],
    createdAt: '2026-03-01'
  },
  {
    id: 'staff-cse-01',
    name: 'Dr. A. Murugan',
    email: 'admin.cse@college.edu',
    designation: 'Professor & Class Counselor',
    staffId: 'CSE-FAC-001',
    department: 'Computer Science & Engineering',
    collegeId: 'col-1',
    status: 'ACTIVE',
    activationToken: 'act_token_cse_01',
    assignedClasses: ['Final Year CSE - Placement Core'],
    createdAt: '2026-01-10'
  },
  {
    id: 'staff-cse-02',
    name: 'Dr. Kavitha Raman',
    email: 'kavitha.r@college.edu',
    designation: 'Associate Professor',
    staffId: 'CSE-FAC-002',
    department: 'Computer Science & Engineering',
    collegeId: 'col-1',
    status: 'ACTIVE',
    activationToken: 'act_token_cse_02',
    assignedClasses: [],
    createdAt: '2026-02-15'
  }
];

