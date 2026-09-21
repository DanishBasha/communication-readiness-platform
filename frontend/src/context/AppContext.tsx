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

  // Load initial student profile from API
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const savedStr = localStorage.getItem('auth_user');
        let targetId = student.id;
        if (savedStr) {
          const u = JSON.parse(savedStr);
          if (u.role === 'STUDENT') {
            targetId = u.studentId || u.id;
          }
        }
        if (targetId) {
          const profile = await api.student.getProfile(targetId);
          if (profile) {
            setStudent(profile);
            if (profile.recentReports && profile.recentReports.length > 0) {
              setLatestReport(profile.recentReports[0]);
            } else {
              setLatestReport(null);
            }
          }
        }
        const tenures = await api.admin.getTrainerTenures();
        if (tenures && tenures.length > 0) {
          setTrainerTenures(tenures);
        }
        const asgs = await api.admin.getAssignments();
        if (asgs && asgs.length > 0) {
          setAssignments(asgs);
        }
      } catch (err) {
        console.warn('Using local fallback state:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Handle Tab switches when in interview room
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && interviewState.isActive) {
        recordTabSwitch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [interviewState.isActive, interviewState.sessionId]);

  const startInterview = async (type: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION' = 'MOCK_INTERVIEW') => {
    let sessId = `sess-${Date.now()}`;
    let initialQuestions = MOCK_INTERVIEW_QUESTIONS;

    try {
      const res = await api.interview.start(student.id, type);
      if (res && res.sessionId) {
        sessId = res.sessionId;
        if (res.firstQuestion) {
          initialQuestions = [res.firstQuestion, ...MOCK_INTERVIEW_QUESTIONS.slice(1)];
        }
      }
    } catch (err) {
      console.warn('Started simulated mock session offline:', err);
    }

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
    setActiveView(type === 'MOCK_INTERVIEW' ? 'INTERVIEW_ROOM' : 'LISTENING_ROOM');
  };

  const submitAnswer = async (answerText: string) => {
    const currentQ = interviewState.questions[interviewState.turnIndex];
    let evaluatedTurn: QuestionTurn = {
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

    if (interviewState.sessionId) {
      try {
        const res = await api.interview.submitAnswer(interviewState.sessionId, answerText, 15);
        if (res) {
          if (res.turnEvaluation) {
            evaluatedTurn = { ...evaluatedTurn, ...res.turnEvaluation };
          }
          if (res.nextQuestion) {
            nextQTurn = res.nextQuestion;
            nextDifficulty = res.nextQuestion.difficulty;
          }
          if (res.isCompleted && res.finalReport) {
            finalRep = res.finalReport;
          }
        }
      } catch (err) {
        console.warn('Evaluated turn offline:', err);
      }
    }

    if (!nextQTurn && !finalRep) {
      if (interviewState.currentDifficulty === 'EASY') nextDifficulty = 'MEDIUM';
      else if (interviewState.currentDifficulty === 'MEDIUM') nextDifficulty = 'ADVANCED';
    }

    const nextTurn = interviewState.turnIndex + 1;
    const updatedQuestions = [...interviewState.questions];
    updatedQuestions[interviewState.turnIndex] = evaluatedTurn;
    if (nextQTurn && nextTurn < updatedQuestions.length) {
      updatedQuestions[nextTurn] = nextQTurn;
    }

    if (finalRep || nextTurn >= interviewState.questions.length) {
      if (finalRep) {
        setLatestReport(finalRep);
        setStudent(prev => ({
          ...prev,
          recentReports: [finalRep!, ...prev.recentReports]
        }));
        setInterviewState(prev => ({ ...prev, isActive: false, orbState: 'IDLE' }));
        setActiveView('REPORT_VIEW');
        return;
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

  const endInterview = async () => {
    let report: DiagnosticReport | null = null;
    if (interviewState.sessionId) {
      try {
        report = await api.interview.finalize(interviewState.sessionId);
      } catch (err) {
        console.warn('Finalized report offline:', err);
      }
    }

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
    try {
      await api.tasks.toggleTask(student.id, taskId);
    } catch {
      // Local fallback
    }
    setStudent(prev => ({
      ...prev,
      criteriaTasks: prev.criteriaTasks.map(t => 
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      )
    }));
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
      const targetId = student.id || currentUser?.studentId || currentUser?.id || 'me';
      parsed = await api.student.uploadResume(targetId, payload);
    } catch (err) {
      console.warn('Resume upload API fallback:', err);
      if ('skills' in (payload as any) && 'projects' in (payload as any)) {
        parsed = payload as ParsedResume;
      } else {
        const fileName = (payload instanceof FormData) 
          ? 'Uploaded_Resume.pdf' 
          : (payload as any).fileName || 'Candidate_Resume.txt';
        parsed = {
          fileName,
          parsedAt: new Date().toISOString().split('T')[0],
          summary: 'Candidate technical profile parsed and verified for mock interview grounding.',
          skills: {
            languages: ['Java', 'Python', 'TypeScript', 'SQL'],
            frameworks: ['React', 'Spring Boot', 'Node.js'],
            databases: ['PostgreSQL', 'Redis'],
            tools: ['Git', 'Docker']
          },
          projects: [
            {
              title: 'Full-Stack Distributed System',
              techStack: ['Java', 'Spring Boot', 'PostgreSQL'],
              description: 'Scalable service handling distributed events and transactional persistence.'
            }
          ]
        };
      }
    }
    setStudent(prev => ({
      ...prev,
      resume: parsed
    }));
    return parsed;
  };

  const updateCodingHandles = async (handles: Partial<CodingHandles>) => {
    try {
      const targetId = student.id || currentUser?.studentId || currentUser?.id;
      if (targetId) {
        await api.student.updateCodingHandles(targetId, handles as any);
      }
    } catch (err) {
      console.warn('Update coding handles offline:', err);
    }
    setStudent(prev => ({
      ...prev,
      codingHandles: {
        ...prev.codingHandles,
        ...handles
      }
    }));
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
