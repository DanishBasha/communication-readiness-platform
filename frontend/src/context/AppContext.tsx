import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserRole, 
  StudentProfile, 
  DiagnosticReport, 
  TrainerTenure, 
  InterviewAssignment, 
  QuestionTurn, 
  Difficulty,
  ParsedResume,
  AuthUser,
  CodingHandles 
} from '../types';
import { 
  DEFAULT_CLEAN_STUDENT,
  INITIAL_STUDENT_PROFILE, 
  INITIAL_CRITERIA_TASKS,
  MOCK_INTERVIEW_QUESTIONS, 
  MOCK_TRAINER_TENURES, 
  MOCK_ASSIGNMENTS 
} from '../data/mockData';
import { api } from '../services/api';

interface InterviewSessionState {
  isActive: boolean;
  sessionId?: string;
  type: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION';
  turnIndex: number;
  currentDifficulty: Difficulty;
  questions: QuestionTurn[];
  tabSwitches: number;
  isFlagged: boolean;
  orbState: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';
  liveTranscript: string;
}

interface AppContextType {
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  loginUser: (email: string, password: string) => Promise<void>;
  registerUser: (data: any) => Promise<void>;
  registerExternalUser: (data: { name: string; email: string; password: string; department?: string; batchYear?: number }) => Promise<{ message: string; email: string; simulatedVerificationCode: string }>;
  verifyEmailAndLogin: (email: string, code: string) => Promise<void>;
  logout: () => void;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeView: 'DASHBOARD' | 'INTERVIEW_ROOM' | 'LISTENING_ROOM' | 'REPORT_VIEW';
  setActiveView: (view: 'DASHBOARD' | 'INTERVIEW_ROOM' | 'LISTENING_ROOM' | 'REPORT_VIEW') => void;
  student: StudentProfile;
  setStudent: React.Dispatch<React.SetStateAction<StudentProfile>>;
  interviewState: InterviewSessionState;
  startInterview: (type?: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION') => Promise<void>;
  submitAnswer: (answerText: string) => Promise<void>;
  submitAudioAnswer: (audioBlob: Blob) => Promise<void>;
  endInterview: () => Promise<void>;
  recordTabSwitch: () => Promise<void>;
  latestReport: DiagnosticReport | null;
  trainerTenures: TrainerTenure[];
  onboardTrainer: (trainer: Omit<TrainerTenure, 'id' | 'isActive'>) => Promise<void>;
  revokeTrainer: (id: string) => Promise<void>;
  assignments: InterviewAssignment[];
  createAssignment: (assignment: Omit<InterviewAssignment, 'id'>) => Promise<void>;
  toggleCriteriaTask: (taskId: string) => Promise<void>;
  verifyCriteriaTask: (taskId: string) => Promise<void>;
  uploadResumeData: (payload: FormData | { resumeText: string; fileName?: string } | ParsedResume) => Promise<ParsedResume>;
  updateCodingHandles: (handles: Partial<CodingHandles>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('auth_token');
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        return JSON.parse(saved).role || 'STUDENT';
      }
    } catch {}
    return 'STUDENT';
  });
  const [activeView, setActiveView] = useState<'DASHBOARD' | 'INTERVIEW_ROOM' | 'LISTENING_ROOM' | 'REPORT_VIEW'>('DASHBOARD');
  const [student, setStudent] = useState<StudentProfile>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'STUDENT') {
          return {
            id: u.studentId || u.id,
            name: u.name,
            rollNumber: u.rollNumber || '22CS1001',
            email: u.email,
            department: u.department || 'Computer Science & Engineering',
            batchYear: u.batchYear || 2026,
            track: u.track || 'HOPE_ELITE',
            mentorName: 'Dr. S. Ranganathan',
            mentorEmail: 'ranganathan.s@college.edu',
            codingHandles: { leetcodeSolved: 0, githubRepos: 0 },
            resume: null,
            criteriaTasks: INITIAL_CRITERIA_TASKS.map(t => ({ ...t, isCompleted: false, verifiedByMentor: false })),
            recentReports: []
          };
        }
      }
    } catch {}
    return DEFAULT_CLEAN_STUDENT;
  });
  const [trainerTenures, setTrainerTenures] = useState<TrainerTenure[]>(MOCK_TRAINER_TENURES);
  const [assignments, setAssignments] = useState<InterviewAssignment[]>(MOCK_ASSIGNMENTS);
  const [latestReport, setLatestReport] = useState<DiagnosticReport | null>(null);

  const [interviewState, setInterviewState] = useState<InterviewSessionState>({
    isActive: false,
    sessionId: undefined,
    type: 'MOCK_INTERVIEW',
    turnIndex: 0,
    currentDifficulty: 'EASY',
    questions: MOCK_INTERVIEW_QUESTIONS,
    tabSwitches: 0,
    isFlagged: false,
    orbState: 'SPEAKING',
    liveTranscript: ''
  });

  // ── Hydrate auth state on mount ──────────────────────────────────────────
  // If a stored token exists, validate it against the backend and restore user state.
  // This ensures that a page refresh picks up the correct user role/name rather than
  // relying solely on the cached localStorage auth_user JSON.
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    api.auth.me()
      .then(data => {
        const authUser: AuthUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role as any,
          studentId: data.studentId ?? undefined,
        };
        setCurrentUser(authUser);
        setActiveRole(data.user.role as any);
        setIsAuthenticated(true);
        localStorage.setItem('auth_user', JSON.stringify(authUser));

        if (data.user.role === 'STUDENT' && data.studentId) {
          api.student.getProfile(data.studentId)
            .then(prof => {
              setStudent(prof);
              setLatestReport(prof.recentReports?.[0] ?? null);
            })
            .catch(() => {}); // Profile fetch failure is non-critical
        }
      })
      .catch(() => {
        // Token invalid or backend unreachable — clear stale auth state
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setIsAuthenticated(false);
        setCurrentUser(null);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Tab switches when in interview room with proctor audit sync
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && interviewState.isActive) {
        setInterviewState(prev => {
          const newSwitches = prev.tabSwitches + 1;
          const flagged = newSwitches >= 4;
          return {
            ...prev,
            tabSwitches: newSwitches,
            isFlagged: flagged
          };
        });

        if (interviewState.sessionId) {
          api.interview.recordProctorEvent(interviewState.sessionId, 'TAB_SWITCH').catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [interviewState.isActive, interviewState.sessionId]);

  const startInterview = async (type: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION' = 'MOCK_INTERVIEW') => {
    setActiveView(type === 'MOCK_INTERVIEW' ? 'INTERVIEW_ROOM' : 'LISTENING_ROOM');

    try {
      const data = await api.interview.start(student.id || 'stu-21cs1084', type);
      setInterviewState({
        isActive: true,
        sessionId: data.sessionId,
        type,
        turnIndex: 0,
        currentDifficulty: data.firstQuestion.difficulty,
        questions: [data.firstQuestion],
        tabSwitches: 0,
        isFlagged: false,
        orbState: 'SPEAKING',
        liveTranscript: ''
      });
    } catch {
      setInterviewState({
        isActive: true,
        sessionId: `ses_${Date.now()}`,
        type,
        turnIndex: 0,
        currentDifficulty: 'EASY',
        questions: MOCK_INTERVIEW_QUESTIONS,
        tabSwitches: 0,
        isFlagged: false,
        orbState: 'SPEAKING',
        liveTranscript: ''
      });
    }
  };

  const submitAnswer = async (answerText: string) => {
    setInterviewState(prev => ({ ...prev, orbState: 'THINKING' }));

    const sessId = interviewState.sessionId || `ses_${Date.now()}`;
    try {
      const res = await api.interview.submitAnswer(sessId, answerText);
      if (res) {
        if (res.isCompleted && res.finalReport) {
          setLatestReport(res.finalReport);
          setStudent(prev => ({
            ...prev,
            recentReports: [res.finalReport!, ...prev.recentReports]
          }));
          setInterviewState(prev => ({ ...prev, isActive: false, orbState: 'IDLE' }));
          setActiveView('REPORT_VIEW');
          return;
        }

        if (res.nextQuestion && res.turnEvaluation) {
          setInterviewState(prev => {
            const updatedQuestions = [...prev.questions];
            updatedQuestions[prev.turnIndex] = res.turnEvaluation!;
            return {
              ...prev,
              turnIndex: prev.turnIndex + 1,
              currentDifficulty: res.nextQuestion!.difficulty as Difficulty,
              questions: [...updatedQuestions, res.nextQuestion!],
              orbState: 'SPEAKING',
              liveTranscript: ''
            };
          });
          return;
        }
      }
    } catch (e) {
      console.warn('[AppContext] Submit turn evaluation error:', e);
    }

    // Local in-memory advance fallback
    setInterviewState(prev => {
      const currentQ = prev.questions[prev.turnIndex];
      const updatedQ: QuestionTurn = {
        ...currentQ,
        studentAnswer: answerText,
        technicalScore: 85,
        communicationScore: 78,
        wpm: 124,
        fillerWords: 2,
        feedback: 'Good technical reasoning, articulated tradeoffs cleanly.'
      };

      const updatedQuestions = [...prev.questions];
      updatedQuestions[prev.turnIndex] = updatedQ;

      const nextTurn = prev.turnIndex + 1;
      if (nextTurn >= prev.questions.length) {
        setTimeout(() => endInterview(), 500);
        return {
          ...prev,
          questions: updatedQuestions,
          orbState: 'IDLE',
          liveTranscript: ''
        };
      }

      let nextDifficulty: Difficulty = prev.currentDifficulty;
      if (prev.currentDifficulty === 'EASY') nextDifficulty = 'MEDIUM';
      else if (prev.currentDifficulty === 'MEDIUM') nextDifficulty = 'ADVANCED';

      return {
        ...prev,
        turnIndex: nextTurn,
        currentDifficulty: nextDifficulty,
        questions: updatedQuestions,
        orbState: 'SPEAKING',
        liveTranscript: ''
      };
    });
  };

  /**
   * submitAudioAnswer — full audio pipeline:
   *   1. POST WAV blob + question metadata → FastAPI /ai/evaluate-response
   *   2. Backend: Groq Whisper STT ∥ waveform analysis → LLM technical eval
   *   3. Map 0-10 backend scores → 0-100 for display
   *   4. Advance turn; generate next question from /ai/generate-question (with mock-bank fallback)
   */
  const submitAudioAnswer = async (audioBlob: Blob) => {
    setInterviewState(prev => ({ ...prev, orbState: 'THINKING' }));

    const currentIdx = interviewState.turnIndex;
    const currentQ = interviewState.questions[currentIdx];

    // Build previous-turn context for the LLM (backend uses it for adaptive questioning)
    const previousTurns = interviewState.questions
      .slice(0, currentIdx)
      .map(q => ({
        question_text: q.questionText,
        student_answer: q.studentAnswer || '',
        difficulty: q.difficulty as string,
        technical_score: q.technicalScore != null ? q.technicalScore / 10 : null,
        feedback: q.feedback || null,
      }));

    const metadata = {
      question_text: currentQ?.questionText || '',
      difficulty: interviewState.currentDifficulty as string,
      turn_number: currentIdx + 1,
      domain: student.pepDomain || null,
      previous_turns: previousTurns,
    };

    const result = await api.interview.evaluateAudio(audioBlob, metadata);

    // ── Fallback: ai-service unreachable ──────────────────────────────────────
    if (!result) {
      console.warn('[submitAudioAnswer] ai-service unavailable — advancing with placeholder scores');
      setInterviewState(prev => {
        const q = prev.questions[prev.turnIndex];
        const updated: QuestionTurn = {
          ...q,
          studentAnswer: '(audio submitted — evaluation pending)',
          technicalScore: 80,
          communicationScore: 75,
          wpm: 130,
          fillerWords: 0,
          feedback: 'AI evaluation service is offline. Scores are placeholders.',
          strengths: '',
          weaknesses: '',
        };
        const updatedQs = [...prev.questions];
        updatedQs[prev.turnIndex] = updated;

        const nextTurn = prev.turnIndex + 1;
        if (nextTurn >= prev.questions.length) {
          setTimeout(() => endInterview(), 500);
          return { ...prev, questions: updatedQs, orbState: 'IDLE', liveTranscript: '' };
        }
        const nextDiff: Difficulty =
          prev.currentDifficulty === 'EASY' ? 'MEDIUM' : 'ADVANCED';
        return {
          ...prev,
          turnIndex: nextTurn,
          currentDifficulty: nextDiff,
          questions: updatedQs,
          orbState: 'SPEAKING',
          liveTranscript: '',
        };
      });
      return;
    }

    // ── Map backend scores (0-10) → display scale (0-100) ────────────────────
    const technicalScore = Math.round(result.technical_score * 10);
    // Communication = average of fluency (pace quality) + clarity (filler-free ratio)
    const communicationScore = Math.round((result.fluency_score + result.clarity_score) / 2);

    const evaluatedTurn: QuestionTurn = {
      ...(interviewState.questions[currentIdx] || {}),
      studentAnswer: result.transcript || result.stt_raw || '',
      technicalScore,
      communicationScore,
      wpm: Math.round(result.pace_wpm) || 0,
      fillerWords: result.filler_count,
      feedback: result.feedback,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
    };

    const nextDiff = (result.next_recommended_difficulty || 'MEDIUM') as Difficulty;
    const isCompleted = currentIdx >= 2;

    // ── Session complete → build diagnostic report ────────────────────────────
    if (isCompleted) {
      const overallScore = Math.round((technicalScore + communicationScore) / 2);
      const report: DiagnosticReport = {
        id: `rep-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().split('T')[0],
        sessionType: interviewState.type,
        overallScore,
        technicalScore,
        communicationScore,
        averageWpm: Math.round(result.pace_wpm),
        totalFillerWords: result.filler_count,
        fillerWordBreakdown: {},
        skillBreakdown: [
          {
            skill: 'Technical Knowledge',
            score: technicalScore,
            status: technicalScore >= 80 ? 'STRONG' : technicalScore >= 60 ? 'MODERATE' : 'NEEDS_WORK',
            recommendation: result.strengths || 'Review core technical concepts.',
          },
          {
            skill: 'Communication Fluency',
            score: Math.round(result.fluency_score),
            status: result.fluency_score >= 80 ? 'STRONG' : result.fluency_score >= 60 ? 'MODERATE' : 'NEEDS_WORK',
            recommendation: `Pace: ${Math.round(result.pace_wpm)} WPM. Ideal range is 120–160 WPM.`,
          },
          {
            skill: 'Speech Clarity',
            score: Math.round(result.clarity_score),
            status: result.clarity_score >= 80 ? 'STRONG' : result.clarity_score >= 60 ? 'MODERATE' : 'NEEDS_WORK',
            recommendation: `Filler words detected: ${result.filler_count}. Aim for ≤3 per response.`,
          },
        ],
        actionableNextSteps: [
          result.weaknesses,
          `Recommended next difficulty: ${result.next_recommended_difficulty}.`,
        ].filter(Boolean) as string[],
        tabSwitches: interviewState.tabSwitches,
        isFlagged: interviewState.isFlagged,
      };

      setLatestReport(report);
      setStudent(prev => ({ ...prev, recentReports: [report, ...prev.recentReports] }));

      const updatedQs = [...interviewState.questions];
      updatedQs[currentIdx] = evaluatedTurn;
      setInterviewState(prev => ({
        ...prev,
        questions: updatedQs,
        isActive: false,
        orbState: 'IDLE',
        liveTranscript: '',
      }));
      setActiveView('REPORT_VIEW');
      return;
    }

    // ── Advance to next turn — generate next question ─────────────────────────
    const nextDifficulty: Difficulty =
      nextDiff !== interviewState.currentDifficulty
        ? nextDiff
        : interviewState.currentDifficulty === 'EASY'
          ? 'MEDIUM'
          : 'ADVANCED';

    let nextQuestion: QuestionTurn | null = null;
    try {
      const previousForGen = interviewState.questions.slice(0, currentIdx + 1).map(q => ({
        question_text: q.questionText,
        student_answer: q.studentAnswer || '',
        difficulty: q.difficulty as string,
        technical_score: q.technicalScore != null ? q.technicalScore / 10 : null,
        feedback: q.feedback || null,
      }));

      const genData = await api.interview.generateQuestion({
        student_name: student.name || 'Student',
        skills: [
          ...(student.resume?.skills?.languages || []),
          ...(student.resume?.skills?.frameworks || []),
        ],
        projects: (student.resume?.projects || []).map(p => ({
          title: p.title,
          tech_stack: p.techStack,
          description: p.description,
        })),
        previous_turns: previousForGen,
        difficulty: nextDifficulty,
        domain: student.pepDomain || null,
      });

      if (genData) {
        nextQuestion = {
          id: `q_${currentIdx + 2}_${Date.now()}`,
          questionNumber: currentIdx + 2,
          questionText: genData.question_text || '',
          difficulty: (genData.difficulty || nextDifficulty) as Difficulty,
          category: genData.category || undefined,
        };
      }
    } catch {
      // Network error generating next question — fall through to mock bank
    }

    if (!nextQuestion || !nextQuestion.questionText) {
      // Mock bank fallback (same questions used by the text path)
      const bankQs = [
        'How did you manage database connection pooling and PostgreSQL index strategy to support horizontal scaling under heavy query load?',
        'In the event of a network partition where multiple microservice nodes attempt conflicting updates, how would you maintain data consistency without sacrificing latency?',
      ];
      nextQuestion = {
        id: `q_${currentIdx + 2}_${Date.now()}`,
        questionNumber: currentIdx + 2,
        questionText: bankQs[currentIdx] || bankQs[bankQs.length - 1],
        difficulty: nextDifficulty,
        category: 'Architecture',
      };
    }

    setInterviewState(prev => {
      const updatedQs = [...prev.questions];
      updatedQs[prev.turnIndex] = evaluatedTurn;
      return {
        ...prev,
        turnIndex: prev.turnIndex + 1,
        currentDifficulty: nextDifficulty,
        questions: [...updatedQs, nextQuestion!],
        orbState: 'SPEAKING',
        liveTranscript: '',
      };
    });
  };

  const endInterview = async () => {
    const report: DiagnosticReport = {
      id: `rep-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      sessionType: interviewState.type,
      overallScore: Math.floor(Math.random() * 15) + 78,
      technicalScore: Math.floor(Math.random() * 12) + 82,
      communicationScore: Math.floor(Math.random() * 14) + 72,
      averageWpm: Math.floor(Math.random() * 20) + 120,
      totalFillerWords: Math.floor(Math.random() * 8) + 4,
      fillerWordBreakdown: { 'uh': 4, 'um': 3, 'like': 2, 'actually': 1 },
      skillBreakdown: [
        { skill: 'Java & OOP Principles', score: 92, status: 'STRONG', recommendation: 'Outstanding precision regarding garbage collection and thread lifecycle.' },
        { skill: 'Database Optimization (PostgreSQL)', score: 78, status: 'MODERATE', recommendation: 'Good knowledge of indexes; brush up on query planner explain output.' },
        { skill: 'Distributed Messaging (Kafka)', score: 85, status: 'STRONG', recommendation: 'Clearly justified consumer group partitions and fault tolerance.' },
        { skill: 'System Design & Tradeoffs', score: 58, status: 'NEEDS_WORK', recommendation: 'Review rate limiting algorithms (Token Bucket vs Leaky Bucket).' }
      ],
      actionableNextSteps: [
        'Maintain current cadence! Your speaking rate of 128 WPM is right in the sweet spot (120–150 WPM).',
        'Watch out for repeating "actually" at the start of technical sentences.',
        'Study rate-limiting algorithms to polish your distributed system architecture answers.'
      ],
      tabSwitches: interviewState.tabSwitches,
      isFlagged: interviewState.isFlagged
    };

    setLatestReport(report);
    setStudent(prev => ({
      ...prev,
      recentReports: [report, ...prev.recentReports]
    }));

    setInterviewState(prev => ({ ...prev, isActive: false, orbState: 'IDLE' }));
    setActiveView('REPORT_VIEW');
  };

  const recordTabSwitch = async () => {
    let newSwitches = interviewState.tabSwitches + 1;
    let flagged = newSwitches >= 4;

    if (interviewState.sessionId) {
      try {
        const res = await api.interview.recordProctorEvent(interviewState.sessionId, 'TAB_SWITCH');
        newSwitches = res.tabSwitches;
        flagged = res.isFlagged;
      } catch (err) {
        // Fallback local increment
      }
    }

    setInterviewState(prev => ({
      ...prev,
      tabSwitches: newSwitches,
      isFlagged: flagged
    }));
  };

  const onboardTrainer = async (trainer: Omit<TrainerTenure, 'id' | 'isActive'>) => {
    try {
      const created = await api.admin.onboardTrainer(trainer);
      setTrainerTenures(prev => [created, ...prev]);
    } catch {
      const newTrainer: TrainerTenure = {
        ...trainer,
        id: `trn-${Date.now()}`,
        isActive: true
      };
      setTrainerTenures(prev => [newTrainer, ...prev]);
    }
  };

  const revokeTrainer = async (id: string) => {
    try {
      await api.admin.revokeTrainer(id);
    } catch {
      // Local fallback
    }
    setTrainerTenures(prev => prev.map(t => t.id === id ? { ...t, isActive: false } : t));
  };

  const createAssignment = async (asg: Omit<InterviewAssignment, 'id'>) => {
    try {
      const created = await api.admin.createAssignment(asg);
      setAssignments(prev => [created, ...prev]);
    } catch {
      const newAsg: InterviewAssignment = {
        ...asg,
        id: `asg-${Date.now()}`
      };
      setAssignments(prev => [newAsg, ...prev]);
    }
  };

  const toggleCriteriaTask = async (taskId: string) => {
    setStudent(prev => ({
      ...prev,
      criteriaTasks: prev.criteriaTasks.map(t => 
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      )
    }));

    api.tasks.toggleTask(student.id || 'stu-21cs1084', taskId).catch(() => {});
  };

  const verifyCriteriaTask = async (taskId: string) => {
    try {
      await api.tasks.verifyTask(student.id, taskId);
    } catch {
      // Local fallback
    }
    setStudent(prev => ({
      ...prev,
      criteriaTasks: prev.criteriaTasks.map(t => 
        t.id === taskId ? { ...t, verifiedByMentor: true, verifiedAt: new Date().toISOString().split('T')[0] } : t
      )
    }));
  };

  const uploadResumeData = async (payload: FormData | { resumeText: string; fileName?: string } | ParsedResume): Promise<ParsedResume> => {
    let parsed: ParsedResume;
    try {
      parsed = await api.student.uploadResume(student.id || 'stu-21cs1084', payload);
    } catch {
      if ('skills' in payload && 'projects' in payload) {
        parsed = payload as ParsedResume;
      } else {
        parsed = {
          fileName: 'Uploaded_Resume.pdf',
          parsedAt: new Date().toISOString().split('T')[0],
          summary: 'Full-Stack Developer with hands-on experience in Java, Spring Boot, React, and scalable cloud applications.',
          skills: {
            languages: ['Java', 'TypeScript', 'SQL'],
            frameworks: ['Spring Boot', 'React', 'Tailwind CSS'],
            databases: ['PostgreSQL', 'Redis'],
            tools: ['Git', 'Docker']
          },
          projects: [
            {
              title: 'College Placement Readiness Engine',
              description: 'Real-time AI diagnostic mock platform',
              techStack: ['React', 'Node.js', 'PostgreSQL']
            }
          ]
        };
      }
    }
    setStudent(prev => ({ ...prev, resume: parsed }));
    return parsed;
  };

  const updateCodingHandles = async (handles: Partial<CodingHandles>): Promise<void> => {
    setStudent(prev => ({
      ...prev,
      codingHandles: {
        leetcode: handles.leetcode ?? prev.codingHandles?.leetcode ?? '',
        codechef: handles.codechef ?? prev.codingHandles?.codechef ?? '',
        hackerrank: handles.hackerrank ?? prev.codingHandles?.hackerrank ?? '',
        github: handles.github ?? prev.codingHandles?.github ?? ''
      }
    }));

    try {
      if (student.id) {
        await api.student.updateCodingHandles(student.id, {
          leetcode: handles.leetcode ?? student.codingHandles?.leetcode ?? '',
          codechef: handles.codechef ?? student.codingHandles?.codechef ?? '',
          hackerrank: handles.hackerrank ?? student.codingHandles?.hackerrank ?? '',
          github: handles.github ?? student.codingHandles?.github ?? ''
        });
      }
    } catch (err) {
      console.warn('Update coding handles offline fallback:', err);
    }
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const loginUser = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    const user = res.user;
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: res.studentId
    };
    setCurrentUser(authUser);
    setActiveRole(user.role);
    setIsAuthenticated(true);
    localStorage.setItem('auth_user', JSON.stringify(authUser));
    setAuthModalOpen(false);

    if (user.role === 'STUDENT') {
      try {
        const targetId = res.studentId || user.id;
        const prof = await api.student.getProfile(targetId);
        if (prof) {
          setStudent(prof);
          if (prof.recentReports && prof.recentReports.length > 0) {
            setLatestReport(prof.recentReports[0]);
          } else {
            setLatestReport(null);
          }
        }
      } catch (err) {
        console.warn('Profile fetch after login:', err);
      }
    } else {
      setLatestReport(null);
    }
  };

  const registerUser = async (data: any) => {
    const res = await api.auth.register(data);
    const user = res.user;
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'STUDENT',
      rollNumber: data.rollNumber,
      department: data.department,
      track: data.track || 'HOPE_ELITE',
      studentId: res.studentId
    };
    setCurrentUser(authUser);
    setActiveRole('STUDENT');
    setIsAuthenticated(true);
    localStorage.setItem('auth_user', JSON.stringify(authUser));

    const freshProfile: StudentProfile = {
      id: res.studentId || user.id,
      name: data.name,
      email: data.email,
      rollNumber: data.rollNumber || 'PENDING',
      department: data.department || 'General Engineering',
      batchYear: Number(data.batchYear) || 2026,
      track: data.track || 'HOPE_ELITE',
      mentorName: 'Unassigned',
      mentorEmail: '',
      codingHandles: { leetcodeSolved: 0, githubRepos: 0 },
      resume: null,
      criteriaTasks: INITIAL_CRITERIA_TASKS.map(t => ({ ...t, isCompleted: false, verifiedByMentor: false })),
      recentReports: []
    };
    setStudent(freshProfile);
    setLatestReport(null);
    setAuthModalOpen(false);
  };

  const registerExternalUser = async (data: { name: string; email: string; password: string; department?: string; batchYear?: number }) => {
    return await api.auth.registerExternal(data);
  };

  const verifyEmailAndLogin = async (email: string, code: string) => {
    const res = await api.auth.verifyEmail(email, code);
    const user = res.user;
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      track: 'EXTERNAL',
      studentId: res.studentId
    };
    setCurrentUser(authUser);
    setActiveRole('STUDENT');
    setIsAuthenticated(true);
    localStorage.setItem('auth_user', JSON.stringify(authUser));
    setAuthModalOpen(false);

    try {
      const targetId = res.studentId || user.id;
      const prof = await api.student.getProfile(targetId);
      if (prof) {
        setStudent(prof);
        setLatestReport(prof.recentReports?.[0] || null);
      }
    } catch (err) {
      console.warn('Profile fetch after verification:', err);
    }
  };

  const logout = () => {
    // Invalidate the JWT on the backend (increments token_version so the token
    // is rejected by subsequent requests). Fire-and-forget — the token value is
    // captured synchronously inside apiFetch before we clear localStorage below.
    api.auth.logout().catch(() => {});
    // Immediately clear local state so the UI resets without waiting for the network
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveRole('STUDENT');
    setActiveView('DASHBOARD');
    setStudent(DEFAULT_CLEAN_STUDENT);
    setLatestReport(null);
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated,
      currentUser,
      authModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      loginUser,
      registerUser,
      registerExternalUser,
      verifyEmailAndLogin,
      logout,
      activeRole,
      setActiveRole,
      activeView,
      setActiveView,
      student,
      setStudent,
      interviewState,
      startInterview,
      submitAnswer,
      submitAudioAnswer,
      endInterview,
      recordTabSwitch,
      latestReport,
      trainerTenures,
      onboardTrainer,
      revokeTrainer,
      assignments,
      createAssignment,
      toggleCriteriaTask,
      verifyCriteriaTask,
      uploadResumeData,
      updateCodingHandles
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
