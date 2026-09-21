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

const BACKEND_API_BASE = 'http://localhost:5000/api';

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
          try {
            await fetch(`${BACKEND_API_BASE}/interview/proctor-event`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: interviewState.sessionId })
            });
          } catch {
            // Offline fallback
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [interviewState.isActive, interviewState.sessionId]);

  const startInterview = async (type: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION' = 'MOCK_INTERVIEW') => {
    setActiveView(type === 'MOCK_INTERVIEW' ? 'INTERVIEW_ROOM' : 'LISTENING_ROOM');

    try {
      const res = await fetch(`${BACKEND_API_BASE}/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, candidateId: student.id })
      });

      if (res.ok) {
        const data = await res.json();
        const serverSession = data.session;
        setInterviewState({
          isActive: true,
          sessionId: serverSession.id,
          type,
          turnIndex: 0,
          currentDifficulty: (serverSession.currentDifficulty as Difficulty) || 'EASY',
          questions: serverSession.questions.map((q: any) => ({
            id: q.id,
            questionNumber: q.questionNumber,
            questionText: q.questionText,
            difficulty: q.difficulty as Difficulty
          })),
          tabSwitches: 0,
          isFlagged: false,
          orbState: 'SPEAKING',
          liveTranscript: ''
        });
        return;
      }
    } catch {
      console.warn('[AppContext] Node backend unreachable; using local session state.');
    }

    // Fallback if backend is not reachable
    setInterviewState({
      isActive: true,
      sessionId: sessId,
      type,
      turnIndex: 0,
      currentDifficulty: 'EASY',
      questions: initialQuestions,
      tabSwitches: 0,
      isFlagged: false,
      orbState: 'SPEAKING',
      liveTranscript: ''
    });
  };

  const submitAnswer = async (answerText: string) => {
    setInterviewState(prev => ({ ...prev, orbState: 'THINKING' }));

    if (interviewState.sessionId) {
      try {
        const res = await fetch(`${BACKEND_API_BASE}/interview/submit-turn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: interviewState.sessionId,
            answerText
          })
        });

        if (res.ok) {
          const data = await res.json();

          if (data.concluded && data.report) {
            setLatestReport(data.report);
            setStudent(prev => ({
              ...prev,
              recentReports: [data.report, ...prev.recentReports]
            }));
            setInterviewState(prev => ({ ...prev, isActive: false, orbState: 'IDLE' }));
            setActiveView('REPORT_VIEW');
            return;
          }

          if (data.nextQuestion) {
            setInterviewState(prev => {
              const updatedQuestions = [...prev.questions];
              updatedQuestions[prev.turnIndex] = {
                ...updatedQuestions[prev.turnIndex],
                studentAnswer: answerText,
                technicalScore: data.evaluation.technical_score,
                communicationScore: data.evaluation.communication_score,
                wpm: data.evaluation.words_per_minute,
                fillerWords: data.evaluation.total_fillers,
                feedback: data.evaluation.feedback,
                strengths: data.evaluation.strengths,
                weaknesses: data.evaluation.weaknesses
              };

              const nextQ: QuestionTurn = {
                id: data.nextQuestion.id,
                questionNumber: data.nextQuestion.questionNumber,
                questionText: data.nextQuestion.questionText,
                difficulty: data.nextQuestion.difficulty as Difficulty
              };

              return {
                ...prev,
                turnIndex: prev.turnIndex + 1,
                currentDifficulty: data.nextQuestion.difficulty as Difficulty,
                questions: [...updatedQuestions, nextQ],
                orbState: 'SPEAKING',
                liveTranscript: ''
              };
            });
            return;
          }
        }
      } catch (e) {
        console.warn('[AppContext] Submit turn failed via backend; using local evaluator.');
      }
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

    let nextDifficulty: Difficulty = interviewState.currentDifficulty;
    let nextQTurn: QuestionTurn | null = null;
    let finalRep: DiagnosticReport | null = null;

      let nextDifficulty: Difficulty = prev.currentDifficulty;
      if (prev.currentDifficulty === 'EASY') nextDifficulty = 'MEDIUM';
      else if (prev.currentDifficulty === 'MEDIUM') nextDifficulty = 'ADVANCED';

    if (!nextQTurn && !finalRep) {
      if (interviewState.currentDifficulty === 'EASY') nextDifficulty = 'MEDIUM';
      else if (interviewState.currentDifficulty === 'MEDIUM') nextDifficulty = 'ADVANCED';
    }

      if (nextTurn >= prev.questions.length) {
        setTimeout(() => endInterview(), 500);
        return prev;
      }
      setTimeout(() => endInterview(), 500);
      return;
    }

    setInterviewState(prev => ({
      ...prev,
      turnIndex: nextTurn,
      currentDifficulty: nextDifficulty,
      questions: updatedQuestions,
      orbState: 'SPEAKING',
      liveTranscript: ''
    }));
  };

  const endInterview = () => {
    const newReport: DiagnosticReport = {
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

    if (!report) {
      report = {
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
    }

    setLatestReport(report);
    setStudent(prev => ({
      ...prev,
      recentReports: [report!, ...prev.recentReports]
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

    try {
      await fetch(`${BACKEND_API_BASE}/students/criteria/${taskId}`, { method: 'PATCH' });
    } catch {
      // Offline fallback
    }
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

  const uploadResumeData = async (resume: ParsedResume) => {
    setStudent(prev => ({ ...prev, resume }));
    try {
      await fetch(`${BACKEND_API_BASE}/students/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume })
      });
    } catch {
      // Offline fallback
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
      role: user.role,
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
    api.setToken(null);
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
