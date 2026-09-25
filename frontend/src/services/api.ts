import {
  StudentProfile,
  DiagnosticReport,
  TrainerTenure,
  InterviewAssignment,
  QuestionTurn,
  ParsedResume,
  CodingHandles
} from '../types';
import {
  INITIAL_STUDENT_PROFILE,
  INITIAL_CRITERIA_TASKS,
  MOCK_INTERVIEW_QUESTIONS,
  MOCK_TRAINER_TENURES,
  MOCK_ASSIGNMENTS,
  MOCK_MENTEES_LIST,
  PEP_DOMAINS,
  LISTENING_PASSAGE
} from '../data/mockData';

// ── ApiError ──────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Direct Groq API Call helper (client-side, uses user-provided API key) ────

async function callGroqDirect(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
  });

  if (!resp.ok) {
    throw new Error(`Groq API returned ${resp.status}: ${resp.statusText}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── ApiClient ─────────────────────────────────────────────────────────────────

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

  // Local state helpers with localStorage persistence
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
    // Merge caller-supplied headers (after defaults so they can override)
    if (options.headers) {
      const extra = options.headers as Record<string, string>;
      Object.assign(headers, extra);
    }

    const res = await fetch(path, { ...options, headers });

    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new ApiError(res.status, res.statusText);
    }

    if (!res.ok) {
      throw new ApiError(res.status, json?.message ?? res.statusText, json?.code);
    }

    return json.data as T;
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────

  auth = {
    login: async (email: string, password: string) => {
      const data = await this.apiFetch<{ token: string; user: { id: string; name: string; email: string; role: string }; studentId: string | null }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) }
      );
      this.setToken(data.token);
      return data;
    },

    register: async (userData: {
      name: string;
      email: string;
      password: string;
      rollNumber: string;
      batchId: string;
      subdivisionId?: string;
    }) => {
      const data = await this.apiFetch<{ token: string; user: { id: string; name: string; email: string; role: string }; studentId: string }>(
        '/api/auth/register',
        { method: 'POST', body: JSON.stringify(userData) }
      );
      this.setToken(data.token);
      return data;
    },

    logout: async () => {
      try {
        await this.apiFetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Token may already be invalid — clear local state regardless
      }
      this.setToken(null);
    },

    me: async () => {
      return await this.apiFetch<{ user: { id: string; name: string; email: string; role: string }; studentId: string | null }>(
        '/api/auth/me'
      );
    },

    // External self-registration — no M1 backend route for email verification
    registerExternal: async (userData: { name: string; email: string; password?: string; department?: string; batchYear?: number }) => {
      // TODO: wire to real API when M2 routes are implemented
      return {
        message: 'Registration successful. Verification code generated.',
        email: userData.email,
        simulatedVerificationCode: '123456'
      };
    },

    // Email verification — no M1 backend route
    verifyEmail: async (email: string, _code: string) => {
      // TODO: wire to real API when M2 routes are implemented
      const user = {
        id: `usr_${Date.now()}`,
        name: email.split('@')[0],
        email,
        role: 'STUDENT'
      };
      const token = `jwt_mock_${Date.now()}`;
      this.setToken(token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      return { user, token, studentId: 'stu-21cs1084' };
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

  // ── STUDENT PROFILE ───────────────────────────────────────────────────────

  student = {
    getProfile: async (studentId: string): Promise<StudentProfile> => {
      try {
        const data = await this.apiFetch<{ student: any }>(`/api/students/${studentId}`);
        const s = data.student;
        // Preserve locally-cached supplementary fields not yet in M1 backend
        // (criteriaTasks, recentReports, department, track, mentor info)
        const cached = this.getStorage<StudentProfile | null>('student_profile', null);
        return {
          id: s.id,
          name: s.name,
          rollNumber: s.roll_number,
          email: s.email,
          department: cached?.department ?? 'Computer Science & Engineering',
          batchYear: cached?.batchYear ?? 2026,
          track: cached?.track ?? 'HOPE_ELITE',
          mentorName: cached?.mentorName ?? 'Unassigned',
          mentorEmail: cached?.mentorEmail ?? '',
          codingHandles: {
            github: s.coding_handles?.github ?? cached?.codingHandles?.github ?? '',
            leetcode: s.coding_handles?.leetcode ?? cached?.codingHandles?.leetcode ?? '',
            codechef: s.coding_handles?.codechef ?? cached?.codingHandles?.codechef ?? '',
            hackerrank: s.coding_handles?.hackerrank ?? cached?.codingHandles?.hackerrank ?? '',
            codeforces: s.coding_handles?.codeforces ?? cached?.codingHandles?.codeforces ?? '',
            leetcodeSolved: s.coding_handles?.leetcodeSolved ?? cached?.codingHandles?.leetcodeSolved ?? 0,
            githubRepos: s.coding_handles?.githubRepos ?? cached?.codingHandles?.githubRepos ?? 0,
          },
          resume: cached?.resume ?? null,
          criteriaTasks: cached?.criteriaTasks ?? INITIAL_CRITERIA_TASKS.map(t => ({ ...t, isCompleted: false, verifiedByMentor: false })),
          recentReports: cached?.recentReports ?? [],
        };
      } catch {
        // Fallback to localStorage cache when API is unreachable
        return this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      }
    },

    updateProfile: async (studentId: string, updates: Partial<StudentProfile>): Promise<StudentProfile> => {
      try {
        const body: Record<string, any> = {};
        if (updates.codingHandles) {
          body.codingHandles = updates.codingHandles;
        }
        await this.apiFetch<{ student: any }>(`/api/students/${studentId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } catch {
        // On API failure, still update local cache
      }
      const current = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      const updated = { ...current, ...updates };
      this.setStorage('student_profile', updated);
      return updated;
    },

    updateCodingHandles: async (studentId: string, handles: CodingHandles): Promise<void> => {
      try {
        await this.apiFetch<{ student: any }>(`/api/students/${studentId}`, {
          method: 'PATCH',
          body: JSON.stringify({ codingHandles: handles }),
        });
      } catch {
        // Local fallback
      }
      const current = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      current.codingHandles = { ...current.codingHandles, ...handles };
      this.setStorage('student_profile', current);
    },

    uploadResume: async (
      studentId: string,
      payload: FormData | { resumeText: string; fileName?: string } | ParsedResume
    ): Promise<ParsedResume> => {
      // If binary PDF FormData, upload to backend; otherwise fall through to client-side parse
      if (payload instanceof FormData) {
        try {
          await this.apiFetch<{ resumeUrl: string }>(`/api/students/${studentId}/resume`, {
            method: 'PATCH',
            body: payload,
          });
        } catch (err) {
          console.warn('[api.student.uploadResume] Backend upload failed:', err);
        }
      }

      let parsed: ParsedResume;
      if ('skills' in payload && 'projects' in payload) {
        parsed = payload as ParsedResume;
      } else {
        parsed = {
          fileName: (payload as any)?.fileName || 'Resume_Extracted.pdf',
          parsedAt: new Date().toISOString().split('T')[0],
          summary: 'Software Engineer with experience in Java, Spring Boot, Kafka, PostgreSQL, and scalable distributed systems.',
          skills: {
            languages: ['Java', 'TypeScript', 'SQL', 'Python'],
            frameworks: ['Spring Boot', 'React', 'Tailwind CSS'],
            databases: ['PostgreSQL', 'Redis'],
            tools: ['Git', 'Docker', 'Kafka']
          },
          projects: [
            {
              title: 'High-Throughput Order Ledger Service',
              description: 'Built distributed transactional ledger using Kafka consumer partitions and Redis locks.',
              techStack: ['Java', 'Spring Boot', 'Kafka', 'Redis']
            }
          ]
        };
      }

      const current = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      current.resume = parsed;
      this.setStorage('student_profile', current);
      return parsed;
    }
  };

  // ── TASKS (no M1 backend — checklist is a M2 feature) ────────────────────

  tasks = {
    toggleTask: async (_studentId: string, taskId: string): Promise<boolean> => {
      // TODO: wire to real API when M2 routes are implemented
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
      // TODO: wire to real API when M2 routes are implemented
      const current = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      current.criteriaTasks = current.criteriaTasks.map(t => {
        if (t.id === taskId) {
          return { ...t, verifiedByMentor: true, verifiedAt: new Date().toISOString().split('T')[0] };
        }
        return t;
      });
      this.setStorage('student_profile', current);
    }
  };

  // ── INTERVIEW ROOM (Direct Groq + AI-service pipeline) ───────────────────

  interview = {
    start: async (_studentId: string, type: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION' | 'PRACTICE' = 'MOCK_INTERVIEW'): Promise<{ sessionId: string; firstQuestion: QuestionTurn }> => {
      const sessionId = `ses_${Date.now()}`;
      const groqKey = localStorage.getItem('groq_api_key');
      const student = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);

      let firstQ: QuestionTurn = MOCK_INTERVIEW_QUESTIONS[0];

      if (groqKey) {
        try {
          const sys = `You are a technical interviewer for a top software company. The candidate's resume includes: ${student.resume?.skills.languages.join(', ')}, ${student.resume?.skills.frameworks.join(', ')}. Project: ${student.resume?.projects[0]?.title || 'Distributed Systems'}. Generate exactly ONE resume-grounded opening interview question. Return in JSON format: {"questionText": "...", "difficulty": "EASY", "category": "Core Architecture"}`;
          const content = await callGroqDirect(groqKey, sys, "Generate the first interview question.");
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            firstQ = {
              id: `q_1_${Date.now()}`,
              questionNumber: 1,
              questionText: parsed.questionText || firstQ.questionText,
              difficulty: 'EASY',
              category: parsed.category || 'Architecture'
            };
          }
        } catch (e) {
          console.warn("Groq direct call fallback:", e);
        }
      }

      const sessionData = {
        sessionId,
        type,
        turnIndex: 0,
        questions: [firstQ],
        tabSwitches: 0
      };
      this.setStorage(`interview_${sessionId}`, sessionData);

      return { sessionId, firstQuestion: firstQ };
    },

    recordProctorEvent: async (sessionId: string, _eventType: 'TAB_SWITCH' | 'FULLSCREEN_EXIT') => {
      // TODO: wire to real API when M2 proctor-event route is implemented
      const sess = this.getStorage<any>(`interview_${sessionId}`, { tabSwitches: 0 });
      sess.tabSwitches = (sess.tabSwitches || 0) + 1;
      const isFlagged = sess.tabSwitches >= 4;
      this.setStorage(`interview_${sessionId}`, sess);
      return { tabSwitches: sess.tabSwitches, isFlagged };
    },

    submitAnswer: async (sessionId: string, studentAnswer: string, durationSeconds = 20) => {
      const sess = this.getStorage<any>(`interview_${sessionId}`, {
        turnIndex: 0,
        questions: MOCK_INTERVIEW_QUESTIONS,
        tabSwitches: 0
      });

      const turnIdx = sess.turnIndex || 0;
      const groqKey = localStorage.getItem('groq_api_key');

      // Calculate speech metrics client-side
      const words = studentAnswer.trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const calcWpm = Math.max(90, Math.min(160, Math.round((wordCount / Math.max(durationSeconds, 8)) * 60)));

      const lower = studentAnswer.toLowerCase();
      const fillers: Record<string, number> = {};
      ['uh', 'um', 'like', 'basically', 'actually'].forEach(f => {
        const regex = new RegExp(`\\b${f}\\b`, 'g');
        const matches = lower.match(regex);
        if (matches) fillers[f] = matches.length;
      });
      const totalFillers = Object.values(fillers).reduce((a, b) => a + b, 0);

      let technicalScore = 84;
      let communicationScore = 80;
      let feedback = "Clear technical articulation with good awareness of system tradeoffs.";
      let strengths = "Good structural explanation and confident terminology.";
      let weaknesses = "Can elaborate more on edge-case failure mitigation.";

      if (groqKey && studentAnswer.length > 10) {
        try {
          const sys = `You are a technical interview evaluator. Evaluate this candidate response. Return ONLY a JSON object:
{"technical_score": 88, "communication_score": 82, "feedback": "...", "strengths": "...", "weaknesses": "...", "next_question": "..."}`;
          const prompt = `Question: "${sess.questions[turnIdx]?.questionText || 'Technical Question'}"\nCandidate Answer: "${studentAnswer}"`;
          const raw = await callGroqDirect(groqKey, sys, prompt);
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const ev = JSON.parse(jsonMatch[0]);
            technicalScore = ev.technical_score || 85;
            communicationScore = ev.communication_score || 80;
            if (ev.feedback) feedback = ev.feedback;
            if (ev.strengths) strengths = ev.strengths;
            if (ev.weaknesses) weaknesses = ev.weaknesses;
          }
        } catch (e) {
          console.warn("Groq direct eval fallback:", e);
        }
      }

      const turnEvaluation: QuestionTurn = {
        id: sess.questions[turnIdx]?.id || `q_${turnIdx + 1}`,
        questionNumber: turnIdx + 1,
        questionText: sess.questions[turnIdx]?.questionText || '',
        difficulty: (turnIdx === 0 ? 'EASY' : turnIdx === 1 ? 'MEDIUM' : 'ADVANCED') as any,
        studentAnswer,
        technicalScore,
        communicationScore,
        wpm: calcWpm,
        fillerWords: totalFillers,
        feedback,
        strengths,
        weaknesses
      };

      sess.questions[turnIdx] = turnEvaluation;

      const isCompleted = turnIdx >= 2;

      let nextQuestion: QuestionTurn | undefined = undefined;
      let finalReport: DiagnosticReport | undefined = undefined;

      if (!isCompleted) {
        const nextDifficulty = turnIdx === 0 ? 'MEDIUM' : 'ADVANCED';
        const nextQText = turnIdx === 0
          ? "How did you manage database connection pooling and PostgreSQL index strategy to support horizontal scaling under heavy query load?"
          : "In the event of a network partition where multiple microservice nodes attempt conflicting updates, how would you maintain data consistency without sacrificing latency?";

        nextQuestion = {
          id: `q_${turnIdx + 2}_${Date.now()}`,
          questionNumber: turnIdx + 2,
          questionText: nextQText,
          difficulty: nextDifficulty as any,
          category: 'Scalability'
        };

        sess.turnIndex = turnIdx + 1;
        sess.questions.push(nextQuestion);
      } else {
        finalReport = {
          id: `rep_${Date.now().toString().slice(-4)}`,
          date: new Date().toISOString().split('T')[0],
          sessionType: sess.type || 'MOCK_INTERVIEW',
          overallScore: Math.round((technicalScore + communicationScore) / 2),
          technicalScore,
          communicationScore,
          averageWpm: calcWpm,
          totalFillerWords: totalFillers,
          fillerWordBreakdown: fillers,
          skillBreakdown: [
            { skill: 'Java & Microservices Architecture', score: technicalScore, status: 'STRONG', recommendation: 'Solid command of distributed messaging and concurrency.' },
            { skill: 'Database Optimization (PostgreSQL)', score: 82, status: 'STRONG', recommendation: 'Strong understanding of indexing and transaction isolation levels.' },
            { skill: 'Communication & Verbal Clarity', score: communicationScore, status: 'MODERATE', recommendation: 'Great natural cadence; watch subtle pauses between paragraphs.' }
          ],
          actionableNextSteps: [
            'Maintain your natural cadence! Your speaking rate of ~125 WPM is in the target recruiter range.',
            'Continue practicing distributed consensus trade-offs (CAP theorem, event-driven saga).',
            'Solidify your answers with specific metrics from your prior projects.'
          ],
          tabSwitches: sess.tabSwitches || 0,
          isFlagged: (sess.tabSwitches || 0) >= 4
        };
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
      // TODO: wire to real API when M2 session conclude route is implemented
      const sess = this.getStorage<any>(`interview_${sessionId}`, null);
      if (!sess) return null;

      const report: DiagnosticReport = {
        id: `rep_${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().split('T')[0],
        sessionType: sess.type || 'MOCK_INTERVIEW',
        overallScore: 84,
        technicalScore: 86,
        communicationScore: 82,
        averageWpm: 126,
        totalFillerWords: 3,
        fillerWordBreakdown: { 'like': 1, 'actually': 2 },
        skillBreakdown: [
          { skill: 'Distributed Architecture', score: 88, status: 'STRONG', recommendation: 'Clear understanding of event-driven patterns.' },
          { skill: 'Communication Fluency', score: 82, status: 'STRONG', recommendation: 'Confident delivery with low filler count.' }
        ],
        actionableNextSteps: ['Keep practicing live technical explanations.'],
        tabSwitches: sess.tabSwitches || 0,
        isFlagged: (sess.tabSwitches || 0) >= 4
      };
      return report;
    },

    /**
     * Send a WAV audio blob to the FastAPI ai-service for full pipeline evaluation.
     * Goes directly to FastAPI (/ai/evaluate-response, proxied by Vite).
     * The Node.js session turn endpoint (POST /api/sessions/:id/turns) should be
     * used instead once M2 session creation is implemented — see api.sessions.submitTurn.
     */
    evaluateAudio: async (
      audioBlob: Blob,
      metadata: {
        question_text: string;
        difficulty: string;
        turn_number: number;
        domain?: string | null;
        previous_turns?: Array<{
          question_text: string;
          student_answer: string;
          difficulty: string;
          technical_score?: number | null;
          feedback?: string | null;
        }>;
      }
    ): Promise<{
      transcript: string;
      stt_raw: string;
      technical_score: number;
      feedback: string;
      strengths: string;
      weaknesses: string;
      next_recommended_difficulty: string;
      pace_wpm: number;
      filler_count: number;
      fluency_score: number;
      clarity_score: number;
    } | null> => {
      try {
        const form = new FormData();
        form.append('audio', audioBlob, 'response.wav');
        form.append('metadata', JSON.stringify(metadata));

        const resp = await fetch('/ai/evaluate-response', {
          method: 'POST',
          body: form,
        });

        if (!resp.ok) {
          console.error(`[AI Service] /ai/evaluate-response → ${resp.status} ${resp.statusText}`);
          return null;
        }

        return await resp.json();
      } catch (e) {
        console.error('[AI Service] evaluateAudio network error:', e);
        return null;
      }
    },

    /**
     * Generate the next interview question via the FastAPI ai-service.
     * Returns null on network error or service unavailability.
     */
    generateQuestion: async (body: {
      student_name: string;
      skills: string[];
      projects: Array<{ title: string; tech_stack: string[]; description: string }>;
      previous_turns: Array<{
        question_text: string;
        student_answer: string;
        difficulty: string;
        technical_score: number | null;
        feedback: string | null;
      }>;
      difficulty: string;
      domain?: string | null;
    }): Promise<{ question_text: string; difficulty: string; category?: string } | null> => {
      try {
        const resp = await fetch('/ai/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!resp.ok) return null;
        return await resp.json();
      } catch {
        return null;
      }
    },

    getReport: async (_sessionId: string): Promise<DiagnosticReport> => {
      // TODO: wire to real API when M2 session routes are implemented
      const student = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      return student.recentReports[0] || {
        id: 'rep-init',
        date: new Date().toISOString().split('T')[0],
        sessionType: 'MOCK_INTERVIEW',
        overallScore: 85,
        technicalScore: 86,
        communicationScore: 84,
        averageWpm: 128,
        totalFillerWords: 3,
        fillerWordBreakdown: { 'uh': 1, 'like': 2 },
        skillBreakdown: [
          { skill: 'Core Java', score: 90, status: 'STRONG', recommendation: 'Great OOP depth' }
        ],
        actionableNextSteps: ['Continue mock interviews'],
        tabSwitches: 0,
        isFlagged: false
      };
    }
  };

  // ── LISTENING COMPREHENSION (no M1 backend) ──────────────────────────────

  listening = {
    start: async (_studentId: string) => {
      // TODO: wire to real API when M2 routes are implemented
      return {
        sessionId: `lis_${Date.now()}`,
        passage: LISTENING_PASSAGE,
        replaysUsed: 0,
        maxReplays: 2
      };
    },

    recordReplay: async (sessionId: string) => {
      // TODO: wire to real API when M2 routes are implemented
      const sess = this.getStorage<any>(`listening_${sessionId}`, { replaysUsed: 0 });
      sess.replaysUsed = (sess.replaysUsed || 0) + 1;
      this.setStorage(`listening_${sessionId}`, sess);
      return { replaysUsed: sess.replaysUsed };
    },

    submitAnswers: async (_sessionId: string, answers: any[]) => {
      // TODO: wire to real API when M2 routes are implemented
      return {
        overallScore: 88,
        evaluations: answers.map((ans, idx) => ({
          questionIndex: idx,
          studentAnswer: ans,
          score: 88,
          feedback: 'Accurately captured key architectural requirements from the technical passage.'
        }))
      };
    }
  };

  // ── SUGGESTION SYSTEM CHATBOT (client-side Groq) ─────────────────────────

  suggestions = {
    getOrCreateSession: async (_studentId = 'stu-101'): Promise<string> => {
      return `sug_${Date.now()}`;
    },

    getHistory: async (sessionId: string) => {
      return this.getStorage<any[]>(`sug_hist_${sessionId}`, []);
    },

    sendMessage: async (sessionId: string, message: string) => {
      const groqKey = localStorage.getItem('groq_api_key');
      let assistantReply = "To improve your answer, focus on articulating the exact trade-offs. For example, mention latency vs consistency, and explain why your chosen framework was the best fit.";
      let technicalTerms = [
        { term: 'Event-driven Architecture', definition: 'A software architecture pattern promoting the production and consumption of state changes as events.', betterAlternativeTo: 'Publishing messages back and forth' },
        { term: 'Idempotency', definition: 'An operation that produces the same result no matter how many times it is executed.', betterAlternativeTo: 'Making sure we do not duplicate things' }
      ];
      let commSuggestions = [
        'Lead with your high-level thesis in the first 10 seconds before diving into code details.',
        'Use transition phrases like "Furthermore" or "From a resilience perspective" instead of "also".'
      ];
      let structuralAdvice = [
        'Framework: Problem Statement -> Technical Solution -> Verified Metric (e.g. 40% latency reduction).'
      ];

      if (groqKey) {
        try {
          const sys = `You are an executive communication and technical interview coach. Analyze the student's question or statement. Return JSON:
{"reply": "...", "terms": [{"term": "...", "definition": "...", "betterAlternativeTo": "..."}], "suggestions": ["..."], "structural": ["..."]}`;
          const raw = await callGroqDirect(groqKey, sys, message);
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.reply) assistantReply = parsed.reply;
            if (parsed.terms) technicalTerms = parsed.terms;
            if (parsed.suggestions) commSuggestions = parsed.suggestions;
            if (parsed.structural) structuralAdvice = parsed.structural;
          }
        } catch (e) {
          console.warn("Groq chat fallback:", e);
        }
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

  // ── ADMIN (PROGRAM_ADMIN scope) ───────────────────────────────────────────

  admin = {
    // ── Real backend endpoints ─────────────────────────────────────────────

    /**
     * GET /api/admin/users — list users with optional role/status/search filters.
     * Requires PROGRAM_ADMIN role.
     */
    getUsers: async (filters?: { role?: string; status?: string; search?: string }): Promise<any[]> => {
      const params = new URLSearchParams();
      if (filters?.role) params.append('role', filters.role);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await this.apiFetch<{ users: any[] }>(`/api/admin/users${qs}`);
      return data.users;
    },

    /**
     * PATCH /api/admin/users/:id/role — change a user's role.
     * Requires PROGRAM_ADMIN. Cannot grant PROGRAM_ADMIN role.
     */
    updateUserRole: async (userId: string, role: string): Promise<any> => {
      const data = await this.apiFetch<{ user: any }>(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      return data.user;
    },

    /**
     * PATCH /api/admin/users/:id/status — change a user's status (ACTIVE/INACTIVE/SUSPENDED).
     * Requires PROGRAM_ADMIN.
     */
    updateUserStatus: async (userId: string, status: string): Promise<any> => {
      const data = await this.apiFetch<{ user: any }>(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return data.user;
    },

    getFacultyMentors: async (): Promise<any[]> => {
      try {
        const users = await this.admin.getUsers({ role: 'FACULTY_MENTOR' });
        return users.map(u => ({
          id: u.id,
          userId: u.id,
          name: u.name,
          email: u.email,
          status: u.status,
          createdAt: u.created_at,
          menteeCount: 0,              // TODO: wire to real API when M2 routes are implemented
          assignedMenteesCount: 0,
        }));
      } catch {
        return this.getStorage<any[]>('admin_faculty_mentors', [
          { id: 'fm-1', name: 'Dr. Ananya Sharma', email: 'ananya.sharma@college.edu', department: 'CSE', assignedMenteesCount: 24 },
          { id: 'fm-2', name: 'Prof. R. Venkatesh', email: 'venkatesh.r@college.edu', department: 'IT', assignedMenteesCount: 22 }
        ]);
      }
    },

    getStudents: async (params: { cohort?: string; search?: string } = {}) => {
      try {
        const filters: { role: string; search?: string } = { role: 'STUDENT' };
        if (params.search) filters.search = params.search;
        const users = await this.admin.getUsers(filters);
        return users.map(u => ({
          id: u.id,
          userId: u.id,
          name: u.name,
          email: u.email,
          rollNumber: '',     // Not in users endpoint — TODO: enrich via student endpoint when M2 available
          department: '',
          track: 'STUDENT',
          mentorName: 'Unassigned',
          score: null,
          status: u.status,
          createdAt: u.created_at,
        }));
      } catch {
        let list = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
        if (params.search) {
          const s = params.search.toLowerCase();
          list = list.filter(item => item.name.toLowerCase().includes(s) || (item.rollNumber || '').toLowerCase().includes(s));
        }
        return list;
      }
    },

    getMentorMentees: async (_mentorId?: string) => {
      // TODO: wire to real API when M2 routes are implemented (use api.mentors.getMyStudents())
      return this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
    },

    assignMentor: async (studentId: string, mentorId: string) => {
      try {
        await this.apiFetch('/api/mentors/assign', {
          method: 'POST',
          body: JSON.stringify({ studentId, mentorId }),
        });
        return { message: 'Mentor assigned successfully' };
      } catch (err) {
        // Fallback: update local mock data
        const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
        const updated = students.map(s => s.id === studentId ? { ...s, mentorId } : s);
        this.setStorage('admin_students', updated);
        return { message: 'Mentor assigned successfully' };
      }
    },

    deleteUser: async (userId: string) => {
      // No DELETE endpoint in M1 — suspend the user via the status endpoint instead
      try {
        await this.admin.updateUserStatus(userId, 'SUSPENDED');
        return { success: true, message: 'User suspended successfully' };
      } catch {
        // Local fallback
        const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST).filter((s: any) => s.id !== userId);
        this.setStorage('admin_students', students);
        return { success: true, message: 'User removed successfully' };
      }
    },

    // ── Mock-only endpoints (no M1 backend routes) ─────────────────────────

    getCoordinatorStats: async () => {
      // TODO: wire to real API when M2 routes are implemented
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const totalCandidates = students.length;
      const hopeEliteCount = students.filter((s: any) => s.track === 'HOPE' && s.isElite).length;
      const pepTotalCount = students.filter((s: any) => s.track === 'PEP').length;

      return {
        totalCandidates: totalCandidates || 240,
        hopeEliteCount: hopeEliteCount || 42,
        pepDomainsCount: 21,
        placementReadyRate: 88,
        departmentStreamCount: 65,
        hopeGeneralCount: 78,
        pepTotalCount: pepTotalCount || 97
      };
    },

    getSystemStats: async () => {
      // TODO: wire to real API when M2 routes are implemented
      return {
        programAdminsCount: 8,
        facultyMentorsCount: 24,
        trainersCount: 12,
        studentsCount: 320
      };
    },

    getProgramAdmins: async (): Promise<any[]> => {
      try {
        const users = await this.admin.getUsers({ role: 'PROGRAM_ADMIN' });
        return users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          status: u.status,
          createdAt: u.created_at,
        }));
      } catch {
        return this.getStorage<any[]>('admin_program_admins', [
          { id: 'pa-1', name: 'Dr. K. Swaminathan', email: 'swaminathan@college.edu', track: 'HOPE_ELITE', department: 'CSE', createdAt: '2026-01-10' },
          { id: 'pa-2', name: 'Prof. Meera Deshmukh', email: 'meera.d@college.edu', track: 'PEP', department: 'ECE', createdAt: '2026-02-15' }
        ]);
      }
    },

    createProgramAdmin: async (data: { name: string; email: string; password?: string }) => {
      // TODO: wire to real API when M2 user-creation routes are implemented
      const admins = this.getStorage<any[]>('admin_program_admins', []);
      const newAdmin = { id: `pa_${Date.now()}`, ...data, createdAt: new Date().toISOString().split('T')[0] };
      admins.push(newAdmin);
      this.setStorage('admin_program_admins', admins);
      return newAdmin;
    },

    createFacultyMentor: async (data: { name: string; email: string; password?: string }) => {
      // TODO: wire to real API when M2 user-creation routes are implemented
      const mentors = this.getStorage<any[]>('admin_faculty_mentors', []);
      const newMentor = { id: `fm_${Date.now()}`, ...data, assignedMenteesCount: 0 };
      mentors.push(newMentor);
      this.setStorage('admin_faculty_mentors', mentors);
      return newMentor;
    },

    createStudent: async (data: any) => {
      // TODO: wire to real API when M2 user-creation routes are implemented
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const newStudent = { id: `stu_${Date.now()}`, ...data };
      students.push(newStudent);
      this.setStorage('admin_students', students);
      return newStudent;
    },

    createStudentByMentor: async (data: any) => {
      // TODO: wire to real API when M2 user-creation routes are implemented
      return this.admin.createStudent(data);
    },

    getStudentFullHistory: async (_studentId: string) => {
      // TODO: wire to real API when M2 routes are implemented
      const student = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
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
            questionText: 'Explain how you handled distributed transactional order processing in Kafka.',
            studentAnswer: 'In our architecture, we used transactional outbox patterns alongside partition keys to strictly preserve ordering per account.',
            technicalScore: r.technicalScore,
            communicationScore: r.communicationScore,
            wordsPerMinute: r.averageWpm,
            fillerCount: r.totalFillerWords,
            strengths: 'Clear structural explanation and good terminology.',
            weaknesses: 'Could elaborate more on partition rebalancing edge cases.'
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

    getTrainerTenures: async (): Promise<TrainerTenure[]> => {
      // TODO: wire to real API when M2 trainer routes are implemented
      return this.getStorage<TrainerTenure[]>('trainer_tenures', MOCK_TRAINER_TENURES);
    },

    onboardTrainer: async (trainer: Omit<TrainerTenure, 'id' | 'isActive'>): Promise<TrainerTenure> => {
      // TODO: wire to real API when M2 trainer routes are implemented
      const tenures = this.getStorage<TrainerTenure[]>('trainer_tenures', MOCK_TRAINER_TENURES);
      const newT: TrainerTenure = { id: `ten_${Date.now()}`, ...trainer, isActive: true };
      tenures.push(newT);
      this.setStorage('trainer_tenures', tenures);
      return newT;
    },

    revokeTrainer: async (id: string): Promise<void> => {
      // TODO: wire to real API when M2 trainer routes are implemented
      const tenures = this.getStorage<TrainerTenure[]>('trainer_tenures', MOCK_TRAINER_TENURES);
      const updated = tenures.map(t => t.id === id ? { ...t, isActive: false } : t);
      this.setStorage('trainer_tenures', updated);
    },

    getAssignments: async (): Promise<InterviewAssignment[]> => {
      // TODO: wire to real API when M2 assignment routes are implemented
      return this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
    },

    createAssignment: async (asg: Omit<InterviewAssignment, 'id'>): Promise<InterviewAssignment> => {
      // TODO: wire to real API when M2 assignment routes are implemented
      const list = this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
      const newAsg = { id: `asg_${Date.now()}`, ...asg };
      list.push(newAsg);
      this.setStorage('assignments', list);
      return newAsg;
    },

    getPepDomains: async (): Promise<string[]> => {
      // TODO: wire to real API when org/domains endpoint is implemented
      return PEP_DOMAINS;
    }
  };

  // ── MENTORS ───────────────────────────────────────────────────────────────

  mentors = {
    /**
     * GET /api/mentors/my-students — returns all students assigned to the
     * currently-authenticated FACULTY_MENTOR.
     */
    getMyStudents: async (): Promise<any[]> => {
      const data = await this.apiFetch<{ students: any[] }>('/api/mentors/my-students');
      // Normalise backend snake_case → frontend camelCase expected by components
      return data.students.map(s => ({
        id: s.id,
        userId: s.user_id ?? s.id,
        name: s.name,
        email: s.email,
        rollNumber: s.roll_number,
        department: s.batch_name ?? '',
        track: s.track ?? 'HOPE_ELITE',
        subdivisionName: s.subdivision_name ?? '',
        resumeUrl: s.resume_url,
        resumeVerified: s.resume_verified,
        score: null,   // TODO: wire to real API when M2 session aggregates are implemented
        mentorName: '',
      }));
    },

    /**
     * POST /api/mentors/assign — assign a student to a mentor.
     * Requires PROGRAM_ADMIN role.
     */
    assignMentor: async (studentId: string, mentorId: string): Promise<any> => {
      const data = await this.apiFetch<{ assignment: any }>('/api/mentors/assign', {
        method: 'POST',
        body: JSON.stringify({ studentId, mentorId }),
      });
      return data.assignment;
    },
  };

  // ── SESSIONS ──────────────────────────────────────────────────────────────

  sessions = {
    /**
     * GET /api/sessions/bank-fallback — returns a question from the DB bank
     * (pure DB read, no LLM). Falls back to static question if bank table
     * is not yet populated (pre-M2).
     */
    bankFallback: async (
      difficulty: 'EASY' | 'MEDIUM' | 'ADVANCED',
      domain?: string
    ): Promise<{ id: string; question_text: string; difficulty: string; category: string; domain: string | null }> => {
      const params = new URLSearchParams({ difficulty });
      if (domain) params.append('domain', domain);
      return await this.apiFetch(`/api/sessions/bank-fallback?${params.toString()}`);
    },

    /**
     * POST /api/sessions/:id/turns — submit an audio turn through the Node.js
     * backend (STT → LLM eval → score normalisation → Redis/DB persistence).
     *
     * The caller must build FormData with:
     *   - 'audio': WAV/audio blob
     *   - 'metadata': JSON string matching TurnMetadataSchema
     *
     * NOTE: requires a real session UUID in the DB. Use this once M2 session
     * creation (POST /api/sessions) is implemented. For now, evaluateAudio()
     * goes directly to FastAPI for offline-friendly development.
     */
    submitTurn: async (
      sessionId: string,
      formData: FormData
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
      return await this.apiFetch(`/api/sessions/${sessionId}/turns`, {
        method: 'POST',
        body: formData,
        // No Content-Type header — fetch sets multipart boundary automatically for FormData
      });
    },
  };
}

export const api = new ApiClient();
