import { 
  StudentProfile, 
  DiagnosticReport, 
  TrainerTenure, 
  InterviewAssignment, 
  AssignmentSubmission, 
  QuestionTurn, 
  ParsedResume,
  CodingHandles,
  College,
  DynamicProgram,
  DynamicDepartment,
  PendingInvite,
  AdminPermission,
  AuthUser
} from '../types';
import { 
  DEFAULT_CLEAN_STUDENT,
  INITIAL_STUDENT_PROFILE, 
  MOCK_INTERVIEW_QUESTIONS, 
  MOCK_TRAINER_TENURES, 
  MOCK_ASSIGNMENTS, 
  MOCK_MENTEES_LIST,
  LISTENING_PASSAGES,
  MOCK_COLLEGES,
  MOCK_DYNAMIC_DEPARTMENTS,
  MOCK_DYNAMIC_PROGRAMS
} from '../data/mockData';

function extractPrimarySkillsAndDomain(student: StudentProfile): {
  primaryLanguage: string;
  secondaryTech: string[];
  primaryProject: string;
  domainName: string;
} {
  const resume = student.resume;
  let primaryLanguage = 'Java';
  let secondaryTech = ['PostgreSQL', 'Docker', 'RESTful APIs'];
  let primaryProject = 'Distributed Services Architecture';
  let domainName = student.subProgramName || student.programName || student.specialization || student.department || 'Technical Architecture';

  if (resume?.skills?.languages && resume.skills.languages.length > 0) {
    primaryLanguage = resume.skills.languages[0];
    secondaryTech = [
      ...(resume.skills.frameworks || []),
      ...(resume.skills.databases || []),
      ...(resume.skills.tools || [])
    ].slice(0, 4);
  } else if (domainName.toLowerCase().includes('ai') || domainName.toLowerCase().includes('data')) {
    primaryLanguage = 'Python';
    secondaryTech = ['PyTorch', 'TensorFlow', 'FastAPI', 'Pandas'];
  } else if (domainName.toLowerCase().includes('cyber') || domainName.toLowerCase().includes('security')) {
    primaryLanguage = 'Python / Bash';
    secondaryTech = ['Wireshark', 'Metasploit', 'Cryptography', 'IAM'];
  } else if (domainName.toLowerCase().includes('cloud') || domainName.toLowerCase().includes('devops')) {
    primaryLanguage = 'Go / YAML';
    secondaryTech = ['Kubernetes', 'Terraform', 'AWS', 'Docker'];
  }

  if (resume?.projects && resume.projects.length > 0) {
    primaryProject = resume.projects[0].title;
  }

  return { primaryLanguage, secondaryTech, primaryProject, domainName };
}

function generateDynamicQuestions(student: StudentProfile): QuestionTurn[] {
  const { primaryLanguage, secondaryTech, primaryProject, domainName } = extractPrimarySkillsAndDomain(student);
  const techList = secondaryTech.length > 0 ? secondaryTech.join(', ') : 'modern design patterns';

  return [
    {
      id: `q_1_${Date.now()}`,
      questionNumber: 1,
      questionText: `Walk me through the architecture of your project "${primaryProject}". Specifically, how did you structure the components using ${primaryLanguage} and ${techList}, and what was the main engineering challenge you solved?`,
      difficulty: 'EASY',
      category: 'System Architecture & Core Principles'
    },
    {
      id: `q_2_${Date.now() + 1}`,
      questionNumber: 2,
      questionText: `In the context of ${domainName}, suppose query traffic or concurrent requests spike by 10x. How would you diagnose performance bottlenecks, optimize database query execution, and implement caching or asynchronous processing?`,
      difficulty: 'MEDIUM',
      category: 'Concurrency & Scalability'
    },
    {
      id: `q_3_${Date.now() + 2}`,
      questionNumber: 3,
      questionText: `What happens when network partitions or downstream microservice failures occur in your architecture? Explain how you maintain data consistency, handle error propagation, and implement resilient fallback mechanisms.`,
      difficulty: 'ADVANCED',
      category: 'Resilience & Distributed Trade-offs'
    }
  ];
}

function analyzeSpokenSpeech(text: string, durationSeconds = 18): {
  wordCount: number;
  wpm: number;
  fillers: Record<string, number>;
  totalFillers: number;
  detectedTechTerms: string[];
} {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const effectiveDuration = Math.max(durationSeconds, 6);
  const wpm = Math.max(70, Math.min(210, Math.round((wordCount / effectiveDuration) * 60)));

  const lower = text.toLowerCase();
  const commonFillers = ['uh', 'um', 'like', 'basically', 'actually', 'you know', 'sort of', 'kind of', 'i mean', 'right'];
  const fillers: Record<string, number> = {};
  let totalFillers = 0;

  for (const f of commonFillers) {
    const regex = new RegExp(`\\b${f}\\b`, 'g');
    const matches = lower.match(regex);
    if (matches && matches.length > 0) {
      fillers[f] = matches.length;
      totalFillers += matches.length;
    }
  }

  const technicalKeywords = [
    'latency', 'throughput', 'concurrency', 'asynchronous', 'cache', 'caching',
    'redis', 'database', 'index', 'indexing', 'kafka', 'partition', 'microservice',
    'cluster', 'docker', 'kubernetes', 'scale', 'scaling', 'load balancer', 'algorithm',
    'architecture', 'tradeoff', 'idempotent', 'resilient', 'failover', 'pipeline',
    'encryption', 'thread', 'memory', 'query', 'payload', 'schema', 'transaction',
    'connection pool', 'distributed', 'event-driven', 'rest', 'api', 'state', 'grpc'
  ];

  const detectedTechTerms = technicalKeywords.filter(k => lower.includes(k));

  return { wordCount, wpm, fillers, totalFillers, detectedTechTerms };
}

function evaluateDynamicAnswer(
  question: QuestionTurn,
  studentAnswer: string,
  turnIndex: number,
  durationSeconds: number,
  student: StudentProfile
): {
  technicalScore: number;
  communicationScore: number;
  wpm: number;
  fillerWords: number;
  fillers: Record<string, number>;
  feedback: string;
  strengths: string;
  weaknesses: string;
  nextQuestionText?: string;
} {
  const { wordCount, wpm, fillers, totalFillers, detectedTechTerms } = analyzeSpokenSpeech(studentAnswer, durationSeconds);

  let technicalScore = 70;
  technicalScore += Math.min(18, detectedTechTerms.length * 4);
  if (wordCount >= 25) technicalScore += 4;
  if (wordCount >= 50) technicalScore += 4;
  if (wordCount < 15) technicalScore -= 10;
  technicalScore = Math.max(62, Math.min(96, technicalScore));

  let communicationScore = 86;
  if (wpm >= 120 && wpm <= 150) {
    communicationScore += 5;
  } else if (wpm < 110) {
    communicationScore -= 8;
  } else if (wpm > 160) {
    communicationScore -= 7;
  }
  communicationScore -= Math.min(18, totalFillers * 3);
  if (/\b(because|specifically|furthermore|in order to|therefore|for instance)\b/i.test(studentAnswer)) {
    communicationScore += 4;
  }
  communicationScore = Math.max(55, Math.min(96, communicationScore));

  const paceVerdict = wpm < 110 ? 'hesitant (<110 WPM)' : wpm > 155 ? 'rapid (>155 WPM)' : 'optimal (120–150 WPM)';
  const feedback = `Articulated at ${wpm} WPM (${paceVerdict}). Detected ${totalFillers} filler words. Technical concepts identified: ${
    detectedTechTerms.length > 0 ? detectedTechTerms.slice(0, 3).join(', ') : 'general conceptual flow'
  }.`;

  const strengths = detectedTechTerms.length > 0
    ? `Strong technical command highlighting ${detectedTechTerms.slice(0, 2).join(' and ')}.`
    : `Good conversational clarity and confident delivery tone.`;

  const topFiller = Object.keys(fillers).sort((a, b) => (fillers[b] || 0) - (fillers[a] || 0))[0];
  const weaknesses = totalFillers > 2
    ? `Watch frequency of verbal crutch "${topFiller}". Replace with deliberate 1-second silence.`
    : wpm < 110
    ? `Pace is slightly measured; practice continuous technical momentum.`
    : `Provide specific quantitative trade-offs (e.g. latency impact in milliseconds).`;

  let nextQuestionText: string | undefined = undefined;
  if (turnIndex === 0) {
    const term = detectedTechTerms[0] || 'your core services';
    nextQuestionText = `You mentioned how you implemented ${term}. In a high-traffic production scenario, how would you optimize data access and prevent latency degradation?`;
  } else if (turnIndex === 1) {
    const term = detectedTechTerms[0] || 'the primary subsystem';
    nextQuestionText = `Considering ${term}, what happens if network partitions occur or dependent downstream services time out? How do you ensure high availability and idempotency?`;
  }

  return {
    technicalScore,
    communicationScore,
    wpm,
    fillerWords: totalFillers,
    fillers,
    feedback,
    strengths,
    weaknesses,
    nextQuestionText
  };
}

function synthesizeDynamicReport(
  sessionType: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION',
  turns: QuestionTurn[],
  student: StudentProfile,
  tabSwitches: number
): DiagnosticReport {
  const turnCount = Math.max(1, turns.length);
  const avgTech = Math.round(turns.reduce((acc, t) => acc + (t.technicalScore || 80), 0) / turnCount);
  const avgComm = Math.round(turns.reduce((acc, t) => acc + (t.communicationScore || 78), 0) / turnCount);
  const overallScore = Math.round(avgTech * 0.70 + avgComm * 0.30);
  const avgWpm = Math.round(turns.reduce((acc, t) => acc + (t.wpm || 125), 0) / turnCount);

  const fillerWordBreakdown: Record<string, number> = {};
  let totalFillers = 0;
  turns.forEach(t => {
    totalFillers += (t.fillerWords || 0);
  });
  if (totalFillers === 0) {
    fillerWordBreakdown['uh'] = 1;
    totalFillers = 1;
  } else {
    fillerWordBreakdown['uh'] = Math.max(1, Math.round(totalFillers * 0.4));
    fillerWordBreakdown['like'] = Math.max(1, Math.round(totalFillers * 0.3));
    if (totalFillers > 2) fillerWordBreakdown['actually'] = Math.round(totalFillers * 0.3);
  }

  const { primaryLanguage, domainName } = extractPrimarySkillsAndDomain(student);
  const skillBreakdown = [
    {
      skill: `${primaryLanguage} & Architectural Mastery`,
      score: avgTech,
      status: (avgTech >= 85 ? 'STRONG' : avgTech >= 75 ? 'MODERATE' : 'NEEDS_WORK') as 'STRONG' | 'MODERATE' | 'NEEDS_WORK',
      recommendation: `Demonstrates solid command over ${primaryLanguage} core concurrency and structure.`
    },
    {
      skill: `${domainName} Scalability`,
      score: Math.min(95, Math.max(65, avgTech + (Math.random() > 0.5 ? 3 : -4))),
      status: (avgTech >= 80 ? 'STRONG' : 'MODERATE') as 'STRONG' | 'MODERATE' | 'NEEDS_WORK',
      recommendation: `Good awareness of horizontal scaling patterns and database indexing.`
    },
    {
      skill: 'Verbal Delivery & Pacing Cadence',
      score: avgComm,
      status: (avgComm >= 85 ? 'STRONG' : avgComm >= 75 ? 'MODERATE' : 'NEEDS_WORK') as 'STRONG' | 'MODERATE' | 'NEEDS_WORK',
      recommendation: avgWpm >= 120 && avgWpm <= 150
        ? `Speaking pace of ${avgWpm} WPM is within the optimal recruiter hiring zone (120–150 WPM).`
        : `Pace (${avgWpm} WPM) requires modulation to maintain recruiter engagement.`
    },
    {
      skill: 'Distributed Resiliency & Failure Recovery',
      score: Math.max(60, avgTech - 5),
      status: (avgTech >= 82 ? 'STRONG' : 'NEEDS_WORK') as 'STRONG' | 'MODERATE' | 'NEEDS_WORK',
      recommendation: 'Review CAP theorem trade-offs and circuit breaker fallback strategies.'
    }
  ];

  const actionableNextSteps: string[] = [];
  if (avgWpm < 115) {
    actionableNextSteps.push(`Increase spoken momentum: Your pace of ${avgWpm} WPM is slightly slow. Aim for 120–150 WPM.`);
  } else if (avgWpm > 155) {
    actionableNextSteps.push(`Pace down your delivery: Speaking at ${avgWpm} WPM can overwhelm interviewers. Use intentional pauses.`);
  } else {
    actionableNextSteps.push(`Maintain your cadence! Your speaking rate of ${avgWpm} WPM is right in the recruiter target band.`);
  }

  if (totalFillers > 3) {
    actionableNextSteps.push(`Reduce vocal fillers: Detected ${totalFillers} filler words. Practice replacing filler words with 1-second silence.`);
  } else {
    actionableNextSteps.push(`Great verbal economy: Very low filler word frequency recorded throughout the interview.`);
  }

  actionableNextSteps.push(`Deepen domain answers for ${domainName} with concrete metrics (e.g. latency reduced by 40ms, 99.9% uptime).`);

  return {
    id: `rep_${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().split('T')[0],
    sessionType,
    overallScore,
    technicalScore: avgTech,
    communicationScore: avgComm,
    averageWpm: avgWpm,
    totalFillerWords: totalFillers,
    fillerWordBreakdown,
    skillBreakdown,
    actionableNextSteps,
    tabSwitches,
    isFlagged: tabSwitches >= 4
  };
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private getStorage<T>(key: string, defaultVal: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private setStorage<T>(key: string, val: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn(`localStorage save error for ${key}:`, e);
    }
  }

  owner = {
    getColleges: async (): Promise<College[]> => {
      return this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
    },

    createCollege: async (data: { name: string; code: string; campusCity: string }): Promise<College> => {
      const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
      const newCollege: College = {
        id: `col-${Date.now()}`,
        name: data.name,
        code: data.code.toUpperCase(),
        campusCity: data.campusCity,
        createdAt: new Date().toISOString(),
        superAdminStatus: 'PENDING_INVITE'
      };
      colleges.push(newCollege);
      this.setStorage('platform_colleges', colleges);

      // Create default foundational departments for this college
      const depts = this.getStorage<DynamicDepartment[]>('platform_departments', MOCK_DYNAMIC_DEPARTMENTS);
      const initialDepts: DynamicDepartment[] = [
        { id: `dept_${Date.now()}_1`, collegeId: newCollege.id, name: 'Computer Science & Engineering', code: 'CSE', adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_MANAGE_STUDENTS'] },
        { id: `dept_${Date.now()}_2`, collegeId: newCollege.id, name: 'Information Technology', code: 'IT', adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_MANAGE_STUDENTS'] },
        { id: `dept_${Date.now()}_3`, collegeId: newCollege.id, name: 'Electronics & Communication', code: 'ECE', adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS'] }
      ];
      this.setStorage('platform_departments', [...depts, ...initialDepts]);

      return newCollege;
    },

    inviteSuperAdmin: async (collegeId: string, data: { firstName: string; lastName: string; email: string }): Promise<{ invite: PendingInvite; inviteUrl: string }> => {
      const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
      const college = colleges.find(c => c.id === collegeId) || colleges[0];
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      const token = `inv_sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const invite: PendingInvite = {
        token,
        email: data.email.toLowerCase().trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        name: fullName,
        role: 'SUPER_ADMIN',
        collegeId: college.id,
        collegeName: college.name,
        permissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_ASSIGN_LISTENING', 'CAN_ASSIGN_TRAINERS', 'CAN_MANAGE_STUDENTS', 'CAN_ASSIGN_SUB_ADMINS'],
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      };

      const invites = this.getStorage<PendingInvite[]>('platform_pending_invites', []);
      invites.push(invite);
      this.setStorage('platform_pending_invites', invites);

      const colIdx = colleges.findIndex(c => c.id === collegeId);
      if (colIdx !== -1) {
        colleges[colIdx].superAdminEmail = data.email.toLowerCase().trim();
        colleges[colIdx].superAdminName = fullName;
        colleges[colIdx].superAdminStatus = 'PENDING_INVITE';
        this.setStorage('platform_colleges', colleges);
      }

      const inviteUrl = `${window.location.origin}/?invite_token=${token}`;
      return { invite, inviteUrl };
    },

    getStats: async () => {
      const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const programs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      const activeSuperAdmins = colleges.filter(c => c.superAdminStatus === 'ACTIVE').length;

      return {
        totalColleges: colleges.length,
        activeSuperAdmins: activeSuperAdmins || 2,
        totalStudents: students.length || 240,
        totalPrograms: programs.length || 3
      };
    }
  };

  college = {
    getDetails: async (collegeId = 'col-1'): Promise<College> => {
      const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
      return colleges.find(c => c.id === collegeId) || colleges[0];
    },

    getDepartments: async (collegeId = 'col-1'): Promise<DynamicDepartment[]> => {
      const depts = this.getStorage<DynamicDepartment[]>('platform_departments', MOCK_DYNAMIC_DEPARTMENTS);
      return depts.filter(d => d.collegeId === collegeId);
    },

    createDepartment: async (collegeId: string, data: { name: string; code: string; assignedAdminEmail?: string; assignedAdminName?: string; adminPermissions?: AdminPermission[] }): Promise<DynamicDepartment> => {
      const depts = this.getStorage<DynamicDepartment[]>('platform_departments', MOCK_DYNAMIC_DEPARTMENTS);
      const newDept: DynamicDepartment = {
        id: `dept_${Date.now()}`,
        collegeId,
        name: data.name,
        code: data.code.toUpperCase(),
        assignedAdminEmail: data.assignedAdminEmail,
        assignedAdminName: data.assignedAdminName,
        adminPermissions: data.adminPermissions || ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_MANAGE_STUDENTS']
      };
      depts.push(newDept);
      this.setStorage('platform_departments', depts);
      return newDept;
    },

    getPrograms: async (collegeId = 'col-1'): Promise<DynamicProgram[]> => {
      const progs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      return progs.filter(p => p.collegeId === collegeId);
    },

    createProgram: async (collegeId: string, data: Omit<DynamicProgram, 'id' | 'createdAt'>): Promise<DynamicProgram> => {
      const progs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      const newProg: DynamicProgram = {
        id: `prog_${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString()
      };
      progs.push(newProg);
      this.setStorage('platform_dynamic_programs', progs);
      return newProg;
    },

    updateProgram: async (collegeId: string, progId: string, updates: Partial<DynamicProgram>, verificationCode: string): Promise<DynamicProgram> => {
      const progs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      const idx = progs.findIndex(p => p.id === progId);
      if (idx === -1) throw new Error('Program not found.');
      const current = progs[idx];
      
      const validCode = current.name.trim().toLowerCase();
      const userCode = verificationCode.trim().toLowerCase();
      if (userCode !== validCode && userCode !== 'confirm_modify' && userCode !== current.code.trim().toLowerCase()) {
        throw new Error(`Safeguard Verification Failed: You must enter "${current.name}" or "CONFIRM_MODIFY" to update this live training program.`);
      }

      const updated = { ...current, ...updates };
      progs[idx] = updated;
      this.setStorage('platform_dynamic_programs', progs);
      return updated;
    },

    deleteProgram: async (collegeId: string, progId: string, verificationCode: string): Promise<{ success: boolean }> => {
      const progs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      const target = progs.find(p => p.id === progId);
      if (!target) throw new Error('Program not found.');

      const validCode = target.name.trim().toLowerCase();
      const userCode = verificationCode.trim().toLowerCase();
      if (userCode !== validCode && userCode !== 'confirm_modify' && userCode !== target.code.trim().toLowerCase()) {
        throw new Error(`Safeguard Verification Failed: You must enter "${target.name}" or "CONFIRM_MODIFY" to delete this live training program.`);
      }

      const filtered = progs.filter(p => p.id !== progId);
      this.setStorage('platform_dynamic_programs', filtered);
      return { success: true };
    },

    inviteProgramAdmin: async (collegeId: string, data: { firstName: string; lastName: string; email: string; programId?: string; department?: string; permissions: AdminPermission[]; canAssignAdminsToPrograms?: string[] }): Promise<{ invite: PendingInvite; inviteUrl: string }> => {
      const token = `inv_pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
      const college = colleges.find(c => c.id === collegeId) || colleges[0];

      const invite: PendingInvite = {
        token,
        email: data.email.toLowerCase().trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        name: fullName,
        role: 'PROGRAM_ADMIN',
        collegeId: college.id,
        collegeName: college.name,
        programId: data.programId,
        department: data.department,
        permissions: data.permissions,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      };

      const invites = this.getStorage<PendingInvite[]>('platform_pending_invites', []);
      invites.push(invite);
      this.setStorage('platform_pending_invites', invites);

      if (data.programId) {
        const progs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
        const pIdx = progs.findIndex(p => p.id === data.programId);
        if (pIdx !== -1) {
          progs[pIdx].assignedAdminEmail = data.email.toLowerCase().trim();
          progs[pIdx].assignedAdminName = fullName;
          progs[pIdx].adminPermissions = data.permissions;
          progs[pIdx].canAssignAdminsToPrograms = data.canAssignAdminsToPrograms;
          this.setStorage('platform_dynamic_programs', progs);
        }
      }

      const admins = this.getStorage<any[]>('admin_program_admins', []);
      admins.push({
        id: `pa_${Date.now()}`,
        name: fullName,
        email: data.email.toLowerCase().trim(),
        role: 'PROGRAM_ADMIN',
        collegeId,
        programId: data.programId,
        department: data.department,
        permissions: data.permissions,
        status: 'INVITED',
        createdAt: new Date().toISOString().split('T')[0]
      });
      this.setStorage('admin_program_admins', admins);

      const inviteUrl = `${window.location.origin}/?invite_token=${token}`;
      return { invite, inviteUrl };
    },

    bulkUploadProgramAdmins: async (collegeId: string, csvContent: string): Promise<{ created: number; errors: string[] }> => {
      const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let created = 0;
      const errors: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (i === 0 && lines[i].toLowerCase().includes('email')) continue;
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length < 2) continue;
        const [name, email, targetEntity] = parts;
        if (!email.includes('@')) {
          errors.push(`Row ${i + 1}: Invalid email address ${email}`);
          continue;
        }

        const nameParts = name.split(' ');
        const firstName = nameParts[0] || 'Admin';
        const lastName = nameParts.slice(1).join(' ') || '';

        await this.college.inviteProgramAdmin(collegeId, {
          firstName,
          lastName,
          email,
          department: targetEntity,
          permissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_MANAGE_STUDENTS']
        });
        created++;
      }

      return { created, errors };
    }
  };

  invites = {
    getAll: async (): Promise<PendingInvite[]> => {
      return this.getStorage<PendingInvite[]>('platform_pending_invites', []);
    },

    getByToken: async (token: string): Promise<PendingInvite | null> => {
      const invites = this.getStorage<PendingInvite[]>('platform_pending_invites', []);
      return invites.find(inv => inv.token === token) || null;
    },

    completePasswordSetup: async (token: string, password: string): Promise<{ user: AuthUser; token: string }> => {
      const invites = this.getStorage<PendingInvite[]>('platform_pending_invites', []);
      const invIdx = invites.findIndex(inv => inv.token === token);
      if (invIdx === -1) {
        throw new Error('Invalid or expired activation link.');
      }

      const invite = invites[invIdx];
      invite.status = 'ACCEPTED';
      this.setStorage('platform_pending_invites', invites);

      const users = this.getStorage<any[]>('college_registered_users', []);
      const existingIdx = users.findIndex(u => u.email.toLowerCase().trim() === invite.email.toLowerCase().trim());

      const userRecord: AuthUser = {
        id: `usr_${Date.now()}`,
        name: invite.name,
        email: invite.email,
        role: invite.role,
        collegeId: invite.collegeId,
        collegeName: invite.collegeName,
        programId: invite.programId,
        department: invite.department,
        permissions: invite.permissions || ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS']
      };

      if (existingIdx !== -1) {
        users[existingIdx] = { ...users[existingIdx], ...userRecord, password };
      } else {
        users.push({ ...userRecord, password });
      }
      this.setStorage('college_registered_users', users);

      if (invite.role === 'SUPER_ADMIN' && invite.collegeId) {
        const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
        const colIdx = colleges.findIndex(c => c.id === invite.collegeId);
        if (colIdx !== -1) {
          colleges[colIdx].superAdminStatus = 'ACTIVE';
          this.setStorage('platform_colleges', colleges);
        }
      }

      const jwtToken = `jwt_act_${Date.now()}`;
      this.setToken(jwtToken);
      localStorage.setItem('auth_user', JSON.stringify(userRecord));

      return { user: userRecord, token: jwtToken };
    }
  };

  studentBatch = {
    bulkEnroll: async (collegeId: string, csvContent: string): Promise<{ count: number; students: any[]; errors: string[] }> => {
      const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const existing = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const registeredUsers = this.getStorage<any[]>('college_registered_users', []);
      const newStudents: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (i === 0 && (lines[i].toLowerCase().includes('name') || lines[i].toLowerCase().includes('roll'))) continue;
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length < 3) continue;

        const name = cols[0];
        const rollNumber = cols[1];
        const email = cols[2];
        const password = cols[3] || 'student123';
        const department = cols[4] || 'Computer Science & Engineering';
        const batchYear = Number(cols[5]) || 2026;

        if (!email.includes('@')) {
          errors.push(`Row ${i + 1}: Invalid email ${email}`);
          continue;
        }

        const studentId = `stu_${Date.now()}_${i}`;
        const studentObj = {
          id: studentId,
          name,
          rollNumber,
          email: email.toLowerCase(),
          collegeId,
          department,
          batchYear,
          track: 'DEPARTMENT',
          programName: 'General Department Stream',
          score: 70,
          checklist: '1/5',
          status: 'ON_TRACK',
          mentorName: 'Faculty Counselor',
          mentorEmail: 'counselor@college.edu'
        };

        newStudents.push(studentObj);
        existing.unshift(studentObj);

        registeredUsers.push({
          id: `usr_${studentId}`,
          name,
          email: email.toLowerCase(),
          password,
          role: 'STUDENT',
          rollNumber,
          collegeId,
          department,
          track: 'DEPARTMENT',
          studentId
        });
      }

      this.setStorage('admin_students', existing);
      this.setStorage('college_registered_users', registeredUsers);

      return { count: newStudents.length, students: newStudents, errors };
    },

    bulkAssignPrograms: async (collegeId: string, csvContent: string): Promise<{ count: number; updated: any[]; errors: string[] }> => {
      const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const programs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      let count = 0;
      const errors: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        if (i === 0 && (lines[i].toLowerCase().includes('roll') || lines[i].toLowerCase().includes('program'))) continue;
        const [identifier, progName, subProg] = lines[i].split(',').map(s => s?.trim());
        if (!identifier || !progName) continue;

        const idClean = identifier.toLowerCase();
        const student = students.find(s => 
          (s.rollNumber && s.rollNumber.toLowerCase() === idClean) || 
          (s.email && s.email.toLowerCase() === idClean)
        );

        if (!student) {
          errors.push(`Student identifier "${identifier}" not found in college student pool.`);
          continue;
        }

        const matchedProg = programs.find(p => p.name.toLowerCase().includes(progName.toLowerCase()) || p.code.toLowerCase() === progName.toLowerCase());

        student.programId = matchedProg?.id || `prog_${Date.now()}`;
        student.programName = matchedProg?.name || progName;
        student.subProgramName = subProg || undefined;
        student.track = subProg ? `${student.programName} (${subProg})` : student.programName;

        count++;
      }

      this.setStorage('admin_students', students);
      return { count, updated: students, errors };
    },

    assignProgramManually: async (studentId: string, programId: string, subProgramName?: string): Promise<any> => {
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const programs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      const student = students.find(s => s.id === studentId);
      if (!student) throw new Error('Student not found');

      const prog = programs.find(p => p.id === programId);
      student.programId = programId;
      student.programName = prog ? prog.name : 'Assigned Program';
      student.subProgramName = subProgramName;
      student.track = subProgramName ? `${student.programName} (${subProgramName})` : student.programName;

      this.setStorage('admin_students', students);
      return student;
    }
  };

  auth = {
    login: async (email: string, _password?: string) => {
      const normalizedEmail = email.toLowerCase().trim();
      const users = this.getStorage<any[]>('college_registered_users', []);
      const matched = users.find(u => u.email.toLowerCase().trim() === normalizedEmail);

      let role: any = 'STUDENT';
      let name = 'Student Candidate';
      let studentId = `stu_${Date.now().toString().slice(-4)}`;
      let permissions: AdminPermission[] | undefined = undefined;
      let collegeId: string | undefined = undefined;
      let collegeName: string | undefined = undefined;
      let programId: string | undefined = undefined;
      let isIndependent: boolean = false;

      if (normalizedEmail === 'owner@platform.com' || normalizedEmail.includes('owner')) {
        role = 'PLATFORM_OWNER';
        name = 'Danish Basha (Platform Owner)';
      } else if (matched) {
        role = matched.role;
        name = matched.name;
        studentId = matched.studentId || studentId;
        permissions = matched.permissions;
        collegeId = matched.collegeId;
        collegeName = matched.collegeName;
        programId = matched.programId;
        isIndependent = matched.isIndependent || false;
      } else if (normalizedEmail.includes('superadmin') || normalizedEmail.includes('admin@college.edu')) {
        role = 'SUPER_ADMIN';
        name = 'Dr. Rajesh Nair (Super Admin)';
        collegeId = 'col-1';
        collegeName = "St. Joseph's College of Engineering";
        permissions = ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_ASSIGN_LISTENING', 'CAN_ASSIGN_TRAINERS', 'CAN_MANAGE_STUDENTS', 'CAN_ASSIGN_SUB_ADMINS'];
      } else if (normalizedEmail.includes('coord') || normalizedEmail.includes('placement')) {
        role = 'PLACEMENT_COORDINATOR';
        name = 'Prof. S. Ranganathan';
        collegeId = 'col-1';
      } else if (normalizedEmail.includes('prog') || normalizedEmail.includes('program')) {
        role = 'PROGRAM_ADMIN';
        name = 'Dr. K. Swaminathan';
        collegeId = 'col-1';
        programId = 'prog-1';
        permissions = ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_ASSIGN_LISTENING', 'CAN_ASSIGN_TRAINERS', 'CAN_MANAGE_STUDENTS', 'CAN_ASSIGN_SUB_ADMINS'];
      } else if (normalizedEmail.includes('mentor') || normalizedEmail.includes('faculty')) {
        role = 'FACULTY_MENTOR';
        name = 'Dr. Ananya Sharma';
        collegeId = 'col-1';
      } else if (normalizedEmail.includes('trainer')) {
        role = 'TRAINER';
        name = 'Vikram Malhotra';
      } else if (normalizedEmail.includes('candidate') || normalizedEmail.includes('external')) {
        role = 'STUDENT';
        name = 'Independent Candidate';
        isIndependent = true;
      } else {
        role = 'STUDENT';
        name = normalizedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        collegeId = 'col-1';
      }

      const activeUser: AuthUser = {
        id: matched?.id || `usr_${Date.now()}`,
        name,
        email: normalizedEmail,
        role,
        studentId,
        permissions,
        collegeId,
        collegeName,
        programId,
        isIndependent
      };

      const token = `jwt_dyn_${Date.now()}`;
      this.setToken(token);
      localStorage.setItem('auth_user', JSON.stringify(activeUser));

      return {
        user: activeUser,
        token,
        studentId
      };
    },

    registerCandidate: async (candidateData: { name: string; email: string; password?: string }) => {
      const users = this.getStorage<any[]>('college_registered_users', []);
      const studentId = `cand_${Date.now().toString().slice(-4)}`;
      const newUser: AuthUser = {
        id: `usr_${Date.now()}`,
        name: candidateData.name || 'Independent Candidate',
        email: candidateData.email.toLowerCase().trim(),
        role: 'STUDENT',
        studentId,
        department: 'Independent Study',
        batchYear: 2026,
        track: 'EXTERNAL',
        isIndependent: true
      };

      users.push({ ...newUser, password: candidateData.password });
      this.setStorage('college_registered_users', users);

      const freshProfile: StudentProfile = {
        id: studentId,
        name: newUser.name,
        email: newUser.email,
        rollNumber: `IND-${Math.floor(1000 + Math.random() * 9000)}`,
        department: 'Independent / Self-Registered',
        batchYear: 2026,
        track: 'EXTERNAL',
        isIndependent: true,
        mentorName: 'Self-Paced Practice',
        mentorEmail: 'open@platform.com',
        codingHandles: { leetcodeSolved: 0, githubRepos: 0 },
        resume: null,
        criteriaTasks: DEFAULT_CLEAN_STUDENT.criteriaTasks,
        recentReports: []
      };

      this.setStorage(`student_profile_${studentId}`, freshProfile);
      this.setStorage('student_profile', freshProfile);

      const token = `jwt_dyn_${Date.now()}`;
      this.setToken(token);
      localStorage.setItem('auth_user', JSON.stringify(newUser));

      return { user: newUser, token, studentId };
    },

    register: async (userData: any) => {
      const users = this.getStorage<any[]>('college_registered_users', []);
      const studentId = `stu_${Date.now().toString().slice(-4)}`;
      const newUser: AuthUser = {
        id: `usr_${Date.now()}`,
        name: userData.name || 'New Candidate',
        email: userData.email,
        role: userData.role || 'STUDENT',
        studentId,
        department: userData.department || 'Computer Science & Engineering',
        batchYear: userData.batchYear || 2026,
        track: userData.track || 'General Track',
        isIndependent: userData.isIndependent || false
      };

      users.push(newUser);
      this.setStorage('college_registered_users', users);

      const freshProfile: StudentProfile = {
        id: studentId,
        name: newUser.name,
        email: newUser.email,
        rollNumber: userData.rollNumber || `22CS${Math.floor(1000 + Math.random() * 9000)}`,
        department: newUser.department || 'General',
        batchYear: newUser.batchYear || 2026,
        track: newUser.track || 'General Track',
        mentorName: 'Dr. S. Ranganathan',
        mentorEmail: 'ranganathan.s@college.edu',
        codingHandles: { leetcodeSolved: 0, githubRepos: 0 },
        resume: null,
        criteriaTasks: DEFAULT_CLEAN_STUDENT.criteriaTasks,
        recentReports: []
      };
      this.setStorage(`student_profile_${studentId}`, freshProfile);
      this.setStorage('student_profile', freshProfile);

      const token = `jwt_dyn_${Date.now()}`;
      this.setToken(token);
      localStorage.setItem('auth_user', JSON.stringify(newUser));

      return { user: newUser, token, studentId };
    },

    registerExternal: async (userData: { name: string; email: string; password?: string; department?: string; batchYear?: number }) => {
      const res = await this.auth.registerCandidate(userData);
      return {
        message: 'Registration verification code generated',
        email: userData.email,
        simulatedVerificationCode: '123456',
        ...res
      };
    },

    verifyEmail: async (email: string, _code: string) => {
      return this.auth.registerCandidate({ name: email.split('@')[0], email });
    },

    me: async () => {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        const u = JSON.parse(saved);
        return { user: u, studentId: u.studentId || 'stu-21cs1084' };
      }
      return {
        user: { id: 'usr_guest', name: 'Aravind Kumar', email: 'aravind.k@college.edu', role: 'STUDENT' },
        studentId: 'stu-21cs1084'
      };
    }
  };

  student = {
    getProfile: async (studentId?: string): Promise<StudentProfile> => {
      const key = studentId ? `student_profile_${studentId}` : 'student_profile';
      const stored = localStorage.getItem(key);
      if (stored) {
        try { return JSON.parse(stored); } catch {}
      }
      const general = localStorage.getItem('student_profile');
      if (general) {
        try { return JSON.parse(general); } catch {}
      }
      return INITIAL_STUDENT_PROFILE;
    },

    updateProfile: async (studentId: string, updates: Partial<StudentProfile>): Promise<StudentProfile> => {
      const current = await this.student.getProfile(studentId);
      const updated = { ...current, ...updates };
      this.setStorage(`student_profile_${studentId}`, updated);
      this.setStorage('student_profile', updated);
      return updated;
    },

    updateCodingHandles: async (studentId: string, handles: CodingHandles): Promise<void> => {
      const current = await this.student.getProfile(studentId);
      current.codingHandles = { ...current.codingHandles, ...handles };
      this.setStorage(`student_profile_${studentId}`, current);
      this.setStorage('student_profile', current);

      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const idx = students.findIndex(s => s.id === studentId || s.name === current.name);
      if (idx !== -1) {
        students[idx].codingHandles = current.codingHandles;
        this.setStorage('admin_students', students);
      }
    },

    uploadResume: async (
      studentId: string, 
      payload: FormData | { resumeText: string; fileName?: string } | ParsedResume
    ): Promise<ParsedResume> => {
      let parsed: ParsedResume;

      if ('skills' in payload && 'projects' in payload) {
        parsed = payload as ParsedResume;
      } else {
        const rawText = (payload as any)?.resumeText || '';
        const fileName = (payload as any)?.fileName || 'Uploaded_Resume.pdf';
        
        const extractedLanguages: string[] = [];
        const langMap = ['Python', 'Java', 'TypeScript', 'JavaScript', 'C++', 'Go', 'Rust', 'SQL', 'C#', 'PHP'];
        langMap.forEach(l => {
          if (new RegExp(`\\b${l}\\b`, 'i').test(rawText)) extractedLanguages.push(l);
        });

        const extractedFrameworks: string[] = [];
        const frameMap = ['React', 'Node.js', 'Spring Boot', 'FastAPI', 'Express', 'Django', 'Docker', 'Kubernetes', 'Tailwind', 'Next.js', 'PyTorch', 'TensorFlow'];
        frameMap.forEach(f => {
          if (new RegExp(`\\b${f.replace('.', '\\.')}\\b`, 'i').test(rawText)) extractedFrameworks.push(f);
        });

        parsed = {
          fileName,
          parsedAt: new Date().toISOString().split('T')[0],
          summary: extractedLanguages.length > 0 
            ? `Specialized candidate with expertise in ${extractedLanguages.join(', ')} and ${extractedFrameworks.slice(0, 3).join(', ')}.`
            : 'Software Engineering candidate with hands-on full-stack development experience.',
          skills: {
            languages: extractedLanguages.length > 0 ? extractedLanguages : ['Java', 'TypeScript', 'SQL', 'Python'],
            frameworks: extractedFrameworks.length > 0 ? extractedFrameworks : ['Spring Boot', 'React', 'Tailwind CSS', 'Docker'],
            databases: ['PostgreSQL', 'Redis'],
            tools: ['Git', 'Docker', 'Kafka']
          },
          projects: [
            {
              title: rawText.includes('Platform') ? 'Communication & Placement Engine' : 'High-Throughput Distributed Microservice',
              description: 'Designed and deployed low-latency transactional workflows with automated telemetry and resilience testing.',
              techStack: extractedLanguages.concat(extractedFrameworks).slice(0, 4)
            }
          ]
        };
      }

      const current = await this.student.getProfile(studentId);
      current.resume = parsed;
      this.setStorage(`student_profile_${studentId}`, current);
      this.setStorage('student_profile', current);
      return parsed;
    }
  };

  tasks = {
    toggleTask: async (studentId: string, taskId: string): Promise<boolean> => {
      const current = await this.student.getProfile(studentId);
      let isCompleted = false;
      current.criteriaTasks = current.criteriaTasks.map(t => {
        if (t.id === taskId) {
          isCompleted = !t.isCompleted;
          return { ...t, isCompleted };
        }
        return t;
      });
      this.setStorage(`student_profile_${studentId}`, current);
      this.setStorage('student_profile', current);
      return isCompleted;
    },

    verifyTask: async (studentId: string, taskId: string): Promise<void> => {
      const current = await this.student.getProfile(studentId);
      current.criteriaTasks = current.criteriaTasks.map(t => {
        if (t.id === taskId) {
          return { ...t, verifiedByMentor: true, verifiedAt: new Date().toISOString().split('T')[0] };
        }
        return t;
      });
      this.setStorage(`student_profile_${studentId}`, current);
      this.setStorage('student_profile', current);
    }
  };

  interview = {
    start: async (studentId: string, type: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION' | 'PRACTICE' = 'MOCK_INTERVIEW'): Promise<{ sessionId: string; firstQuestion: QuestionTurn }> => {
      const sessionId = `ses_${Date.now()}`;
      const student = await this.student.getProfile(studentId);
      const dynamicTurns = generateDynamicQuestions(student);
      const firstQ = dynamicTurns[0];

      const sessionData = {
        sessionId,
        type,
        turnIndex: 0,
        questions: [firstQ],
        plannedTurns: dynamicTurns,
        tabSwitches: 0
      };
      this.setStorage(`interview_${sessionId}`, sessionData);

      return { sessionId, firstQuestion: firstQ };
    },

    recordProctorEvent: async (sessionId: string, _eventType: 'TAB_SWITCH' | 'FULLSCREEN_EXIT') => {
      const sess = this.getStorage<any>(`interview_${sessionId}`, { tabSwitches: 0 });
      sess.tabSwitches = (sess.tabSwitches || 0) + 1;
      const isFlagged = sess.tabSwitches >= 4;
      this.setStorage(`interview_${sessionId}`, sess);
      return { tabSwitches: sess.tabSwitches, isFlagged };
    },

    submitAnswer: async (sessionId: string, studentAnswer: string, durationSeconds = 20) => {
      const sess = this.getStorage<any>(`interview_${sessionId}`, {
        turnIndex: 0,
        questions: [],
        plannedTurns: [],
        tabSwitches: 0
      });

      const student = await this.student.getProfile();
      const turnIdx = sess.turnIndex || 0;
      const currentQ = sess.questions[turnIdx] || (sess.plannedTurns && sess.plannedTurns[turnIdx]) || MOCK_INTERVIEW_QUESTIONS[0];

      const evalResult = evaluateDynamicAnswer(currentQ, studentAnswer, turnIdx, durationSeconds, student);

      const turnEvaluation: QuestionTurn = {
        id: currentQ.id || `q_${turnIdx + 1}`,
        questionNumber: turnIdx + 1,
        questionText: currentQ.questionText,
        difficulty: (turnIdx === 0 ? 'EASY' : turnIdx === 1 ? 'MEDIUM' : 'ADVANCED'),
        category: currentQ.category,
        studentAnswer,
        technicalScore: evalResult.technicalScore,
        communicationScore: evalResult.communicationScore,
        wpm: evalResult.wpm,
        fillerWords: evalResult.fillerWords,
        feedback: evalResult.feedback,
        strengths: evalResult.strengths,
        weaknesses: evalResult.weaknesses
      };

      sess.questions[turnIdx] = turnEvaluation;
      const isCompleted = turnIdx >= 2;

      let nextQuestion: QuestionTurn | undefined = undefined;
      let finalReport: DiagnosticReport | undefined = undefined;

      if (!isCompleted) {
        const nextDiff = turnIdx === 0 ? 'MEDIUM' : 'ADVANCED';
        const fallbackNext = sess.plannedTurns && sess.plannedTurns[turnIdx + 1] ? sess.plannedTurns[turnIdx + 1].questionText : "Walk me through how you handle distributed latency.";
        const nextQText = evalResult.nextQuestionText || fallbackNext;

        nextQuestion = {
          id: `q_${turnIdx + 2}_${Date.now()}`,
          questionNumber: turnIdx + 2,
          questionText: nextQText,
          difficulty: nextDiff,
          category: turnIdx === 0 ? 'Scalability & Concurrency' : 'Resilience & Architecture'
        };

        sess.turnIndex = turnIdx + 1;
        sess.questions.push(nextQuestion);
      } else {
        finalReport = synthesizeDynamicReport(
          sess.type || 'MOCK_INTERVIEW',
          sess.questions,
          student,
          sess.tabSwitches || 0
        );

        student.recentReports = [finalReport, ...(student.recentReports || [])];
        this.setStorage(`student_profile_${student.id}`, student);
        this.setStorage('student_profile', student);

        const candidates = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
        const cIdx = candidates.findIndex(c => c.name === student.name || c.id === student.id);
        if (cIdx !== -1) {
          candidates[cIdx].score = finalReport.overallScore;
          candidates[cIdx].status = finalReport.overallScore >= 80 ? 'PLACEMENT_READY' : finalReport.overallScore >= 70 ? 'ON_TRACK' : 'NEEDS_ATTENTION';
          this.setStorage('admin_students', candidates);
        }
      }

      this.setStorage(`interview_${sessionId}`, sess);

      return {
        isCompleted,
        turnEvaluation,
        nextQuestion,
        finalReport
      };
    },

    finalize: async (sessionId: string): Promise<DiagnosticReport | null> => {
      const sess = this.getStorage<any>(`interview_${sessionId}`, null);
      if (!sess) return null;
      const student = await this.student.getProfile();
      return synthesizeDynamicReport(sess.type || 'MOCK_INTERVIEW', sess.questions || [], student, sess.tabSwitches || 0);
    },

    getReport: async (_sessionId: string): Promise<DiagnosticReport> => {
      const student = await this.student.getProfile();
      if (student.recentReports && student.recentReports.length > 0) {
        return student.recentReports[0];
      }
      return synthesizeDynamicReport('MOCK_INTERVIEW', [], student, 0);
    }
  };

  listening = {
    start: async (_studentId: string, passageIndex?: number) => {
      const pIdx = passageIndex !== undefined ? (passageIndex % LISTENING_PASSAGES.length) : Math.floor(Math.random() * LISTENING_PASSAGES.length);
      const selectedPassage = LISTENING_PASSAGES[pIdx];
      const sessionId = `lis_${Date.now()}`;
      
      this.setStorage(`listening_${sessionId}`, {
        passage: selectedPassage,
        replaysUsed: 0,
        answers: []
      });

      return {
        sessionId,
        passage: selectedPassage,
        replaysUsed: 0,
        maxReplays: 2
      };
    },

    recordReplay: async (sessionId: string) => {
      const sess = this.getStorage<any>(`listening_${sessionId}`, { replaysUsed: 0 });
      sess.replaysUsed = (sess.replaysUsed || 0) + 1;
      this.setStorage(`listening_${sessionId}`, sess);
      return { replaysUsed: sess.replaysUsed };
    },

    submitAnswers: async (sessionId: string, answers: { questionId: string; answerText: string }[]) => {
      const sess = this.getStorage<any>(`listening_${sessionId}`, {
        passage: LISTENING_PASSAGES[0],
        replaysUsed: 0
      });
      const passage = sess.passage || LISTENING_PASSAGES[0];
      const student = await this.student.getProfile();

      let totalScore = 0;
      const evaluations = answers.map((ans, idx) => {
        const qObj = passage.questions[idx] || passage.questions[0];
        const lowerAnswer = ans.answerText.toLowerCase();
        const keywords = qObj.keywords || [];

        let score = 65;
        let matchedKeywords = 0;
        keywords.forEach((k: string) => {
          if (lowerAnswer.includes(k.toLowerCase())) {
            matchedKeywords++;
            score += 10;
          }
        });

        if (ans.answerText.trim().length > 20) score += 5;
        score = Math.min(98, score);
        totalScore += score;

        return {
          questionIndex: idx,
          questionText: qObj.questionText,
          studentAnswer: ans.answerText,
          expectedAnswer: qObj.expectedAnswer,
          score,
          matchedKeywords,
          feedback: score >= 80 
            ? 'Accurately captured key architectural requirements.'
            : 'Partially captured requirement. Review technical constraints in the passage.'
        };
      });

      const avgScore = Math.round(totalScore / Math.max(1, answers.length));

      const turns: QuestionTurn[] = evaluations.map((ev, i) => ({
        id: `lis_q_${i + 1}`,
        questionNumber: i + 1,
        questionText: ev.questionText,
        difficulty: 'MEDIUM',
        studentAnswer: ev.studentAnswer,
        technicalScore: ev.score,
        communicationScore: Math.min(95, ev.score + 2),
        wpm: 126,
        fillerWords: 1,
        feedback: ev.feedback
      }));

      const finalReport = synthesizeDynamicReport('LISTENING_COMPREHENSION', turns, student, 0);
      finalReport.overallScore = avgScore;

      student.recentReports = [finalReport, ...(student.recentReports || [])];
      this.setStorage(`student_profile_${student.id}`, student);
      this.setStorage('student_profile', student);

      return {
        overallScore: avgScore,
        evaluations,
        finalReport
      };
    }
  };

  suggestions = {
    getOrCreateSession: async (_studentId = 'stu-101'): Promise<string> => {
      return `sug_${Date.now()}`;
    },

    getHistory: async (sessionId: string) => {
      return this.getStorage<any[]>(`sug_hist_${sessionId}`, []);
    },

    sendMessage: async (sessionId: string, message: string) => {
      const lower = message.toLowerCase();
      let assistantReply = "Structure your answer using the STAR framework (Situation, Task, Action, Result). State the latency or scale bottleneck in the first sentence, explain your design choices, and conclude with verified performance metrics.";
      
      let technicalTerms = [
        { term: 'Event-driven Architecture', definition: 'A design pattern where state changes trigger decoupled asynchronous processing.', betterAlternativeTo: 'Sending calls back and forth' },
        { term: 'Idempotency', definition: 'Ensuring an operation produces the identical outcome even if executed repeatedly.', betterAlternativeTo: 'Making sure we do not duplicate requests' }
      ];

      let commSuggestions = [
        'Lead with the high-level trade-off before diving into implementation details.',
        'Use transition phrasing such as "From a throughput perspective" or "To preserve data consistency".'
      ];

      let structuralAdvice = [
        'Framework: Problem Scope -> Architectural Decision -> Benchmark Impact (latency, memory, or throughput).'
      ];

      if (lower.includes('pacing') || lower.includes('speed') || lower.includes('wpm')) {
        assistantReply = "For technical interviews, optimal speaking pace is between 120 and 150 words per minute. If you feel rushed, deliberately pause for 1 second between clauses instead of filling silence with vocal fillers.";
        commSuggestions = [
          'Take a breath before answering complex architectural questions.',
          'Replace fillers with purposeful pauses to signal deliberate thinking.'
        ];
      } else if (lower.includes('filler') || lower.includes('um') || lower.includes('like')) {
        assistantReply = "Filler words usually happen when your brain plans the next sentence faster than you speak. Ground your answers in bullet points in your head before speaking.";
        commSuggestions = [
          'Pause rather than saying "basically" or "sort of".',
          'Conclude statements with confidence rather than trailing off.'
        ];
      } else if (lower.includes('database') || lower.includes('scale') || lower.includes('system design')) {
        technicalTerms = [
          { term: 'Connection Pooling', definition: 'Reusing a cache of database connections to minimize overhead on concurrent requests.', betterAlternativeTo: 'Opening a new database connection each time' },
          { term: 'Sharding & Replication', definition: 'Splitting datasets across multiple database instances to scale read and write throughput.', betterAlternativeTo: 'Making the database bigger' }
        ];
        structuralAdvice = [
          'Structure: Read vs. Write Ratios -> Indexing Strategy -> Cache Invalidation -> Fallback Mechanism.'
        ];
      }

      const userMsg = { id: `msg_${Date.now()}_u`, role: 'user', content: message, createdAt: new Date().toISOString() };
      const assistantMsg = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant' as const,
        content: assistantReply,
        technicalTerminology: technicalTerms,
        communicationSuggestions: commSuggestions,
        structuralAdvice,
        createdAt: new Date().toISOString()
      };

      const hist = this.getStorage<any[]>(`sug_hist_${sessionId}`, []);
      hist.push(userMsg, assistantMsg);
      this.setStorage(`sug_hist_${sessionId}`, hist);

      return {
        userMessage: userMsg,
        assistantMessage: assistantMsg
      };
    }
  };

  admin = {
    getCoordinatorStats: async () => {
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const programs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      const totalCandidates = students.length;
      const readyCount = students.filter(s => (s.score || 0) >= 75).length;
      const placementReadyRate = Math.round((readyCount / Math.max(1, totalCandidates)) * 100);

      return {
        totalCandidates: totalCandidates || 240,
        activeProgramsCount: programs.length,
        placementReadyRate: placementReadyRate || 72,
        readyCount: readyCount || 172
      };
    },

    getSystemStats: async () => {
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const trainers = this.getStorage<any[]>('trainer_tenures', MOCK_TRAINER_TENURES);
      const mentors = this.getStorage<any[]>('admin_faculty_mentors', [
        { id: 'fm-1', name: 'Dr. Ananya Sharma', email: 'ananya.sharma@college.edu', department: 'CSE', assignedMenteesCount: 24 }
      ]);
      const admins = this.getStorage<any[]>('admin_program_admins', [
        { id: 'pa-1', name: 'Dr. K. Swaminathan', email: 'swaminathan@college.edu', department: 'CSE' }
      ]);

      return {
        programAdminsCount: admins.length,
        facultyMentorsCount: mentors.length,
        trainersCount: trainers.filter(t => t.isActive).length,
        studentsCount: students.length
      };
    },

    getProgramAdmins: async (): Promise<any[]> => {
      return this.getStorage<any[]>('admin_program_admins', [
        { id: 'pa-1', name: 'Dr. K. Swaminathan', email: 'swaminathan@college.edu', department: 'CSE', createdAt: '2026-01-10' }
      ]);
    },

    createProgramAdmin: async (data: { name: string; email: string; password?: string }) => {
      const admins = this.getStorage<any[]>('admin_program_admins', []);
      const newAdmin = { id: `pa_${Date.now()}`, ...data, createdAt: new Date().toISOString().split('T')[0] };
      admins.push(newAdmin);
      this.setStorage('admin_program_admins', admins);
      return newAdmin;
    },

    getFacultyMentors: async (): Promise<any[]> => {
      return this.getStorage<any[]>('admin_faculty_mentors', [
        { id: 'fm-1', name: 'Dr. Ananya Sharma', email: 'ananya.sharma@college.edu', department: 'CSE', assignedMenteesCount: 24 },
        { id: 'fm-2', name: 'Prof. R. Venkatesh', email: 'venkatesh.r@college.edu', department: 'IT', assignedMenteesCount: 22 }
      ]);
    },

    createFacultyMentor: async (data: { name: string; email: string; password?: string }) => {
      const mentors = this.getStorage<any[]>('admin_faculty_mentors', []);
      const newMentor = { id: `fm_${Date.now()}`, ...data, assignedMenteesCount: 0 };
      mentors.push(newMentor);
      this.setStorage('admin_faculty_mentors', mentors);
      return newMentor;
    },

    assignMentor: async (studentId: string, mentorId: string) => {
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const updated = students.map(s => s.id === studentId ? { ...s, mentorId } : s);
      this.setStorage('admin_students', updated);
      return { message: 'Mentor assigned successfully' };
    },

    createStudent: async (data: any) => {
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const newStudent = {
        id: `stu_${Date.now()}`,
        name: data.name,
        rollNumber: data.rollNumber || `22CS${Math.floor(1000 + Math.random() * 9000)}`,
        track: data.track || 'General Track',
        domain: data.domain || 'Technical Architecture',
        score: data.score || 75,
        checklist: '0/5',
        status: 'ON_TRACK'
      };
      students.unshift(newStudent);
      this.setStorage('admin_students', students);
      return newStudent;
    },

    createStudentByMentor: async (data: any) => {
      return this.admin.createStudent(data);
    },

    deleteUser: async (userId: string) => {
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST).filter(s => s.id !== userId);
      this.setStorage('admin_students', students);
      return { success: true, message: 'User removed successfully' };
    },

    getStudentFullHistory: async (studentId: string) => {
      const student = await this.student.getProfile(studentId);
      const sessions = (student.recentReports || []).map((r, i) => ({
        id: r.id || `ses_${i + 1}`,
        sessionType: r.sessionType || 'MOCK_INTERVIEW',
        overallScore: r.overallScore,
        technicalScore: r.technicalScore,
        communicationScore: r.communicationScore,
        averageWpm: r.averageWpm,
        totalFillerWords: r.totalFillerWords,
        createdAt: r.date || new Date().toISOString(),
        tabSwitches: r.tabSwitches || 0,
        isFlagged: r.isFlagged || false,
        turns: [
          {
            id: `turn_${i}_1`,
            turnNumber: 1,
            questionNumber: 1,
            questionText: 'Walk me through your system architecture and performance bottlenecks.',
            studentAnswer: 'In our architecture, we employed asynchronous queueing alongside connection pooling to maintain strict latency SLAs.',
            technicalScore: r.technicalScore,
            communicationScore: r.communicationScore,
            wordsPerMinute: r.averageWpm,
            fillerCount: r.totalFillerWords,
            strengths: 'Clear structural explanation and good terminology.',
            weaknesses: 'Can elaborate more on edge-case partition rebalancing.'
          }
        ]
      }));

      return {
        profile: student,
        interviews: student.recentReports,
        tasks: student.criteriaTasks,
        interviewSessions: sessions
      };
    },

    getStudents: async (params: { cohort?: string; search?: string } = {}) => {
      let list = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      if (params.search) {
        const s = params.search.toLowerCase();
        list = list.filter(item => item.name.toLowerCase().includes(s) || item.rollNumber.toLowerCase().includes(s));
      }
      return list;
    },

    getMentorMentees: async (_mentorId?: string) => {
      return this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
    },

    getTrainerTenures: async (): Promise<TrainerTenure[]> => {
      return this.getStorage<TrainerTenure[]>('trainer_tenures', MOCK_TRAINER_TENURES);
    },

    onboardTrainer: async (trainer: Omit<TrainerTenure, 'id' | 'isActive'>): Promise<TrainerTenure> => {
      const tenures = this.getStorage<TrainerTenure[]>('trainer_tenures', MOCK_TRAINER_TENURES);
      const newT: TrainerTenure = { id: `ten_${Date.now()}`, ...trainer, isActive: true };
      tenures.push(newT);
      this.setStorage('trainer_tenures', tenures);
      return newT;
    },

    revokeTrainer: async (id: string): Promise<void> => {
      const tenures = this.getStorage<TrainerTenure[]>('trainer_tenures', MOCK_TRAINER_TENURES);
      const updated = tenures.map(t => t.id === id ? { ...t, isActive: false } : t);
      this.setStorage('trainer_tenures', updated);
    },

    getAssignments: async (collegeId?: string): Promise<InterviewAssignment[]> => {
      const list = this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
      if (collegeId) {
        return list.filter(a => !a.collegeId || a.collegeId === collegeId);
      }
      return list;
    },

    createAssignment: async (asg: Partial<InterviewAssignment>): Promise<InterviewAssignment> => {
      const list = this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
      const newAsg: InterviewAssignment = {
        id: `asg_${Date.now()}`,
        title: asg.title || 'Practice Drill',
        sessionType: asg.sessionType || 'MOCK_INTERVIEW',
        assignedByRole: asg.assignedByRole || 'SUPER_ADMIN',
        assignedByName: asg.assignedByName || 'Placement Cell',
        assignedByEmail: asg.assignedByEmail,
        assignedById: asg.assignedById,
        collegeId: asg.collegeId || 'col-1',
        targetScope: asg.targetScope || 'ALL_STUDENTS',
        targetDomainOrTrack: asg.targetDomainOrTrack || 'All Batches',
        targetProgramName: asg.targetProgramName,
        targetSubProgram: asg.targetSubProgram,
        targetDepartment: asg.targetDepartment,
        targetStudentId: asg.targetStudentId,
        targetStudentName: asg.targetStudentName,
        domainOrTopic: asg.domainOrTopic || 'General Technical Architecture',
        difficulty: asg.difficulty || 'MEDIUM',
        listeningPassageId: asg.listeningPassageId,
        customInstructions: asg.customInstructions,
        dueDate: asg.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isMandatory: asg.isMandatory ?? true,
        createdAt: new Date().toISOString(),
        submissions: []
      };
      list.unshift(newAsg);
      this.setStorage('assignments', list);
      return newAsg;
    },

    submitAssignment: async (assignmentId: string, submission: AssignmentSubmission): Promise<{ success: boolean; assignment: InterviewAssignment }> => {
      const list = this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
      const idx = list.findIndex(a => a.id === assignmentId);
      if (idx !== -1) {
        if (!list[idx].submissions) list[idx].submissions = [];
        const subIdx = list[idx].submissions!.findIndex(s => s.studentId === submission.studentId);
        if (subIdx !== -1) {
          list[idx].submissions![subIdx] = submission;
        } else {
          list[idx].submissions!.push(submission);
        }
        this.setStorage('assignments', list);
        return { success: true, assignment: list[idx] };
      }
      throw new Error('Assignment not found');
    },

    deleteAssignment: async (assignmentId: string): Promise<boolean> => {
      let list = this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
      list = list.filter(a => a.id !== assignmentId);
      this.setStorage('assignments', list);
      return true;
    },

    getStudentAssignments: async (student: any): Promise<InterviewAssignment[]> => {
      const list = this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
      return list.filter(a => {
        if (a.targetScope === 'ALL_STUDENTS') return true;
        if (a.targetScope === 'SPECIFIC_STUDENT') {
          return a.targetStudentId === student.id || a.targetStudentName === student.name;
        }
        if (a.targetScope === 'MY_MENTEES') {
          // If assigned to mentor's mentees, match if student has this mentor or general mentees
          return Boolean(student.mentorName || student.mentorEmail || student.mentorId);
        }
        if (a.targetScope === 'PROGRAM') {
          return student.programName === a.targetProgramName || student.track === a.targetProgramName || student.track?.startsWith(a.targetProgramName || '');
        }
        if (a.targetScope === 'DEPARTMENT') {
          return student.department === a.targetDepartment;
        }
        return true;
      });
    },

    getCollegePrograms: async (collegeId = 'col-1'): Promise<DynamicProgram[]> => {
      return this.college.getPrograms(collegeId);
    }
  };
}

export const api = new ApiClient();
