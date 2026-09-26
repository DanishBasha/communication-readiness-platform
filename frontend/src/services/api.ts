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
  DEFAULT_CLEAN_STUDENT,
  INITIAL_STUDENT_PROFILE, 
  MOCK_INTERVIEW_QUESTIONS, 
  MOCK_TRAINER_TENURES, 
  MOCK_ASSIGNMENTS, 
  MOCK_MENTEES_LIST,
  PEP_DOMAINS,
  LISTENING_PASSAGE
} from '../data/mockData';

// Direct Client-Side Groq API Call helper
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

  // AUTH
  auth = {
    login: async (email: string, _password?: string) => {
      const normalizedEmail = email.toLowerCase().trim();
      let role: any = 'STUDENT';
      let name = 'Student Candidate';

      if (normalizedEmail.includes('superadmin') || normalizedEmail.includes('admin@college.edu')) {
        role = 'SUPER_ADMIN';
        name = 'Dr. Rajesh Nair (Super Admin)';
      } else if (normalizedEmail.includes('coord') || normalizedEmail.includes('placement')) {
        role = 'PLACEMENT_COORDINATOR';
        name = 'Prof. S. Ranganathan';
      } else if (normalizedEmail.includes('prog') || normalizedEmail.includes('program')) {
        role = 'PROGRAM_ADMIN';
        name = 'Dr. K. Swaminathan';
      } else if (normalizedEmail.includes('mentor') || normalizedEmail.includes('faculty')) {
        role = 'FACULTY_MENTOR';
        name = 'Dr. Ananya Sharma';
      } else if (normalizedEmail.includes('trainer')) {
        role = 'TRAINER';
        name = 'Vikram Malhotra';
      } else {
        role = 'STUDENT';
        name = 'Aravind Kumar';
      }

      const dummyUser = {
        id: `usr_${Date.now()}`,
        name,
        email,
        role
      };

      const token = `jwt_mock_${Date.now()}`;
      this.setToken(token);
      localStorage.setItem('auth_user', JSON.stringify(dummyUser));

      return {
        user: dummyUser,
        token,
        studentId: 'stu-21cs1084'
      };
    },

    register: async (userData: any) => {
      const user = {
        id: `usr_${Date.now()}`,
        name: userData.name || 'New User',
        email: userData.email,
        role: userData.role || 'STUDENT'
      };
      const token = `jwt_mock_${Date.now()}`;
      this.setToken(token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      return { user, token, studentId: `stu-${Date.now().toString().slice(-4)}` };
    },

    registerExternal: async (userData: { name: string; email: string; password?: string; department?: string; batchYear?: number }) => {
      return {
        message: 'Registration successful. Verification code generated.',
        email: userData.email,
        simulatedVerificationCode: '123456'
      };
    },

    verifyEmail: async (email: string, _code: string) => {
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

    me: async () => {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        return { user: JSON.parse(saved), studentId: 'stu-21cs1084' };
      }
      return {
        user: { id: 'usr_guest', name: 'Aravind Kumar', email: 'aravind.k@college.edu', role: 'STUDENT' },
        studentId: 'stu-21cs1084'
      };
    }
  };

  // STUDENT PROFILE
  student = {
    getProfile: async (_studentId: string): Promise<StudentProfile> => {
      return this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
    },

    updateProfile: async (_studentId: string, updates: Partial<StudentProfile>): Promise<StudentProfile> => {
      const current = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      const updated = { ...current, ...updates };
      this.setStorage('student_profile', updated);
      return updated;
    },

    updateCodingHandles: async (_studentId: string, handles: CodingHandles): Promise<void> => {
      const current = this.getStorage<StudentProfile>('student_profile', INITIAL_STUDENT_PROFILE);
      current.codingHandles = { ...current.codingHandles, ...handles };
      this.setStorage('student_profile', current);
    },

    uploadResume: async (
      _studentId: string, 
      payload: FormData | { resumeText: string; fileName?: string } | ParsedResume
    ): Promise<ParsedResume> => {
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

  // TASKS
  tasks = {
    toggleTask: async (_studentId: string, taskId: string): Promise<boolean> => {
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

  // INTERVIEW ROOM (Direct Groq + Client-Side Evaluator)
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

      // 1. Calculate speech metrics client-side
      const words = studentAnswer.trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const calcWpm = Math.max(90, Math.min(160, Math.round((wordCount / Math.max(durationSeconds, 8)) * 60)));

      // Detect common fillers
      const lower = studentAnswer.toLowerCase();
      const fillers: Record<string, number> = {};
      ['uh', 'um', 'like', 'basically', 'actually'].forEach(f => {
        const regex = new RegExp(`\\b${f}\\b`, 'g');
        const matches = lower.match(regex);
        if (matches) fillers[f] = matches.length;
      });
      const totalFillers = Object.values(fillers).reduce((a, b) => a + b, 0);

      // Default scores
      let technicalScore = 84;
      let communicationScore = 80;
      let feedback = "Clear technical articulation with good awareness of system tradeoffs.";
      let strengths = "Good structural explanation and confident terminology.";
      let weaknesses = "Can elaborate more on edge-case failure mitigation.";

      // 2. Direct Groq evaluation if API key is present
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

      // Check if session completed (3 turns max)
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

    getReport: async (_sessionId: string): Promise<DiagnosticReport> => {
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

  // LISTENING COMPREHENSION
  listening = {
    start: async (_studentId: string) => {
      return {
        sessionId: `lis_${Date.now()}`,
        passage: LISTENING_PASSAGE,
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

    submitAnswers: async (_sessionId: string, answers: any[]) => {
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

  // SUGGESTION SYSTEM CHATBOT
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

  // ADMIN PORTALS
  admin = {
    getCoordinatorStats: async () => {
      const students = this.getStorage<any[]>('admin_students', MOCK_MENTEES_LIST);
      const totalCandidates = students.length;
      const hopeEliteCount = students.filter(s => s.track === 'HOPE' && s.isElite).length;
      const pepTotalCount = students.filter(s => s.track === 'PEP').length;

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
      return {
        programAdminsCount: 8,
        facultyMentorsCount: 24,
        trainersCount: 12,
        studentsCount: 320
      };
    },

    getProgramAdmins: async (): Promise<any[]> => {
      return this.getStorage<any[]>('admin_program_admins', [
        { id: 'pa-1', name: 'Dr. K. Swaminathan', email: 'swaminathan@college.edu', track: 'HOPE_ELITE', department: 'CSE', createdAt: '2026-01-10' },
        { id: 'pa-2', name: 'Prof. Meera Deshmukh', email: 'meera.d@college.edu', track: 'PEP', department: 'ECE', createdAt: '2026-02-15' }
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
      const newStudent = { id: `stu_${Date.now()}`, ...data };
      students.push(newStudent);
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

    getStudentFullHistory: async (_studentId: string) => {
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

    getAssignments: async (): Promise<InterviewAssignment[]> => {
      return this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
    },

    createAssignment: async (asg: Omit<InterviewAssignment, 'id'>): Promise<InterviewAssignment> => {
      const list = this.getStorage<InterviewAssignment[]>('assignments', MOCK_ASSIGNMENTS);
      const newAsg = { id: `asg_${Date.now()}`, ...asg };
      list.push(newAsg);
      this.setStorage('assignments', list);
      return newAsg;
    },

    getPepDomains: async (): Promise<string[]> => {
      return PEP_DOMAINS;
    }
  };
}

export const api = new ApiClient();
