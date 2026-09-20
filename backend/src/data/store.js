// In-Memory Database Store for College Placement Platform
const PEP_DOMAINS = [
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

let studentProfile = {
  id: 'stu-21cs1084',
  name: 'Aravind Kumar',
  rollNumber: '21CS1084',
  email: 'aravind.k21@college.edu',
  department: 'Computer Science and Engineering',
  batchYear: 2026,
  track: 'HOPE_ELITE',
  pepDomain: 'Full Stack Development',
  mentorName: 'Dr. S. Ranganathan',
  mentorEmail: 'ranganathan.s@college.edu',
  codingHandles: {
    github: 'aravindkumar',
    leetcode: 'aravind_k',
    leetcodeSolved: 248,
    githubRepos: 18
  },
  resume: {
    fileName: 'Aravind_Kumar_Backend_Resume.pdf',
    parsedAt: '2026-09-18',
    summary: 'Distributed systems and backend engineer focused on high-throughput microservices.',
    skills: {
      languages: ['Java', 'TypeScript', 'SQL'],
      frameworks: ['Spring Boot', 'React', 'Kafka', 'Redis'],
      databases: ['PostgreSQL', 'MongoDB'],
      tools: ['Docker', 'Git', 'Kubernetes']
    },
    projects: [
      {
        title: 'Distributed Order Settlement Gateway',
        techStack: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL', 'Redis'],
        description: 'High-throughput event-driven pipeline handling 1,500 req/sec with Apache Kafka and Spring Boot idempotency guards.'
      }
    ]
  },
  criteriaTasks: [
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
    }
  ]
};

let activeSessions = {};
let latestReport = {
  id: 'rep-init-01',
  date: '2026-09-19',
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
    { skill: 'Database Indexing & PostgreSQL', score: 62, status: 'MODERATE', recommendation: 'Review composite B-Tree index column order.' },
    { skill: 'System Design & Trade-offs', score: 48, status: 'NEEDS_WORK', recommendation: 'Practice CAP theorem trade-offs and caching strategies.' }
  ],
  actionableNextSteps: [
    'Take a 2-second breath before answering rather than saying "um".',
    'Target a steady conversational 130–145 WPM (current 118 WPM).',
    'Study B-Tree composite indexing in PostgreSQL.'
  ],
  tabSwitches: 1,
  isFlagged: false
};

const menteesList = [
  { id: 'm-1', name: 'Aravind Kumar', rollNumber: '21CS1084', track: 'HOPE_ELITE', domain: 'Full Stack', score: 82, checklist: '4/5', status: 'ON_TRACK' },
  { id: 'm-2', name: 'Pooja Sundaram', rollNumber: '21CS1092', track: 'HOPE_ELITE', domain: 'AI/ML', score: 88, checklist: '5/5', status: 'PLACEMENT_READY' },
  { id: 'm-3', name: 'Karthik Raja', rollNumber: '21CS1015', track: 'PEP', domain: 'Cloud Computing & DevOps', score: 71, checklist: '3/5', status: 'NEEDS_ATTENTION' },
  { id: 'm-4', name: 'Deepa Natarajan', rollNumber: '21CS1038', track: 'PEP', domain: 'Cybersecurity', score: 76, checklist: '4/5', status: 'ON_TRACK' },
  { id: 'm-5', name: 'Manoj Kumar V', rollNumber: '21CS1055', track: 'DEPARTMENT', domain: 'General Tech', score: 58, checklist: '2/5', status: 'AT_RISK' }
];

module.exports = {
  PEP_DOMAINS,
  studentProfile,
  activeSessions,
  latestReport,
  menteesList
};
