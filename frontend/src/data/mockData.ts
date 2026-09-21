import { StudentProfile, CriteriaTask, TrainerTenure, InterviewAssignment, QuestionTurn } from '../types';

export const PEP_DOMAINS = [
  'Full Stack Development',
  'Cloud Computing & DevOps',
  'Cybersecurity & Ethical Hacking',
  'AI & Machine Learning',
  'Data Engineering & Big Data',
  'Mobile Application Development',
  'Embedded Systems & Firmware',
  'Internet of Things (IoT)',
  'Blockchain & Web3',
  'UI/UX & Product Design',
  'VLSI & Hardware Design',
  'Robotics & Automation',
  'Game Development (Unity/Unreal)',
  'Network Engineering & 5G',
  'Software Quality Assurance & Automation',
  'Site Reliability Engineering (SRE)',
  'FinTech & Quantitative Engineering',
  'AR/VR & Spatial Computing',
  'Natural Language Processing (NLP)',
  'Computer Vision & Graphics',
  'Enterprise Java Systems'
];

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
    description: 'AWS Cloud Practitioner / Azure Fundamentals or Domain Equivalent.',
    targetTrack: 'PEP',
    isCompleted: false,
    verifiedByMentor: false
  },
  {
    id: 'crit-5',
    title: 'Internal Hackathon / Project Milestone',
    description: 'Deploy full-stack project with live URL and GitHub documentation.',
    targetTrack: 'HOPE',
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
  track: 'HOPE_ELITE',
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
  track: 'HOPE_ELITE',
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

export const LISTENING_PASSAGE = {
  title: 'Client System Requirements: Real-Time Payment Settlement Gateway',
  durationSeconds: 65,
  narrativeText: `The client, FinPay Systems, requires a resilient settlement engine processing domestic merchant transactions. 
Each transaction payload contains a merchant identifier, timestamp in UTC, and an idempotent transaction reference. 
The system must guarantee a maximum end-to-end latency of 250 milliseconds with ninety-nine point nine nine percent availability. 
In the event of a banking network partition, the settlement ledger must reject incoming charge requests with error code 503 rather than queuing indefinite retries. 
All transaction state events must be audited in an immutable append-only ledger before issuing confirmation webhooks to merchants.`,
  questions: [
    {
      id: 'lq-1',
      questionText: 'What is the maximum end-to-end latency specified by FinPay Systems for merchant transactions?',
      expectedAnswer: '250 milliseconds'
    },
    {
      id: 'lq-2',
      questionText: 'What should the settlement engine do if a banking network partition occurs?',
      expectedAnswer: 'Reject incoming charge requests with error code 503 instead of queuing indefinite retries.'
    },
    {
      id: 'lq-3',
      questionText: 'What must happen before confirmation webhooks are dispatched to merchants?',
      expectedAnswer: 'All transaction state events must be audited into an immutable append-only ledger.'
    }
  ]
};

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
    isActive: false // Expired/Revoked
  }
];

export const MOCK_ASSIGNMENTS: InterviewAssignment[] = [
  {
    id: 'asg-1',
    title: 'University-Wide Pre-Placement Mock Drill #2',
    assignedByRole: 'PLACEMENT_COORDINATOR',
    assignedByName: 'Prof. K. Venkatesh (Placement Officer)',
    targetDomainOrTrack: 'All Batches (2026)',
    dueDate: '2026-09-25',
    isMandatory: true
  },
  {
    id: 'asg-2',
    title: 'HOPE Elite Concurrency & Distributed Systems Mock',
    assignedByRole: 'PROGRAM_ADMIN',
    assignedByName: 'Dr. Ananya Roy (HOPE Elite Lead)',
    targetDomainOrTrack: 'HOPE Elite',
    dueDate: '2026-09-22',
    isMandatory: true
  },
  {
    id: 'asg-3',
    title: 'Cloud Domain Weekend Architecture Drill',
    assignedByRole: 'TRAINER',
    assignedByName: 'Vikramaditya Sharma (Visiting Trainer)',
    targetDomainOrTrack: 'Cloud Computing & DevOps',
    dueDate: '2026-09-21',
    isMandatory: false
  }
];

export const MOCK_MENTEES_LIST = [
  { id: 'm-1', name: 'Aravind Kumar', rollNumber: '21CS1084', track: 'HOPE_ELITE', domain: 'Full Stack', score: 82, checklist: '4/5', status: 'ON_TRACK' },
  { id: 'm-2', name: 'Pooja Sundaram', rollNumber: '21CS1092', track: 'HOPE_ELITE', domain: 'AI/ML', score: 88, checklist: '5/5', status: 'PLACEMENT_READY' },
  { id: 'm-3', name: 'Karthik Raja', rollNumber: '21CS1015', track: 'PEP', domain: 'Cloud Computing & DevOps', score: 71, checklist: '3/5', status: 'NEEDS_ATTENTION' },
  { id: 'm-4', name: 'Deepa Natarajan', rollNumber: '21CS1038', track: 'PEP', domain: 'Cybersecurity', score: 76, checklist: '4/5', status: 'ON_TRACK' },
  { id: 'm-5', name: 'Manoj Kumar V', rollNumber: '21CS1055', track: 'DEPARTMENT', domain: 'General Tech', score: 58, checklist: '2/5', status: 'AT_RISK' },
  { id: 'm-6', name: 'Sanjay Krishnan', rollNumber: '21CS1102', track: 'HOPE_NON_ELITE', domain: 'Core Java', score: 74, checklist: '3/5', status: 'ON_TRACK' },
  { id: 'm-7', name: 'Swetha Balan', rollNumber: '21CS1118', track: 'PEP', domain: 'UI/UX & Product Design', score: 79, checklist: '4/5', status: 'ON_TRACK' },
  { id: 'm-8', name: 'Harish R', rollNumber: '21CS1049', track: 'DEPARTMENT', domain: 'General Tech', score: 64, checklist: '3/5', status: 'NEEDS_ATTENTION' },
  { id: 'm-9', name: 'Divya Bharathi', rollNumber: '21CS1040', track: 'PEP', domain: 'Data Engineering', score: 84, checklist: '5/5', status: 'PLACEMENT_READY' },
  { id: 'm-10', name: 'Gowtham S', rollNumber: '21CS1044', track: 'HOPE_NON_ELITE', domain: 'Problem Solving', score: 69, checklist: '2/5', status: 'NEEDS_ATTENTION' }
];
