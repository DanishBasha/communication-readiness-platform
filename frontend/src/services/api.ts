import {
  StudentProfile,
  DiagnosticReport,
  TrainerTenure,
  InterviewAssignment,
  AssignmentSubmission,
  QuestionTurn,
  ParsedResume,
  CodingHandles,
  Difficulty,
  College,
  DynamicProgram,
  DynamicDepartment,
  PendingInvite,
  AdminPermission,
  AuthUser,
} from '../types';
import {
  DEFAULT_CLEAN_STUDENT,
  INITIAL_STUDENT_PROFILE,
  MOCK_INTERVIEW_QUESTIONS,
  MOCK_TRAINER_TENURES,
  MOCK_ASSIGNMENTS,
  MOCK_MENTEES_LIST,
  LISTENING_PASSAGES,
  LISTENING_PASSAGE,
  INITIAL_CRITERIA_TASKS,
  MOCK_COLLEGES,
  MOCK_DYNAMIC_PROGRAMS,
  MOCK_DYNAMIC_DEPARTMENTS,
} from '../data/mockData';

const PEP_DOMAINS = [
  'Full Stack Development', 'Data Science & AI', 'Cybersecurity', 'Cloud Computing & DevOps',
  'Mobile Development', 'Embedded Systems', 'Core Java & Spring', 'React & Frontend',
  'Python & Django', 'Node.js & Express', 'Database Engineering', 'Networking & Infrastructure',
  'UI/UX Design', 'Blockchain & Web3', 'Game Development', 'Quality Assurance & Testing',
  'Machine Learning', 'Natural Language Processing', 'Computer Vision', 'Systems Programming', 'IoT'
];

const API_BASE_URL = '/api';

// Direct Client-Side Groq helper — used for interview evaluation UI feedback
// and as AI fallback when backend FastAPI service is unreachable.
async function callGroqDirect(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  if (!resp.ok) throw new Error(`Groq API returned ${resp.status}: ${resp.statusText}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

// State for active interview session — persisted across answer submits
interface SessionCache {
  attemptId: string | null;
  sessionId: string;
  questionId: string | null;
  turnIndex: number;
  backendMode: boolean;
  sessionType: string;
  questions: QuestionTurn[];
  tabSwitches: number;
}

const SESSION_KEY = 'crp_active_session';

// In-memory store for pending external registration (2-step flow)
let _pendingReg: { userData: any; batchId: string | null } | null = null;
const _pendingCodes = new Map<string, string>();

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

  private async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    opts: { noAuth?: boolean } = {},
  ): Promise<T> {
    const isFormData = body instanceof FormData;
    const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
    if (!opts.noAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
    });
    let data: any;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) {
      const err: ApiError = new Error(
        data?.error?.message || data?.message || `HTTP ${response.status}`,
      );
      err.status = response.status;
      err.code = data?.error?.code || 'API_ERROR';
      throw err;
    }
    // Backend wraps responses in { success, data: { ... } }
    return (data.data ?? data) as T;
  }

  private getStorage<T>(key: string, def: T): T {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : def;
    } catch {
      return def;
    }
  }

  private setStorage<T>(key: string, val: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn(`localStorage error for ${key}:`, e);
    }
  }

  // ── Base fetch helper (auth header + json envelope + FormData support) ──────

  private async apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('auth_token');
    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.headers) {
      const extra = options.headers as Record<string, string>;
      Object.assign(headers, extra);
    }

    const res = await fetch(path, { ...options, headers });

    let json: any;
    try {
      json = await res.json();
    } catch {
      const e: ApiError = new Error(res.statusText);
      e.status = res.status;
      throw e;
    }

    if (!res.ok) {
      const e: ApiError = new Error(json?.message ?? res.statusText);
      e.status = res.status;
      e.code = json?.code;
      throw e;
    }

    return json.data as T;
  }

  // Build a DiagnosticReport from locally accumulated question turns
  private buildLocalReport(
    questions: QuestionTurn[],
    tabSwitches: number,
    sessionType: string,
    fillerBreakdown: Record<string, number> = {},
  ): DiagnosticReport {
    const answered = questions.filter(q => q.technicalScore !== undefined);
    const techAvg =
      answered.length
        ? answered.reduce((s, q) => s + (q.technicalScore || 0), 0) / answered.length
        : 84;
    const commAvg =
      answered.length
        ? answered.reduce((s, q) => s + (q.communicationScore || 0), 0) / answered.length
        : 80;
    const wpmAvg =
      answered.length
        ? Math.round(answered.reduce((s, q) => s + (q.wpm || 120), 0) / answered.length)
        : 120;
    const totalFillers = answered.reduce((s, q) => s + (q.fillerWords || 0), 0);
    const overall = Math.round(techAvg * 0.7 + commAvg * 0.3);
    return {
      id: `rep-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      sessionType: sessionType as DiagnosticReport['sessionType'],
      overallScore: overall,
      technicalScore: Math.round(techAvg),
      communicationScore: Math.round(commAvg),
      averageWpm: wpmAvg,
      totalFillerWords: totalFillers,
      fillerWordBreakdown: fillerBreakdown,
      skillBreakdown: [
        {
          skill: 'Technical Depth',
          score: Math.round(techAvg),
          status: techAvg >= 80 ? 'STRONG' : techAvg >= 60 ? 'MODERATE' : 'NEEDS_WORK',
          recommendation: 'Continue practising system design and algorithm complexity.',
        },
        {
          skill: 'Communication Fluency',
          score: Math.round(commAvg),
          status: commAvg >= 80 ? 'STRONG' : commAvg >= 60 ? 'MODERATE' : 'NEEDS_WORK',
          recommendation: 'Practise reducing filler words and maintaining a steady pace.',
        },
      ],
      actionableNextSteps: [
        `Average speaking pace: ${wpmAvg} WPM — ${wpmAvg >= 120 && wpmAvg <= 150 ? 'excellent range' : 'aim for 120–150 WPM'}.`,
        'Continue practising technical explanations with concrete, metric-backed examples.',
        'Review distributed systems trade-offs (CAP theorem, saga pattern) for deeper readiness.',
      ],
      tabSwitches,
      isFlagged: tabSwitches >= 4,
    };
  }

  // Map backend GET /reports/:attemptId response to DiagnosticReport
  private mapBackendReport(report: any, tabSwitches = 0): DiagnosticReport {
    return {
      id: report.id || `rep-${Date.now().toString().slice(-6)}`,
      date: report.generatedAt
        ? report.generatedAt.split('T')[0]
        : new Date().toISOString().split('T')[0],
      sessionType: (report.sessionType || 'MOCK_INTERVIEW') as DiagnosticReport['sessionType'],
      overallScore: Math.round(report.overallScore || 0),
      technicalScore: Math.round(report.technicalScore || 0),
      communicationScore: Math.round(report.communicationScore || 0),
      averageWpm: 120,
      totalFillerWords: 0,
      fillerWordBreakdown: {},
      skillBreakdown:
        report.questionBreakdown?.slice(0, 4).map((q: any, i: number) => {
          const avg = Math.round(((q.technicalScore || 0) + (q.communicationScore || 0)) / 2);
          return {
            skill: `Q${i + 1}: ${q.difficulty || 'MEDIUM'} — ${(q.questionText || '').slice(0, 40)}`,
            score: avg,
            status: avg >= 80 ? 'STRONG' : avg >= 60 ? 'MODERATE' : 'NEEDS_WORK',
            recommendation: q.feedback || 'Keep practising this area.',
          };
        }) || [
          {
            skill: 'Technical Depth',
            score: Math.round(report.technicalScore || 0),
            status: 'MODERATE',
            recommendation: 'Continue practising system design.',
          },
        ],
      actionableNextSteps: [
        'Review your session breakdown above to identify which questions need more work.',
        'Continue with additional mock sessions on the platform.',
      ],
      tabSwitches: report.tabSwitchCount || tabSwitches,
      isFlagged: report.isProctorFlagged || tabSwitches >= 4,
    };
  }

  // Mock login fallback (used when backend is unreachable)
  private mockLoginByEmail(email: string) {
    const e = email.toLowerCase().trim();
    let role: any = 'STUDENT';
    let name = 'Student Candidate';
    if (e.includes('superadmin') || e === 'admin@college.edu') {
      role = 'SUPER_ADMIN';
      name = 'Dr. Rajesh Nair (Super Admin)';
    } else if (e.includes('coord') || e.includes('placement')) {
      role = 'PLACEMENT_COORDINATOR';
      name = 'Prof. S. Ranganathan';
    } else if (e.includes('prog') || e.includes('program')) {
      role = 'PROGRAM_ADMIN';
      name = 'Dr. K. Swaminathan';
    } else if (e.includes('mentor') || e.includes('faculty')) {
      role = 'FACULTY_MENTOR';
      name = 'Dr. Ananya Sharma';
    } else if (e.includes('trainer')) {
      role = 'TRAINER';
      name = 'Vikram Malhotra';
    } else if (e.includes('owner') || e === 'owner@platform.com') {
      role = 'PLATFORM_OWNER';
      name = 'Platform Owner';
    } else {
      name = 'Aravind Kumar';
    }
    const isStudent = role === 'STUDENT';
    const token = `jwt_mock_${Date.now()}`;
    const user = { id: `usr_${Date.now()}`, name, email, role };
    this.setToken(token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    return { user, token, studentId: isStudent ? 'stu-21cs1084' : undefined };
  }

  // Fetch first available batchId from backend (for registration)
  private async fetchFirstBatchId(): Promise<string | null> {
    try {
      const res = await this.request<{ items: any[] }>('GET', '/org/batches', undefined, {
        noAuth: true,
      });
      const items = res.items || [];
      return items.length > 0 ? items[0].id : null;
    } catch {
      return null;
    }
  }

  // Fall back to a local mock interview session (no backend)
  private async startLocalSession(
    type: string,
  ): Promise<{ sessionId: string; firstQuestion: QuestionTurn }> {
    const sessionId = `ses_${Date.now()}`;
    const groqKey = localStorage.getItem('groq_api_key');
    const student = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
    let firstQ: QuestionTurn = MOCK_INTERVIEW_QUESTIONS[0];

    if (groqKey) {
      try {
        const langs = student.resume?.skills?.languages?.join(', ') || 'Java, Python';
        const sys = `You are a technical interviewer. Candidate skills: ${langs}. Generate ONE opening interview question as JSON: {"questionText": "...", "difficulty": "EASY", "category": "..."}`;
        const content = await callGroqDirect(groqKey, sys, 'Generate the first interview question.');
        const m = content.match(/\{[\s\S]*\}/);
        if (m) {
          const p = JSON.parse(m[0]);
          firstQ = {
            id: `q_1_${Date.now()}`,
            questionNumber: 1,
            questionText: p.questionText || firstQ.questionText,
            difficulty: 'EASY',
            category: p.category || 'Architecture',
          };
        }
      } catch {
        /* use mock question */
      }
    }

    this.setStorage<SessionCache>(SESSION_KEY, {
      attemptId: null,
      sessionId,
      questionId: null,
      turnIndex: 0,
      backendMode: false,
      sessionType: type,
      questions: [firstQ],
      tabSwitches: 0,
    });

    return { sessionId, firstQuestion: firstQ };
  }

  // Build local student history (fallback for getStudentFullHistory)
  private buildLocalStudentHistory(studentIdOrUserId: string): any {
    const student = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
    const sessions = (student.recentReports || []).map((r, i) => ({
      id: r.id || `ses_${i + 1}`,
      sessionType: r.sessionType || 'MOCK_INTERVIEW',
      difficulty: 'MEDIUM',
      isProctorFlagged: r.isFlagged || false,
      startedAt: r.date || new Date().toISOString(),
      tabSwitchCount: r.tabSwitches || 0,
      report: {
        overallScore: r.overallScore,
        technicalScore: r.technicalScore,
        communicationScore: r.communicationScore,
        averageWpm: r.averageWpm,
        totalFillerWords: r.totalFillerWords,
      },
      turns: [],
    }));
    return {
      student: {
        name: student.name,
        track: student.track || 'HOPE_ELITE',
        roll_number: student.rollNumber || 'N/A',
        department: student.department || 'CSE',
        batch_year: student.batchYear || 2026,
        mentor_name: student.mentorName || 'Unassigned',
        leetcode_solved: student.codingHandles?.leetcodeSolved || 0,
        github_repos: student.codingHandles?.githubRepos || 0,
      },
      resume: student.resume,
      checklist: (student.criteriaTasks || []).map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        is_completed: t.isCompleted,
        verified_by_mentor: t.verifiedByMentor,
      })),
      interviewSessions: sessions,
    };
  }

  // ── AUTH ─────────────────────────────────────────────────────────────────────

  auth = {
    login: async (email: string, password: string) => {
      try {
        const res = await this.request<{ user: any; token: string; studentId: string }>(
          'POST',
          '/auth/login',
          { email, password },
          { noAuth: true },
        );
        this.setToken(res.token);
        localStorage.setItem('auth_user', JSON.stringify({ ...res.user, studentId: res.studentId }));
        return { user: res.user, token: res.token, studentId: res.studentId };
      } catch (err: any) {
        // Re-throw 401/400 so the UI shows credential error,
        // UNLESS this is a known demo-only address (never in real DB)
        const DEMO_EMAILS = [
          'owner@platform.com', 'superadmin@college.edu', 'admin@college.edu',
          'program@college.edu', 'mentor@college.edu', 'trainer@college.edu',
          'placement@college.edu', 'candidate@example.com',
        ];
        if ((err.status === 401 || err.status === 400 || err.status === 422)
            && !DEMO_EMAILS.includes(email.toLowerCase().trim())) {
          throw err;
        }
        // Network/5xx or demo email — fall back to email-based mock
        return this.mockLoginByEmail(email);
      }
    },

    register: async (userData: any) => {
      try {
        const batchId = userData.batchId || (await this.fetchFirstBatchId());
        if (!batchId) throw new Error('No batch available for registration');
        const rollNumber =
          userData.rollNumber ||
          `REG-${Date.now().toString().slice(-6)}`;
        const res = await this.request<{ user: any; token: string; studentId: string }>(
          'POST',
          '/auth/register',
          {
            name: userData.name || 'New User',
            email: userData.email,
            password: userData.password || 'Welcome@123',
            rollNumber,
            batchId,
          },
          { noAuth: true },
        );
        this.setToken(res.token);
        localStorage.setItem('auth_user', JSON.stringify({ ...res.user, studentId: res.studentId }));
        return { user: res.user, token: res.token, studentId: res.studentId };
      } catch (err: any) {
        if (err.status === 409 || err.status === 422) throw err;
        // Backend offline — mock registration
        const user = {
          id: `usr_${Date.now()}`,
          name: userData.name || 'New User',
          email: userData.email,
          role: 'STUDENT',
        };
        const token = `jwt_mock_${Date.now()}`;
        this.setToken(token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        return { user, token, studentId: `stu-${Date.now().toString().slice(-4)}` };
      }
    },

    registerExternal: async (userData: {
      name: string;
      email: string;
      password?: string;
      department?: string;
      batchYear?: number;
    }) => {
      // Fetch a batch to assign on verification step
      const batchId = await this.fetchFirstBatchId();
      _pendingReg = { userData, batchId };
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      _pendingCodes.set(userData.email, code);
      return {
        message: 'Registration pending. Use the verification code to complete sign-up.',
        email: userData.email,
        simulatedVerificationCode: code,
      };
    },

    verifyEmail: async (email: string, code: string) => {
      const storedCode = _pendingCodes.get(email);
      if (storedCode && code !== storedCode) {
        throw new Error('Invalid verification code');
      }

      // Attempt real backend registration
      if (_pendingReg?.batchId) {
        try {
          const { userData, batchId } = _pendingReg;
          const rollNumber = `EXT-${Date.now().toString().slice(-6)}`;
          const res = await this.request<{ user: any; token: string; studentId: string }>(
            'POST',
            '/auth/register',
            {
              name: userData.name,
              email: userData.email,
              password: userData.password || 'Welcome@123',
              rollNumber,
              batchId,
            },
            { noAuth: true },
          );
          _pendingReg = null;
          _pendingCodes.delete(email);
          this.setToken(res.token);
          localStorage.setItem('auth_user', JSON.stringify({ ...res.user, studentId: res.studentId }));
          return { user: res.user, token: res.token, studentId: res.studentId };
        } catch (err: any) {
          if (err.status === 409) throw err; // Duplicate — tell user
          // Backend failed for other reasons — fall through to mock
          console.warn('[api.auth.verifyEmail] Backend register failed, using mock:', err.message);
        }
      }

      // Mock fallback
      const user = {
        id: `usr_${Date.now()}`,
        name: _pendingReg?.userData?.name || email.split('@')[0],
        email,
        role: 'STUDENT',
      };
      const token = `jwt_mock_${Date.now()}`;
      this.setToken(token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      _pendingReg = null;
      _pendingCodes.delete(email);
      return { user, token, studentId: 'stu-21cs1084' };
    },

    registerCandidate: async (candidateData: { name: string; email: string; password?: string }) => {
      if (!candidateData.password) throw new Error('Password is required');
      try {
        const res = await this.request<any>('POST', '/auth/register', {
          name: candidateData.name, email: candidateData.email, password: candidateData.password,
        });
        if (res?.user) {
          const authUser: AuthUser = {
            id: res.user.id, name: res.user.name, email: res.user.email,
            role: res.user.role || 'STUDENT', studentId: res.studentId, isIndependent: true,
          };
          this.setToken(res.token);
          localStorage.setItem('auth_user', JSON.stringify(authUser));
          return { user: authUser, token: res.token, studentId: res.studentId };
        }
      } catch (err: any) {
        if (err.status === 409 || err.status === 422) throw err; // Duplicate/validation — tell user
        // Network/5xx — fall through to mock
      }
      // Mock fallback
      const studentId = `cand_${Date.now().toString().slice(-4)}`;
      const newUser: AuthUser = {
        id: `usr_${Date.now()}`, name: candidateData.name || 'Independent Candidate',
        email: candidateData.email.toLowerCase().trim(), role: 'STUDENT', studentId, isIndependent: true,
      };
      const token = `jwt_dyn_${Date.now()}`;
      this.setToken(token);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      return { user: newUser, token, studentId };
    },

    logout: async () => {
      try {
        await this.request('POST', '/auth/logout');
      } catch {
        // Token may already be invalid — clear local state regardless
      }
      this.setToken(null);
    },

    me: async () => {
      try {
        return await this.request<{ user: any; studentId?: string }>('GET', '/auth/me');
      } catch {
        const saved = localStorage.getItem('auth_user');
        if (saved) {
          const u = JSON.parse(saved);
          return { user: u, studentId: u.studentId || 'stu-21cs1084' };
        }
        return {
          user: {
            id: 'usr_guest',
            name: 'Aravind Kumar',
            email: 'aravind.k@college.edu',
            role: 'STUDENT',
          },
          studentId: 'stu-21cs1084',
        };
      }
    },
  };

  // ── ORG (public, no auth required — used for registration dropdowns) ────────

  org = {
    getInstitutions: async (): Promise<any[]> => {
      const data = await this.apiFetch<{ items: any[] }>('/api/org/institutions');
      return data.items;
    },

    getPrograms: async (institutionId?: string): Promise<any[]> => {
      const qs = institutionId ? `?institution_id=${encodeURIComponent(institutionId)}` : '';
      const data = await this.apiFetch<{ items: any[] }>(`/api/org/programs${qs}`);
      return data.items;
    },

    getBatches: async (programId?: string): Promise<any[]> => {
      const qs = programId ? `?program_id=${encodeURIComponent(programId)}` : '';
      const data = await this.apiFetch<{ items: any[] }>(`/api/org/batches${qs}`);
      return data.items;
    },

    getSubdivisions: async (batchId?: string): Promise<any[]> => {
      const qs = batchId ? `?batch_id=${encodeURIComponent(batchId)}` : '';
      const data = await this.apiFetch<{ items: any[] }>(`/api/org/subdivisions${qs}`);
      return data.items;
    },
  };

  // ── STUDENT PROFILE ───────────────────────────────────────────────────────────

  student = {
    getProfile: async (studentId: string): Promise<StudentProfile> => {
      // Don't try backend for obviously local/mock IDs
      if (studentId && !studentId.startsWith('stu-') && !/^usr_/.test(studentId)) {
        try {
          const [studentResult, checklistResult] = await Promise.allSettled([
            this.request<{ student: any }>('GET', `/students/${studentId}`),
            this.request<{ items: any[] }>('GET', '/checklist/my-progress'),
          ]);

          const s =
            studentResult.status === 'fulfilled' ? studentResult.value.student : null;
          const items =
            checklistResult.status === 'fulfilled' ? checklistResult.value.items : [];

          if (s) {
            const cachedUser = (() => {
              try {
                return JSON.parse(localStorage.getItem('auth_user') || '{}');
              } catch {
                return {};
              }
            })();

            const criteriaTasks =
              items.length > 0
                ? items.map((item: any) => ({
                    id: item.id as string,
                    title: item.name as string,
                    description: (item.description as string) || '',
                    targetTrack: 'ALL' as const,
                    isCompleted: item.status === 'COMPLETED',
                    verifiedByMentor: (item.is_mentor_verified as boolean) || false,
                    verifiedAt: item.completed_at
                      ? (item.completed_at as string).split('T')[0]
                      : undefined,
                  }))
                : INITIAL_CRITERIA_TASKS.map(t => ({
                    ...t,
                    isCompleted: false,
                    verifiedByMentor: false,
                  }));

            return {
              id: s.id as string,
              name: s.name as string,
              rollNumber: (s.roll_number as string) || cachedUser.rollNumber || 'N/A',
              email: s.email as string,
              department: cachedUser.department || 'Computer Science & Engineering',
              batchYear: cachedUser.batchYear || 2026,
              track: cachedUser.track || 'HOPE_ELITE',
              mentorName: 'Assigned Mentor',
              mentorEmail: '',
              codingHandles: (s.coding_handles as CodingHandles) || {},
              resume: null,
              criteriaTasks,
              recentReports: [],
            };
          }
        } catch {
          /* fall through */
        }
      }
      return this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
    },

    updateProfile: async (
      studentId: string,
      updates: Partial<StudentProfile>,
    ): Promise<StudentProfile> => {
      if (updates.codingHandles && studentId && !studentId.startsWith('stu-')) {
        try {
          await this.request('PATCH', `/students/${studentId}`, {
            codingHandles: updates.codingHandles,
          });
        } catch {
          /* offline */
        }
      }
      const current = this.getStorage<StudentProfile>(
        'student_profile',
        INITIAL_STUDENT_PROFILE,
      );
      const updated = { ...current, ...updates };
      this.setStorage('student_profile', updated);
      return updated;
    },

    updateCodingHandles: async (studentId: string, handles: CodingHandles): Promise<void> => {
      if (studentId && !studentId.startsWith('stu-') && !/^usr_/.test(studentId)) {
        try {
          await this.request('PATCH', `/students/${studentId}`, { codingHandles: handles });
          return;
        } catch {
          /* offline fallback */
        }
      }
      const current = this.getStorage<StudentProfile>(
        'student_profile',
        INITIAL_STUDENT_PROFILE,
      );
      current.codingHandles = { ...current.codingHandles, ...handles };
      this.setStorage('student_profile', current);
    },

    uploadResume: async (
      _studentId: string,
      payload: FormData | { resumeText: string; fileName?: string } | ParsedResume,
    ): Promise<ParsedResume> => {
      let parsed: ParsedResume;
      if ('skills' in payload && 'projects' in payload) {
        parsed = payload as ParsedResume;
      } else {
        parsed = {
          fileName: (payload as any)?.fileName || 'Resume_Extracted.pdf',
          parsedAt: new Date().toISOString().split('T')[0],
          summary:
            'Software Engineer with experience in Java, Spring Boot, Kafka, PostgreSQL, and scalable distributed systems.',
          skills: {
            languages: ['Java', 'TypeScript', 'SQL', 'Python'],
            frameworks: ['Spring Boot', 'React', 'Tailwind CSS'],
            databases: ['PostgreSQL', 'Redis'],
            tools: ['Git', 'Docker', 'Kafka'],
          },
          projects: [
            {
              title: 'High-Throughput Order Ledger Service',
              description:
                'Built distributed transactional ledger using Kafka consumer partitions and Redis locks.',
              techStack: ['Java', 'Spring Boot', 'Kafka', 'Redis'],
            },
          ],
        };
      }
      const current = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      current.resume = parsed;
      this.setStorage('student_profile', current);
      return parsed;
    },
  };

  // ── TASKS (Checklist) ─────────────────────────────────────────────────────────

  tasks = {
    toggleTask: async (_studentId: string, taskId: string): Promise<boolean> => {
      // Backend if taskId is a UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(taskId)) {
        const current = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
        const task = current.criteriaTasks.find(t => t.id === taskId);
        const newStatus: string = task?.isCompleted ? 'PENDING' : 'COMPLETED';
        try {
          await this.request('POST', `/checklist/${taskId}/toggle`, { status: newStatus });
          return newStatus === 'COMPLETED';
        } catch {
          /* offline fallback */
        }
      }
      // Local fallback
      const current = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      let isCompleted = false;
      current.criteriaTasks = current.criteriaTasks.map(t => {
        if (t.id === taskId) {
          isCompleted = !t.isCompleted;
          return { ...t, isCompleted };
        }
        return t;
      });
      this.setStorage('student_profile', current);
      return isCompleted;
    },

    verifyTask: async (_studentId: string, taskId: string): Promise<void> => {
      // Try to find and approve a pending verification for this checklist item
      try {
        const res = await this.request<{ verifications: any[] }>('GET', '/verifications/pending');
        const vf = (res.verifications || []).find((v: any) => v.checklist_item_id === taskId);
        if (vf) {
          await this.request('POST', `/verifications/${vf.id}/verify`, { outcome: 'VERIFIED' });
          return;
        }
      } catch {
        /* fall through */
      }
      // Local fallback
      const current = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      current.criteriaTasks = current.criteriaTasks.map(t =>
        t.id === taskId
          ? { ...t, verifiedByMentor: true, verifiedAt: new Date().toISOString().split('T')[0] }
          : t,
      );
      this.setStorage('student_profile', current);
    },
  };

  // ── INTERVIEW ROOM ────────────────────────────────────────────────────────────

  interview = {
    start: async (
      studentId: string,
      type: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION' | 'PRACTICE' = 'MOCK_INTERVIEW',
    ): Promise<{ sessionId: string; firstQuestion: QuestionTurn }> => {
      // Attempt full backend flow
      try {
        const { assessments } = await this.request<{ assessments: any[] }>('GET', '/assessments');
        const assessment = (assessments || []).find(
          (a: any) => a.assessment_type === 'MOCK_INTERVIEW' && a.is_active,
        );
        if (!assessment) throw new Error('No active MOCK_INTERVIEW assessment found');

        const attemptRes = await this.request<{ attemptId: string }>('POST', '/attempts/start', {
          assessmentId: assessment.id,
        });

        const sessionRes = await this.request<{
          sessionId: string;
          firstQuestion: { questionId: string; questionText: string; difficulty: string };
        }>('POST', '/sessions/start', {
          attemptId: attemptRes.attemptId,
          sessionType: type,
        });

        const fq = sessionRes.firstQuestion;
        const firstQuestion: QuestionTurn = {
          id: fq.questionId,
          questionNumber: 1,
          questionText: fq.questionText,
          difficulty: fq.difficulty as Difficulty,
          category: 'Technical Interview',
        };

        this.setStorage<SessionCache>(SESSION_KEY, {
          attemptId: attemptRes.attemptId,
          sessionId: sessionRes.sessionId,
          questionId: fq.questionId,
          turnIndex: 0,
          backendMode: true,
          sessionType: type,
          questions: [firstQuestion],
          tabSwitches: 0,
        });

        return { sessionId: sessionRes.sessionId, firstQuestion };
      } catch {
        return this.startLocalSession(type);
      }
    },

    recordProctorEvent: async (
      sessionId: string,
      _eventType: 'TAB_SWITCH' | 'FULLSCREEN_EXIT',
    ) => {
      const sess = this.getStorage<SessionCache | null>(SESSION_KEY, null);
      const localCount = (sess?.tabSwitches || 0) + 1;

      if (sess?.backendMode && sess?.sessionId === sessionId) {
        try {
          const res = await this.request<any>(
            'POST',
            `/sessions/${sessionId}/proctor-event`,
            { eventType: 'TAB_SWITCH', timestamp: new Date().toISOString() },
          );
          if (sess) {
            sess.tabSwitches = res.tabSwitchCount ?? localCount;
            this.setStorage(SESSION_KEY, sess);
          }
          return {
            tabSwitches: res.tabSwitchCount ?? localCount,
            isFlagged: res.isFlagged ?? localCount >= 4,
          };
        } catch {
          /* fall through */
        }
      }

      if (sess) {
        sess.tabSwitches = localCount;
        this.setStorage(SESSION_KEY, sess);
      }
      return { tabSwitches: localCount, isFlagged: localCount >= 4 };
    },

    submitAnswer: async (sessionId: string, studentAnswer: string, durationSeconds = 20) => {
      const sess = this.getStorage<SessionCache | null>(SESSION_KEY, null);
      const isBackend = !!(sess?.sessionId === sessionId && sess?.backendMode && sess?.attemptId);
      const turnIndex = sess?.turnIndex ?? 0;
      const currentQ = sess?.questions[turnIndex];

      // Client-side metrics
      const words = studentAnswer.trim().split(/\s+/).filter(Boolean);
      const calcWpm = Math.max(
        90,
        Math.min(160, Math.round((words.length / Math.max(durationSeconds, 8)) * 60)),
      );
      const lower = studentAnswer.toLowerCase();
      const fillers: Record<string, number> = {};
      ['uh', 'um', 'like', 'basically', 'actually'].forEach(f => {
        const m = lower.match(new RegExp(`\\b${f}\\b`, 'g'));
        if (m) fillers[f] = m.length;
      });
      const totalFillers = Object.values(fillers).reduce((a, b) => a + b, 0);

      // Start with sensible defaults
      let technicalScore = 84;
      let communicationScore = 80;
      let feedback = 'Clear technical articulation with good awareness of system tradeoffs.';
      let strengths = 'Good structural explanation and confident terminology.';
      let weaknesses = 'Can elaborate more on edge-case failure mitigation.';

      // Groq evaluation for immediate UI feedback
      const groqKey = localStorage.getItem('groq_api_key');
      if (groqKey && studentAnswer.length > 10) {
        try {
          const sys = `You are a technical interview evaluator. Return ONLY a JSON object:
{"technical_score": 88, "communication_score": 82, "feedback": "...", "strengths": "...", "weaknesses": "..."}`;
          const raw = await callGroqDirect(
            groqKey,
            sys,
            `Question: "${currentQ?.questionText || 'Technical Question'}"\nAnswer: "${studentAnswer}"`,
          );
          const m = raw.match(/\{[\s\S]*\}/);
          if (m) {
            const ev = JSON.parse(m[0]);
            if (ev.technical_score) technicalScore = ev.technical_score;
            if (ev.communication_score) communicationScore = ev.communication_score;
            if (ev.feedback) feedback = ev.feedback;
            if (ev.strengths) strengths = ev.strengths;
            if (ev.weaknesses) weaknesses = ev.weaknesses;
          }
        } catch {
          /* use defaults */
        }
      }

      // Backend submit for persistence + adaptive next question
      let backendNextQ: { questionId: string; questionText: string; difficulty: string } | null =
        null;
      let backendSessionDone = false;

      if (isBackend && sess?.questionId) {
        try {
          const submitRes = await this.request<any>('POST', '/responses/submit', {
            attemptId: sess.attemptId,
            questionId: sess.questionId,
            transcript: studentAnswer,
            inputType: 'TEXT',
            durationSec: Math.round(durationSeconds),
          });
          backendNextQ = submitRes.nextQuestion || null;
          // Session over when backend returns no next question AND we've done ≥1 turn
          backendSessionDone = !backendNextQ;

          // Use backend AI scores if they are non-zero (AI was reachable)
          if (submitRes.technicalScore && submitRes.technicalScore > 0) {
            technicalScore = submitRes.technicalScore;
            communicationScore = submitRes.communicationScore || communicationScore;
            if (submitRes.feedback) feedback = submitRes.feedback;
          }
        } catch (err: any) {
          if (err.status !== 503) {
            console.warn('[api.interview.submitAnswer] Backend submit failed:', err.message);
          }
        }
      }

      const turnEvaluation: QuestionTurn = {
        id: currentQ?.id || `q_${turnIndex + 1}`,
        questionNumber: turnIndex + 1,
        questionText: currentQ?.questionText || '',
        difficulty: currentQ?.difficulty || 'EASY',
        studentAnswer,
        technicalScore,
        communicationScore,
        wpm: calcWpm,
        fillerWords: totalFillers,
        feedback,
        strengths,
        weaknesses,
      };

      // Update accumulated questions
      const updatedQuestions = sess ? [...sess.questions] : [turnEvaluation];
      if (sess) updatedQuestions[turnIndex] = turnEvaluation;

      const isCompleted = backendSessionDone || (!isBackend && turnIndex >= 2);

      if (isCompleted) {
        let finalReport: DiagnosticReport;
        if (isBackend && sess?.sessionId && sess?.attemptId) {
          try {
            await this.request('POST', `/sessions/${sess.sessionId}/complete`, {});
            const reportRes = await this.request<{ report: any }>(
              'GET',
              `/reports/${sess.attemptId}`,
            );
            finalReport = this.mapBackendReport(reportRes.report, sess.tabSwitches);
          } catch {
            finalReport = this.buildLocalReport(
              updatedQuestions,
              sess?.tabSwitches || 0,
              sess?.sessionType || 'MOCK_INTERVIEW',
              fillers,
            );
          }
        } else {
          finalReport = this.buildLocalReport(
            updatedQuestions,
            sess?.tabSwitches || 0,
            sess?.sessionType || 'MOCK_INTERVIEW',
            fillers,
          );
        }

        localStorage.removeItem(SESSION_KEY);
        return { isCompleted: true, turnEvaluation, nextQuestion: undefined, finalReport };
      }

      // Session continues — determine next question
      const nextDiff: Difficulty = turnIndex === 0 ? 'MEDIUM' : 'ADVANCED';
      const fallbackTexts = [
        'How did you manage database connection pooling and PostgreSQL index strategy to support horizontal scaling under heavy query load?',
        'In the event of a network partition where multiple microservice nodes attempt conflicting updates, how would you maintain data consistency without sacrificing latency?',
      ];

      let nextQuestion: QuestionTurn;
      if (backendNextQ) {
        nextQuestion = {
          id: backendNextQ.questionId,
          questionNumber: turnIndex + 2,
          questionText: backendNextQ.questionText,
          difficulty: backendNextQ.difficulty as Difficulty,
          category: 'Technical Interview',
        };
      } else {
        nextQuestion = {
          id: `q_${turnIndex + 2}_${Date.now()}`,
          questionNumber: turnIndex + 2,
          questionText:
            fallbackTexts[turnIndex] ||
            'Describe your approach to designing a highly available distributed system.',
          difficulty: nextDiff,
          category: 'Scalability',
        };

        // Try bank-fallback for backend sessions
        if (isBackend && sess?.sessionId) {
          try {
            const bankRes = await this.request<any>(
              'GET',
              `/sessions/bank-fallback?sessionId=${sess.sessionId}&difficulty=${nextDiff}`,
            );
            if (bankRes.questionText) {
              nextQuestion = {
                id: bankRes.questionId || nextQuestion.id,
                questionNumber: turnIndex + 2,
                questionText: bankRes.questionText,
                difficulty: (bankRes.difficulty as Difficulty) || nextDiff,
                category: 'Technical Interview',
              };
            }
          } catch {
            /* use local fallback */
          }
        }
      }

      // Persist updated session
      if (sess) {
        const newQuestionId: string | null =
          backendNextQ?.questionId ||
          (/^[0-9a-f]{8}-/i.test(nextQuestion.id) ? nextQuestion.id : null);
        this.setStorage<SessionCache>(SESSION_KEY, {
          ...sess,
          turnIndex: turnIndex + 1,
          questions: [...updatedQuestions, nextQuestion],
          questionId: newQuestionId,
        });
      }

      return { isCompleted: false, turnEvaluation, nextQuestion, finalReport: undefined };
    },

    finalize: async (sessionId: string): Promise<DiagnosticReport | null> => {
      const sess = this.getStorage<SessionCache | null>(SESSION_KEY, null);
      if (sess?.sessionId === sessionId && sess?.backendMode && sess?.attemptId) {
        try {
          await this.request('POST', `/sessions/${sessionId}/complete`, {});
          const reportRes = await this.request<{ report: any }>('GET', `/reports/${sess.attemptId}`);
          localStorage.removeItem(SESSION_KEY);
          return this.mapBackendReport(reportRes.report, sess.tabSwitches);
        } catch {
          /* fall through */
        }
      }
      const questions = sess?.questions || [];
      const report = this.buildLocalReport(
        questions,
        sess?.tabSwitches || 0,
        sess?.sessionType || 'MOCK_INTERVIEW',
      );
      localStorage.removeItem(SESSION_KEY);
      return report;
    },

    getReport: async (_sessionId: string): Promise<DiagnosticReport> => {
      const student = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      return (
        student.recentReports[0] || {
          id: 'rep-init',
          date: new Date().toISOString().split('T')[0],
          sessionType: 'MOCK_INTERVIEW',
          overallScore: 85,
          technicalScore: 86,
          communicationScore: 84,
          averageWpm: 128,
          totalFillerWords: 3,
          fillerWordBreakdown: { uh: 1, like: 2 },
          skillBreakdown: [
            { skill: 'Core Java', score: 90, status: 'STRONG', recommendation: 'Great OOP depth' },
          ],
          actionableNextSteps: ['Continue mock interviews'],
          tabSwitches: 0,
          isFlagged: false,
        }
      );
    },
  };

  // ── LISTENING COMPREHENSION (M3 — keep as UI-only) ───────────────────────────

  listening = {
    start: async (_studentId: string) => ({
      sessionId: `lis_${Date.now()}`,
      passage: LISTENING_PASSAGE,
      replaysUsed: 0,
      maxReplays: 2,
    }),

    recordReplay: async (sessionId: string) => {
      const sess = this.getStorage<any>(`listening_${sessionId}`, { replaysUsed: 0 });
      sess.replaysUsed = (sess.replaysUsed || 0) + 1;
      this.setStorage(`listening_${sessionId}`, sess);
      return { replaysUsed: sess.replaysUsed };
    },

    submitAnswers: async (_sessionId: string, answers: any[]) => {
      const overallScore = 88;
      const evaluations = answers.map((ans, idx) => ({
        questionIndex: idx,
        studentAnswer: ans,
        score: 88,
        feedback: 'Accurately captured key architectural requirements from the technical passage.',
      }));
      const finalReport: import('../types').DiagnosticReport = {
        id: `lr_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        sessionType: 'LISTENING_COMPREHENSION',
        overallScore,
        technicalScore: overallScore,
        communicationScore: overallScore,
        averageWpm: 0,
        totalFillerWords: 0,
        fillerWordBreakdown: {},
        skillBreakdown: [
          { skill: 'Comprehension', score: overallScore, status: 'STRONG', recommendation: 'Keep practising active listening.' },
        ],
        actionableNextSteps: ['Review passage vocabulary', 'Attempt a harder passage next session'],
        tabSwitches: 0,
        isFlagged: false,
      };
      return { overallScore, evaluations, finalReport };
    },
  };

  // ── SUGGESTION CHATBOT ────────────────────────────────────────────────────────

  suggestions = {
    getOrCreateSession: async (_studentId = 'stu-101'): Promise<string> =>
      `sug_${Date.now()}`,

    getHistory: async (sessionId: string) =>
      this.getStorage<any[]>(`sug_hist_${sessionId}`, []),

    sendMessage: async (sessionId: string, message: string) => {
      const groqKey = localStorage.getItem('groq_api_key');
      let assistantReply =
        'To improve your answer, focus on articulating the exact trade-offs. Mention latency vs consistency, and explain why your chosen approach was the best fit.';
      let technicalTerms = [
        {
          term: 'Event-driven Architecture',
          definition:
            'A software architecture pattern promoting the production and consumption of state changes as events.',
          betterAlternativeTo: 'Publishing messages back and forth',
        },
        {
          term: 'Idempotency',
          definition:
            'An operation that produces the same result no matter how many times it is executed.',
          betterAlternativeTo: 'Making sure we do not duplicate things',
        },
      ];
      let commSuggestions = [
        'Lead with your high-level thesis in the first 10 seconds before diving into code details.',
        'Use transition phrases like "Furthermore" or "From a resilience perspective" instead of "also".',
      ];
      let structuralAdvice = [
        'Framework: Problem Statement → Technical Solution → Verified Metric (e.g. 40% latency reduction).',
      ];

      if (groqKey) {
        try {
          const sys = `You are an executive communication and technical interview coach. Return JSON:
{"reply": "...", "terms": [{"term": "...", "definition": "...", "betterAlternativeTo": "..."}], "suggestions": ["..."], "structural": ["..."]}`;
          const raw = await callGroqDirect(groqKey, sys, message);
          const m = raw.match(/\{[\s\S]*\}/);
          if (m) {
            const p = JSON.parse(m[0]);
            if (p.reply) assistantReply = p.reply;
            if (p.terms) technicalTerms = p.terms;
            if (p.suggestions) commSuggestions = p.suggestions;
            if (p.structural) structuralAdvice = p.structural;
          }
        } catch {
          /* use defaults */
        }
      }

      const userMsg = {
        id: `msg_${Date.now()}_u`,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      };
      const assistantMsg = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant' as const,
        content: assistantReply,
        technicalTerminology: technicalTerms,
        communicationSuggestions: commSuggestions,
        structuralAdvice,
        createdAt: new Date().toISOString(),
      };

      const hist = this.getStorage<any[]>(`sug_hist_${sessionId}`, []);
      hist.push(userMsg, assistantMsg);
      this.setStorage(`sug_hist_${sessionId}`, hist);
      return { userMessage: userMsg, assistantMessage: assistantMsg };
    },
  };

  // ── ADMIN PORTALS ─────────────────────────────────────────────────────────────

  admin = {
    getCoordinatorStats: async () => {
      try {
        const res = await this.request<any>('GET', '/placement-eligibility/report');
        const items: any[] = res.items || [];
        const total: number = res.total || items.length || 240;
        const eligible = items.filter((s: any) => s.is_eligible).length;
        return {
          totalCandidates: total,
          hopeEliteCount: items.filter((s: any) => s.track === 'HOPE_ELITE').length || 42,
          pepDomainsCount: 21,
          placementReadyRate: total > 0 ? Math.round((eligible / total) * 100) : 88,
          departmentStreamCount: 65,
          hopeGeneralCount: items.filter((s: any) => s.track === 'HOPE_NON_ELITE').length || 78,
          pepTotalCount: items.filter((s: any) => s.track === 'PEP').length || 97,
        };
      } catch {
        return {
          totalCandidates: 240,
          hopeEliteCount: 42,
          pepDomainsCount: 21,
          placementReadyRate: 88,
          departmentStreamCount: 65,
          hopeGeneralCount: 78,
          pepTotalCount: 97,
        };
      }
    },

    getSystemStats: async () => {
      try {
        const res = await this.request<{ users: any[] }>('GET', '/admin/users');
        const users = res.users || [];
        return {
          programAdminsCount: users.filter((u: any) => u.role === 'PROGRAM_ADMIN').length || 8,
          facultyMentorsCount: users.filter((u: any) => u.role === 'FACULTY_MENTOR').length || 24,
          trainersCount: users.filter((u: any) => u.role === 'TRAINER').length || 12,
          studentsCount: users.filter((u: any) => u.role === 'STUDENT').length || 320,
        };
      } catch {
        return {
          programAdminsCount: 8,
          facultyMentorsCount: 24,
          trainersCount: 12,
          studentsCount: 320,
        };
      }
    },

    getProgramAdmins: async (): Promise<any[]> => {
      try {
        const res = await this.request<{ users: any[] }>('GET', '/admin/users');
        const admins = (res.users || []).filter((u: any) => u.role === 'PROGRAM_ADMIN');
        if (admins.length > 0) return admins;
      } catch {
        /* fall through */
      }
      return this.getStorage<any[]>('admin_program_admins', [
        {
          id: 'pa-1',
          name: 'Dr. K. Swaminathan',
          email: 'swaminathan@college.edu',
          track: 'HOPE_ELITE',
          department: 'CSE',
          createdAt: '2026-01-10',
        },
        {
          id: 'pa-2',
          name: 'Prof. Meera Deshmukh',
          email: 'meera.d@college.edu',
          track: 'PEP',
          department: 'ECE',
          createdAt: '2026-02-15',
        },
      ]);
    },

    createProgramAdmin: async (data: { name: string; email: string; password?: string }) => {
      // Backend doesn't support creating non-STUDENT roles via register.
      // Store locally; role change would require a separate admin action.
      const admins = this.getStorage<any[]>('admin_program_admins', []);
      const newAdmin = {
        id: `pa_${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString().split('T')[0],
      };
      admins.push(newAdmin);
      this.setStorage('admin_program_admins', admins);
      return newAdmin;
    },

    getFacultyMentors: async (): Promise<any[]> => {
      try {
        const res = await this.request<{ users: any[] }>('GET', '/admin/users');
        const mentors = (res.users || []).filter((u: any) => u.role === 'FACULTY_MENTOR');
        if (mentors.length > 0) return mentors;
      } catch {
        /* fall through */
      }
      return this.getStorage<any[]>('admin_faculty_mentors', [
        {
          id: 'fm-1',
          name: 'Dr. Ananya Sharma',
          email: 'ananya.sharma@college.edu',
          department: 'CSE',
          assignedMenteesCount: 24,
        },
        {
          id: 'fm-2',
          name: 'Prof. R. Venkatesh',
          email: 'venkatesh.r@college.edu',
          department: 'IT',
          assignedMenteesCount: 22,
        },
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
      try {
        await this.request('POST', '/mentors/assign', { studentId, mentorId });
        return { message: 'Mentor assigned successfully' };
      } catch {
        const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
        this.setStorage(
          'admin_students',
          students.map(s => (s.id === studentId ? { ...s, mentorId } : s)),
        );
        return { message: 'Mentor assigned (offline)' };
      }
    },

    createStudent: async (data: any) => {
      try {
        const batchId = data.batchId || (await this.fetchFirstBatchId());
        if (!batchId) throw new Error('No batch available');
        const rollNumber = data.rollNumber || `STU-${Date.now().toString().slice(-6)}`;
        const res = await this.request<any>(
          'POST',
          '/auth/register',
          {
            name: data.name,
            email: data.email,
            password: data.password || 'Student@123',
            rollNumber,
            batchId,
          },
          { noAuth: true },
        );
        return res.user || { id: `stu_${Date.now()}`, ...data };
      } catch {
        const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
        const newStudent = { id: `stu_${Date.now()}`, ...data };
        students.push(newStudent);
        this.setStorage('admin_students', students);
        return newStudent;
      }
    },

    createStudentByMentor: async (data: any) => {
      return this.admin.createStudent(data);
    },

    deleteUser: async (userId: string) => {
      try {
        await this.request('PATCH', `/admin/users/${userId}/status`, { status: 'SUSPENDED' });
        return { success: true, message: 'User deactivated' };
      } catch {
        const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST).filter(
          s => s.id !== userId,
        );
        this.setStorage('admin_students', students);
        return { success: true, message: 'User removed (offline)' };
      }
    },

    getStudentFullHistory: async (studentIdOrUserId: string) => {
      try {
        const [studentResult, checklistResult] = await Promise.allSettled([
          this.request<{ student: any }>('GET', `/students/${studentIdOrUserId}`),
          this.request<{ items: any[] }>('GET', `/checklist/mentee/${studentIdOrUserId}`),
        ]);

        const s =
          studentResult.status === 'fulfilled' ? studentResult.value.student : null;
        const checklistItems =
          checklistResult.status === 'fulfilled' ? checklistResult.value.items : [];

        if (!s) return this.buildLocalStudentHistory(studentIdOrUserId);

        return {
          student: {
            name: s.name,
            track: 'HOPE_ELITE',
            roll_number: s.roll_number || 'N/A',
            department: 'Computer Science & Engineering',
            batch_year: 2026,
            mentor_name: 'Assigned Mentor',
            leetcode_solved: (s.coding_handles as any)?.leetcodeSolved || 0,
            github_repos: (s.coding_handles as any)?.githubRepos || 0,
          },
          resume: null,
          checklist: checklistItems.map((item: any) => ({
            id: item.id,
            title: item.name,
            description: item.description || '',
            is_completed: item.status === 'COMPLETED',
            verified_by_mentor: item.is_mentor_verified || false,
          })),
          interviewSessions: [],
        };
      } catch {
        return this.buildLocalStudentHistory(studentIdOrUserId);
      }
    },

    getStudents: async (params: { cohort?: string; search?: string } = {}) => {
      try {
        const res = await this.request<{ users: any[] }>('GET', '/admin/users');
        let list = (res.users || []).filter((u: any) => u.role === 'STUDENT');
        if (params.search) {
          const s = params.search.toLowerCase();
          list = list.filter(
            (u: any) =>
              u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s),
          );
        }
        if (list.length > 0) return list;
      } catch {
        /* fall through */
      }
      let list = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      if (params.search) {
        const s = params.search.toLowerCase();
        list = list.filter(
          (u: any) =>
            (u.name || '').toLowerCase().includes(s) ||
            (u.rollNumber || '').toLowerCase().includes(s),
        );
      }
      return list;
    },

    getMentorMentees: async (_mentorId?: string) => {
      try {
        const res = await this.request<{ students: any[] }>('GET', '/mentors/my-students');
        if ((res.students || []).length > 0) return res.students;
      } catch {
        /* fall through */
      }
      return this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
    },

    getTrainerTenures: async (): Promise<TrainerTenure[]> => {
      try {
        const res = await this.request<{ subdivisions: any[] }>('GET', '/trainers/my-subdivisions');
        const subs = res.subdivisions || [];
        if (subs.length > 0) {
          return subs.map((s: any) => ({
            id: s.id || `ten_${Date.now()}`,
            trainerName: s.trainer_name || 'Trainer',
            trainerEmail: s.trainer_email || '',
            companyOrInstitute: s.company || 'Institute',
            domain: s.domain || 'General',
            startDate:
              s.start_date || new Date().toISOString().split('T')[0],
            endDate:
              s.end_date ||
              new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
            isActive: s.is_active ?? true,
          }));
        }
      } catch {
        /* fall through */
      }
      return this.getStorage<TrainerTenure[]>('trainer_tenures', MOCK_TRAINER_TENURES);
    },

    onboardTrainer: async (trainer: Omit<TrainerTenure, 'id' | 'isActive'>): Promise<TrainerTenure> => {
      try {
        const usersRes = await this.request<{ users: any[] }>('GET', '/admin/users');
        const trainerUser = (usersRes.users || []).find(
          (u: any) => u.email === trainer.trainerEmail && u.role === 'TRAINER',
        );
        if (trainerUser) {
          const orgRes = await this.request<{ items: any[] }>(
            'GET',
            '/org/subdivisions',
            undefined,
            { noAuth: true },
          ).catch(() => ({ items: [] }));
          const subdivisions = orgRes.items || [];
          if (subdivisions.length > 0) {
            await this.request('POST', '/trainers/assign', {
              trainerId: trainerUser.id,
              subdivisionId: subdivisions[0].id,
              startDate: trainer.startDate,
              endDate: trainer.endDate,
            });
          }
        }
      } catch {
        /* fall through */
      }
      const tenures = this.getStorage<TrainerTenure[]>('trainer_tenures', MOCK_TRAINER_TENURES);
      const newT: TrainerTenure = { id: `ten_${Date.now()}`, ...trainer, isActive: true };
      tenures.push(newT);
      this.setStorage('trainer_tenures', tenures);
      return newT;
    },

    revokeTrainer: async (id: string): Promise<void> => {
      const tenures = this.getStorage<TrainerTenure[]>('trainer_tenures', MOCK_TRAINER_TENURES);
      this.setStorage(
        'trainer_tenures',
        tenures.map(t => (t.id === id ? { ...t, isActive: false } : t)),
      );
    },

    getAssignments: async (collegeId?: string): Promise<InterviewAssignment[]> => {
      const list = this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
      if (collegeId) return list.filter((a: any) => !a.collegeId || a.collegeId === collegeId);
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
        domainOrTopic: asg.domainOrTopic,
        difficulty: asg.difficulty || 'MEDIUM',
        listeningPassageId: asg.listeningPassageId,
        customInstructions: asg.customInstructions,
        dueDate: asg.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        isMandatory: asg.isMandatory ?? true,
        createdAt: new Date().toISOString(),
        submissions: [],
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
        if (subIdx !== -1) list[idx].submissions![subIdx] = submission;
        else list[idx].submissions!.push(submission);
        this.setStorage('assignments', list);
        return { success: true, assignment: list[idx] };
      }
      throw new Error('Assignment not found');
    },

    deleteAssignment: async (assignmentId: string): Promise<boolean> => {
      const list = this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS).filter(a => a.id !== assignmentId);
      this.setStorage('assignments', list);
      return true;
    },

    getStudentAssignments: async (student: any): Promise<InterviewAssignment[]> => {
      const list = this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
      return list.filter(a => {
        if (a.targetScope === 'ALL_STUDENTS') return true;
        if (a.targetScope === 'SPECIFIC_STUDENT') return a.targetStudentId === student.id || a.targetStudentName === student.name;
        if (a.targetScope === 'MY_MENTEES') return Boolean(student.mentorName || student.mentorEmail);
        if (a.targetScope === 'PROGRAM') return student.programName === a.targetProgramName || student.track === a.targetProgramName;
        if (a.targetScope === 'DEPARTMENT') return student.department === a.targetDepartment;
        return true;
      });
    },

    getCollegePrograms: async (collegeId = 'col-1'): Promise<DynamicProgram[]> => {
      return this.college.getPrograms(collegeId);
    },

    getPepDomains: async (): Promise<string[]> => PEP_DOMAINS,
  };

  // ── PLATFORM OWNER ────────────────────────────────────────────────────────
  owner = {
    getColleges: async (): Promise<College[]> => {
      try {
        const res = await this.request<College[]>('GET', '/colleges');
        if (Array.isArray(res)) return res;
      } catch { /* fall through */ }
      return this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
    },

    createCollege: async (data: { name: string; code: string; campusCity: string }): Promise<College> => {
      try {
        const res = await this.request<College>('POST', '/colleges', {
          name: data.name, code: data.code, campusCity: data.campusCity,
        });
        if (res?.id) return res;
      } catch { /* fall through */ }
      const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
      const newCollege: College = {
        id: `col-${Date.now()}`, name: data.name, code: data.code.toUpperCase(),
        campusCity: data.campusCity, createdAt: new Date().toISOString(), superAdminStatus: undefined,
      };
      colleges.push(newCollege);
      this.setStorage('platform_colleges', colleges);
      return newCollege;
    },

    inviteSuperAdmin: async (collegeId: string, data: { firstName: string; lastName: string; email: string }): Promise<{ invite: PendingInvite; inviteUrl: string }> => {
      try {
        const res = await this.request<{ invite: PendingInvite; inviteUrl: string }>(
          'POST', `/colleges/${collegeId}/invite-super-admin`, data
        );
        if (res?.invite?.token) {
          return {
            invite: res.invite,
            inviteUrl: `${window.location.origin}${res.inviteUrl}`,
          };
        }
      } catch { /* fall through */ }
      // Mock fallback
      const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
      const college = colleges.find(c => c.id === collegeId) || colleges[0];
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      const token = `inv_sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const invite: PendingInvite = {
        token, email: data.email.toLowerCase().trim(), firstName: data.firstName, lastName: data.lastName,
        name: fullName, role: 'SUPER_ADMIN', collegeId: college.id, collegeName: college.name,
        permissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_ASSIGN_LISTENING', 'CAN_ASSIGN_TRAINERS', 'CAN_MANAGE_STUDENTS', 'CAN_ASSIGN_SUB_ADMINS'],
        createdAt: new Date().toISOString(), status: 'PENDING',
      };
      const pendingInvites = this.getStorage<PendingInvite[]>('platform_pending_invites', []);
      pendingInvites.push(invite);
      this.setStorage('platform_pending_invites', pendingInvites);
      const inviteUrl = `${window.location.origin}/?invite_token=${token}`;
      return { invite, inviteUrl };
    },

    getStats: async () => {
      try {
        const res = await this.request<{ totalColleges: number; activeSuperAdmins: number }>(
          'GET', '/colleges/stats/overview'
        );
        if (res && typeof res.totalColleges === 'number') {
          // totalStudents and totalPrograms are not in the backend yet — supplement with mock
          const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
          const programs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
          return {
            totalColleges: res.totalColleges,
            activeSuperAdmins: res.activeSuperAdmins,
            totalStudents: students.length || 240,
            totalPrograms: programs.length || 3,
          };
        }
      } catch { /* fall through */ }
      const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const programs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      return {
        totalColleges: colleges.length,
        activeSuperAdmins: colleges.filter(c => c.superAdminStatus === 'ACTIVE').length || 2,
        totalStudents: students.length || 240,
        totalPrograms: programs.length || 3,
      };
    },
  };

  // ── COLLEGE / PROGRAM MANAGEMENT ─────────────────────────────────────────
  college = {
    getDetails: async (collegeId = 'col-1'): Promise<College> => {
      try {
        const res = await this.request<College>('GET', `/colleges/${collegeId}`);
        if (res?.id) return res;
      } catch { /* fall through */ }
      const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
      return colleges.find(c => c.id === collegeId) || colleges[0];
    },

    // Departments have no backend endpoint yet — mock only
    getDepartments: async (collegeId = 'col-1'): Promise<DynamicDepartment[]> => {
      const depts = this.getStorage<DynamicDepartment[]>('platform_departments', MOCK_DYNAMIC_DEPARTMENTS);
      return depts.filter(d => d.collegeId === collegeId);
    },

    // Departments have no backend endpoint yet — mock only
    createDepartment: async (collegeId: string, data: { name: string; code: string; assignedAdminEmail?: string; assignedAdminName?: string; adminPermissions?: AdminPermission[] }): Promise<DynamicDepartment> => {
      const depts = this.getStorage<DynamicDepartment[]>('platform_departments', MOCK_DYNAMIC_DEPARTMENTS);
      const newDept: DynamicDepartment = {
        id: `dept_${Date.now()}`, collegeId, name: data.name, code: data.code.toUpperCase(),
        assignedAdminEmail: data.assignedAdminEmail, assignedAdminName: data.assignedAdminName,
        adminPermissions: data.adminPermissions || ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_MANAGE_STUDENTS'],
      };
      depts.push(newDept);
      this.setStorage('platform_departments', depts);
      return newDept;
    },

    getPrograms: async (collegeId = 'col-1'): Promise<DynamicProgram[]> => {
      // Try college-scoped endpoint first, then unscoped fallback
      try {
        const res = await this.request<DynamicProgram[]>('GET', `/colleges/${collegeId}/programs`);
        if (Array.isArray(res)) return res;
      } catch { /* fall through */ }
      try {
        const res = await this.request<any[]>('GET', '/programs');
        if (res && Array.isArray(res) && res.length > 0) {
          return res.map((p: any) => ({
            id: p.id, collegeId: p.institution_id || collegeId, name: p.name, code: p.code,
            hasSubPrograms: (p.sub_programs?.length || 0) > 0, subPrograms: (p.sub_programs || []).map((sp: any) => sp.name),
            adminPermissions: [], createdAt: p.created_at || new Date().toISOString(),
          }));
        }
      } catch { /* fall through */ }
      const progs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      return progs.filter(p => p.collegeId === collegeId);
    },

    createProgram: async (collegeId: string, data: Omit<DynamicProgram, 'id' | 'createdAt'>): Promise<DynamicProgram> => {
      try {
        const res = await this.request<{ program: any }>('POST', '/programs', {
          institutionId: collegeId,
          name: data.name,
          code: data.code,
        });
        if (res?.program?.id) {
          return {
            id: res.program.id,
            collegeId: res.program.institution_id || collegeId,
            name: res.program.name,
            code: res.program.code,
            hasSubPrograms: false,
            subPrograms: [],
            adminPermissions: [],
            createdAt: res.program.created_at || new Date().toISOString(),
          };
        }
      } catch { /* fall through */ }
      const progs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      const newProg: DynamicProgram = { id: `prog_${Date.now()}`, ...data, createdAt: new Date().toISOString() };
      progs.push(newProg);
      this.setStorage('platform_dynamic_programs', progs);
      return newProg;
    },

    updateProgram: async (_collegeId: string, progId: string, updates: Partial<DynamicProgram>, verificationCode: string): Promise<DynamicProgram> => {
      // Safeguard verification is frontend-only (no server-side confirmation code check)
      const progs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      const localIdx = progs.findIndex(p => p.id === progId);
      const target = localIdx !== -1 ? progs[localIdx] : null;
      const userCode = verificationCode.trim().toLowerCase();
      if (target) {
        if (userCode !== target.name.trim().toLowerCase() && userCode !== 'confirm_modify' && userCode !== target.code.trim().toLowerCase()) {
          throw new Error(`Safeguard Verification Failed: You must enter "${target.name}" or "CONFIRM_MODIFY" to update this program.`);
        }
      } else if (userCode !== 'confirm_modify') {
        throw new Error('Safeguard Verification Failed: Enter "CONFIRM_MODIFY" to update.');
      }
      try {
        const res = await this.request<{ program: any }>('PUT', `/programs/${progId}`, {
          name: updates.name, code: updates.code,
        });
        if (res?.program?.id) {
          const base = target ?? { id: progId, collegeId: _collegeId, hasSubPrograms: false, subPrograms: [], adminPermissions: [], createdAt: new Date().toISOString() };
          return { ...base, ...updates, id: res.program.id, name: res.program.name, code: res.program.code } as DynamicProgram;
        }
      } catch { /* fall through */ }
      if (localIdx !== -1) {
        progs[localIdx] = { ...progs[localIdx], ...updates };
        this.setStorage('platform_dynamic_programs', progs);
        return progs[localIdx];
      }
      throw new Error('Program not found.');
    },

    deleteProgram: async (_collegeId: string, progId: string, verificationCode: string): Promise<{ success: boolean }> => {
      const progs = this.getStorage<DynamicProgram[]>('platform_dynamic_programs', MOCK_DYNAMIC_PROGRAMS);
      const target = progs.find(p => p.id === progId);
      if (target) {
        const userCode = verificationCode.trim().toLowerCase();
        if (userCode !== target.name.trim().toLowerCase() && userCode !== 'confirm_modify' && userCode !== target.code.trim().toLowerCase()) {
          throw new Error(`Safeguard Verification Failed: You must enter "${target.name}" or "CONFIRM_MODIFY" to delete.`);
        }
      }
      try {
        await this.request('DELETE', `/programs/${progId}`);
        this.setStorage('platform_dynamic_programs', progs.filter(p => p.id !== progId));
        return { success: true };
      } catch { /* fall through */ }
      this.setStorage('platform_dynamic_programs', progs.filter(p => p.id !== progId));
      return { success: true };
    },

    inviteProgramAdmin: async (collegeId: string, data: { firstName: string; lastName: string; email: string; programId?: string; department?: string; permissions: AdminPermission[]; canAssignAdminsToPrograms?: string[] }): Promise<{ invite: PendingInvite; inviteUrl: string }> => {
      try {
        const res = await this.request<{ invite: PendingInvite; inviteUrl: string }>(
          'POST', `/colleges/${collegeId}/invite-program-admin`,
          { firstName: data.firstName, lastName: data.lastName, email: data.email, programId: data.programId, department: data.department, permissions: data.permissions }
        );
        if (res?.invite?.token) {
          return {
            invite: res.invite,
            inviteUrl: `${window.location.origin}${res.inviteUrl}`,
          };
        }
      } catch { /* fall through */ }
      // Mock fallback
      const token = `inv_pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
      const college = colleges.find(c => c.id === collegeId) || colleges[0];
      const invite: PendingInvite = {
        token, email: data.email.toLowerCase().trim(), firstName: data.firstName, lastName: data.lastName,
        name: fullName, role: 'PROGRAM_ADMIN', collegeId: college.id, collegeName: college.name,
        programId: data.programId, department: data.department, permissions: data.permissions,
        createdAt: new Date().toISOString(), status: 'PENDING',
      };
      const pendingInvites = this.getStorage<PendingInvite[]>('platform_pending_invites', []);
      pendingInvites.push(invite);
      this.setStorage('platform_pending_invites', pendingInvites);
      const inviteUrl = `${window.location.origin}/?invite_token=${token}`;
      return { invite, inviteUrl };
    },

    // No backend endpoint for bulk CSV admin upload — mock only
    bulkUploadProgramAdmins: async (collegeId: string, csvContent: string): Promise<{ created: number; errors: string[] }> => {
      const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let created = 0;
      const errors: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (i === 0 && lines[i].toLowerCase().includes('email')) continue;
        const [name, email, targetEntity] = lines[i].split(',').map(p => p.trim());
        if (!email?.includes('@')) { errors.push(`Row ${i + 1}: Invalid email ${email}`); continue; }
        const nameParts = name.split(' ');
        await this.college.inviteProgramAdmin(collegeId, { firstName: nameParts[0] || 'Admin', lastName: nameParts.slice(1).join(' ') || '', email, department: targetEntity, permissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_MANAGE_STUDENTS'] });
        created++;
      }
      return { created, errors };
    },
  };

  // ── INVITE MANAGEMENT (mock-only) ─────────────────────────────────────────
  invites = {
    getAll: async (): Promise<PendingInvite[]> => {
      try {
        const res = await this.request<PendingInvite[]>('GET', '/invites/pending');
        if (Array.isArray(res)) return res;
      } catch { /* fall through */ }
      return this.getStorage<PendingInvite[]>('platform_pending_invites', []);
    },

    getByToken: async (token: string): Promise<PendingInvite | null> => {
      try {
        const res = await this.request<PendingInvite>('GET', `/invites/${token}`, undefined, { noAuth: true });
        if (res?.token) return res;
      } catch { /* fall through */ }
      const stored = this.getStorage<PendingInvite[]>('platform_pending_invites', []);
      return stored.find(inv => inv.token === token) || null;
    },

    completePasswordSetup: async (token: string, password: string): Promise<{ user: AuthUser; token: string }> => {
      try {
        const res = await this.request<{ user: AuthUser; token: string }>(
          'POST', '/auth/invite/activate', { token, password }, { noAuth: true }
        );
        if (res?.token && res?.user?.id) {
          this.setToken(res.token);
          localStorage.setItem('auth_user', JSON.stringify(res.user));
          return { user: res.user, token: res.token };
        }
      } catch { /* fall through */ }
      // Mock fallback
      const stored = this.getStorage<PendingInvite[]>('platform_pending_invites', []);
      const invIdx = stored.findIndex(inv => inv.token === token);
      if (invIdx === -1) throw new Error('Invalid or expired activation link.');
      const invite = stored[invIdx];
      invite.status = 'ACCEPTED';
      this.setStorage('platform_pending_invites', stored);
      const userRecord: AuthUser = {
        id: `usr_${Date.now()}`, name: invite.name, email: invite.email, role: invite.role,
        collegeId: invite.collegeId, collegeName: invite.collegeName, programId: invite.programId,
        department: invite.department, permissions: invite.permissions || [],
      };
      const users = this.getStorage<any[]>('college_registered_users', []);
      const existingIdx = users.findIndex(u => u.email.toLowerCase() === invite.email.toLowerCase());
      if (existingIdx !== -1) users[existingIdx] = { ...users[existingIdx], ...userRecord };
      else users.push({ ...userRecord });
      this.setStorage('college_registered_users', users);
      if (invite.role === 'SUPER_ADMIN' && invite.collegeId) {
        const colleges = this.getStorage<College[]>('platform_colleges', MOCK_COLLEGES);
        const colIdx = colleges.findIndex(c => c.id === invite.collegeId);
        if (colIdx !== -1) { colleges[colIdx].superAdminStatus = 'ACTIVE'; this.setStorage('platform_colleges', colleges); }
      }
      const jwtToken = `jwt_act_${Date.now()}`;
      this.setToken(jwtToken);
      localStorage.setItem('auth_user', JSON.stringify(userRecord));
      return { user: userRecord, token: jwtToken };
    },
  };

  // ── STUDENT BATCH OPERATIONS ──────────────────────────────────────────────
  studentBatch = {
    bulkEnroll: async (_collegeId: string, csvContent: string): Promise<{ count: number; students: any[]; errors: string[] }> => {
      try {
        // Try real backend CSV import endpoint
        const formData = new FormData();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        formData.append('file', blob, 'students.csv');
        const res = await this.request<any>('POST', '/admin/students/import', formData);
        if (res?.summary) {
          return { count: res.summary.successful || 0, students: [], errors: res.summary.errors?.map((e: any) => e.reason) || [] };
        }
      } catch { /* fall through to mock */ }
      return { count: 0, students: [], errors: ['Import requires backend connection.'] };
    },

    bulkAssignPrograms: async (_collegeId: string, _csvContent: string): Promise<{ count: number; updated: any[]; errors: string[] }> => {
      return { count: 0, updated: [], errors: ['Bulk program assignment requires backend connection.'] };
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
      this.setStorage('admin_students', students);
      return student;
    },
  };

  // ── MENTORS ───────────────────────────────────────────────────────────────────

  mentors = {
    getMyStudents: async (): Promise<any[]> => {
      try {
        const data = await this.apiFetch<{ students: any[] }>('/api/mentors/my-students');
        return data.students.map((s: any) => ({
          id: s.id, userId: s.user_id ?? s.id, name: s.name, email: s.email,
          rollNumber: s.roll_number, department: s.batch_name ?? '',
          track: s.track ?? 'HOPE_ELITE', subdivisionName: s.subdivision_name ?? '',
          resumeUrl: s.resume_url, resumeVerified: s.resume_verified,
          score: null, mentorName: '',
        }));
      } catch {
        // Fall back to admin mock list when backend unreachable
        return this.admin.getMentorMentees();
      }
    },

    assignMentor: async (studentId: string, mentorId: string): Promise<any> => {
      try {
        const data = await this.apiFetch<{ assignment: any }>('/api/mentors/assign', {
          method: 'POST',
          body: JSON.stringify({ studentId, mentorId }),
        });
        return data.assignment;
      } catch {
        return { studentId, mentorId, assignedAt: new Date().toISOString() };
      }
    },
  };

  // ── SESSIONS ─────────────────────────────────────────────────────────────────

  sessions = {
    bankFallback: async (
      difficulty: 'EASY' | 'MEDIUM' | 'ADVANCED',
      domain?: string,
    ): Promise<{ id: string; question_text: string; difficulty: string; category: string; domain: string | null }> => {
      try {
        const params = new URLSearchParams({ difficulty });
        if (domain) params.append('domain', domain);
        return await this.apiFetch(`/api/sessions/bank-fallback?${params.toString()}`);
      } catch {
        const q = MOCK_INTERVIEW_QUESTIONS.find(q => q.difficulty === difficulty) || MOCK_INTERVIEW_QUESTIONS[0];
        return { id: q.id, question_text: q.questionText, difficulty: q.difficulty, category: q.category || 'General', domain: domain ?? null };
      }
    },

    submitTurn: async (
      sessionId: string,
      audioBlob: Blob,
      metadata: {
        studentId: string;
        questionText: string;
        difficulty: string;
        turnNumber: number;
        domain?: string;
      },
    ): Promise<{
      transcript: string;
      technicalScore: number;
      communicationScore: number;
      overallScore: number;
      feedback: string;
      strengths: string;
      weaknesses: string;
      nextDifficulty: string;
      audioMetrics: {
        paceWpm: number;
        fillerCount: number;
        fluencyScore: number;
        clarityScore: number;
      };
    }> => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'response.wav');
      formData.append('metadata', JSON.stringify(metadata));
      return await this.apiFetch(`/api/sessions/${sessionId}/turns`, {
        method: 'POST',
        body: formData,
      });
    },
  };
}

export const api = new ApiClient();
