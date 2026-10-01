import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserRole, 
  StudentProfile, 
  DiagnosticReport, 
  TrainerTenure, 
  InterviewAssignment, 
  AssignmentSubmission, 
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
  loginWithAuthUser: (authUser: AuthUser, token?: string) => void;
  registerUser: (data: any) => Promise<void>;
  registerCandidate: (data: { name: string; email: string; password?: string }) => Promise<void>;
  completeInviteActivation: (token: string, password: string) => Promise<void>;
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
  submitAudioAnswer: (audioBlob: Blob, questionText: string, difficulty: string, turnNumber: number) => Promise<void>;
  endInterview: () => Promise<void>;
  recordTabSwitch: () => Promise<void>;
  latestReport: DiagnosticReport | null;
  trainerTenures: TrainerTenure[];
  onboardTrainer: (trainer: Omit<TrainerTenure, 'id' | 'isActive'>) => Promise<void>;
  revokeTrainer: (id: string) => Promise<void>;
  assignments: InterviewAssignment[];
  createAssignment: (assignment: Partial<InterviewAssignment>) => Promise<InterviewAssignment>;
  activeAssignment: InterviewAssignment | null;
  startAssignedSession: (assignment: InterviewAssignment) => Promise<void>;
  completeAssignmentSubmission: (assignmentId: string, score: number, sessionType: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION') => Promise<void>;
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
            track: u.track || 'General Track',
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
  const [activeAssignment, setActiveAssignment] = useState<InterviewAssignment | null>(null);
  const [latestReport, setLatestReport] = useState<DiagnosticReport | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const list = await api.admin.getAssignments(currentUser?.collegeId);
        if (list && list.length > 0) {
          setAssignments(list);
        }
      } catch (e) {
        console.warn('Failed to load assignments:', e);
      }
    };
    fetchAssignments();
  }, [currentUser?.collegeId]);

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

  // Hydrate auth state on mount — validates stored token against backend
  // so a page refresh restores the correct user role/name
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
            .catch(() => {});
        }
      })
      .catch(() => {
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
          if (activeAssignment) {
            completeAssignmentSubmission(activeAssignment.id, res.finalReport.overallScore, activeAssignment.sessionType);
          }
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

  const submitAudioAnswer = async (audioBlob: Blob, questionText: string, difficulty: string, turnNumber: number) => {
    setInterviewState(prev => ({ ...prev, orbState: 'THINKING' }));
    const sessId = interviewState.sessionId || `ses_${Date.now()}`;
    try {
      const data = await api.sessions.submitTurn(sessId, audioBlob, {
        studentId: student.id || 'stu-21cs1084',
        questionText,
        difficulty,
        turnNumber,
        domain: student.department || 'CSE',
      });

      const isCompleted = turnNumber >= 3;
      if (isCompleted) {
        const report: DiagnosticReport = {
          id: `rep_${Date.now().toString().slice(-4)}`,
          date: new Date().toISOString().split('T')[0],
          sessionType: interviewState.type,
          overallScore: data.overallScore,
          technicalScore: data.technicalScore,
          communicationScore: data.communicationScore,
          averageWpm: data.audioMetrics?.paceWpm || 120,
          totalFillerWords: data.audioMetrics?.fillerCount || 0,
          fillerWordBreakdown: {},
          skillBreakdown: [
            { skill: 'Technical Knowledge', score: data.technicalScore, status: data.technicalScore >= 75 ? 'STRONG' : 'NEEDS_WORK', recommendation: data.feedback },
            { skill: 'Communication Fluency', score: Math.round(data.audioMetrics?.fluencyScore ?? data.communicationScore), status: 'MODERATE', recommendation: data.strengths },
            { skill: 'Speech Clarity', score: Math.round(data.audioMetrics?.clarityScore ?? data.communicationScore), status: 'MODERATE', recommendation: data.weaknesses },
          ],
          actionableNextSteps: [data.feedback, data.strengths, data.weaknesses].filter(Boolean),
          tabSwitches: interviewState.tabSwitches,
          isFlagged: interviewState.isFlagged,
        };
        setLatestReport(report);
        setStudent(prev => ({ ...prev, recentReports: [report, ...prev.recentReports] }));
        setInterviewState(prev => ({ ...prev, isActive: false, orbState: 'IDLE' }));
        setActiveView('REPORT_VIEW');
      } else {
        const nextQ = {
          id: `q_${turnNumber + 1}_${Date.now()}`,
          questionNumber: turnNumber + 1,
          questionText: 'Please elaborate on the scalability aspects of your previous answer.',
          difficulty: (data.nextDifficulty || 'MEDIUM') as Difficulty,
          category: 'Architecture',
        };
        setInterviewState(prev => {
          const updated = [...prev.questions];
          updated[prev.turnIndex] = {
            ...updated[prev.turnIndex],
            studentAnswer: data.transcript,
            technicalScore: data.technicalScore,
            communicationScore: data.communicationScore,
            wpm: data.audioMetrics?.paceWpm || 120,
            fillerWords: data.audioMetrics?.fillerCount || 0,
            feedback: data.feedback,
            strengths: data.strengths,
            weaknesses: data.weaknesses,
          };
          return {
            ...prev,
            turnIndex: prev.turnIndex + 1,
            currentDifficulty: (data.nextDifficulty || 'MEDIUM') as Difficulty,
            questions: [...updated, nextQ],
            orbState: 'SPEAKING',
            liveTranscript: '',
          };
        });
      }
    } catch (e) {
      console.warn('[AppContext] Audio submit error, falling back to text:', e);
      await submitAnswer(questionText);
    }
  };

  const endInterview = async () => {
    let report: DiagnosticReport | null = null;
    if (interviewState.sessionId) {
      try {
        report = await api.interview.finalize(interviewState.sessionId);
      } catch (err) {
        console.warn('Finalize error:', err);
      }
    }

    if (!report) {
      const turns = interviewState.questions;
      const turnCount = Math.max(1, turns.length);
      const avgTech = Math.round(turns.reduce((acc, t) => acc + (t.technicalScore || 80), 0) / turnCount);
      const avgComm = Math.round(turns.reduce((acc, t) => acc + (t.communicationScore || 78), 0) / turnCount);
      const avgWpm = Math.round(turns.reduce((acc, t) => acc + (t.wpm || 125), 0) / turnCount);
      const totalFillers = turns.reduce((acc, t) => acc + (t.fillerWords || 0), 0);

      report = {
        id: `rep-${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString().split('T')[0],
        sessionType: interviewState.type,
        overallScore: Math.round(avgTech * 0.70 + avgComm * 0.30),
        technicalScore: avgTech,
        communicationScore: avgComm,
        averageWpm: avgWpm,
        totalFillerWords: totalFillers || 2,
        fillerWordBreakdown: { 'uh': Math.max(1, Math.round(totalFillers * 0.5)), 'like': Math.max(1, Math.round(totalFillers * 0.5)) },
        skillBreakdown: [
          { skill: `${student.track} Core Competency`, score: avgTech, status: avgTech >= 80 ? 'STRONG' : 'MODERATE', recommendation: 'Consistent conceptual structure throughout the session.' },
          { skill: 'Verbal Delivery & Pacing', score: avgComm, status: avgComm >= 80 ? 'STRONG' : 'MODERATE', recommendation: `Pacing averaged ${avgWpm} WPM.` }
        ],
        actionableNextSteps: [
          `Your average pace was ${avgWpm} WPM. ${avgWpm >= 120 && avgWpm <= 150 ? 'Maintain this recruiter-optimal tempo.' : 'Aim for 120-150 WPM.'}`,
          `Total verbal fillers: ${totalFillers}. Replace verbal fillers with quiet 1-second pauses.`
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

    if (activeAssignment && report) {
      completeAssignmentSubmission(activeAssignment.id, report.overallScore, activeAssignment.sessionType);
    }

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
    }
    setTrainerTenures(prev => prev.map(t => t.id === id ? { ...t, isActive: false } : t));
  };

  const createAssignment = async (asg: Partial<InterviewAssignment>): Promise<InterviewAssignment> => {
    try {
      const created = await api.admin.createAssignment(asg);
      setAssignments(prev => [created, ...prev]);
      return created;
    } catch {
      const newAsg: InterviewAssignment = {
        id: `asg-${Date.now()}`,
        title: asg.title || 'Practice Drill',
        sessionType: asg.sessionType || 'MOCK_INTERVIEW',
        assignedByRole: asg.assignedByRole || 'SUPER_ADMIN',
        assignedByName: asg.assignedByName || 'Placement Cell',
        targetScope: asg.targetScope || 'ALL_STUDENTS',
        targetDomainOrTrack: asg.targetDomainOrTrack || 'All Batches',
        dueDate: asg.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isMandatory: asg.isMandatory ?? true,
        createdAt: new Date().toISOString(),
        submissions: [],
        ...asg
      };
      setAssignments(prev => [newAsg, ...prev]);
      return newAsg;
    }
  };

  const startAssignedSession = async (assignment: InterviewAssignment) => {
    setActiveAssignment(assignment);
    if (assignment.sessionType === 'LISTENING_COMPREHENSION') {
      setActiveView('LISTENING_ROOM');
    } else {
      await startInterview('MOCK_INTERVIEW');
    }
  };

  const completeAssignmentSubmission = async (assignmentId: string, score: number, sessionType: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION') => {
    const submission: AssignmentSubmission = {
      studentId: student.id || 'stu-21cs1084',
      studentName: student.name || 'Aravind Kumar',
      studentRollNumber: student.rollNumber || '21CS1084',
      score,
      sessionType,
      submittedAt: new Date().toISOString(),
      status: 'COMPLETED'
    };
    try {
      const res = await api.admin.submitAssignment(assignmentId, submission);
      if (res && res.assignment) {
        setAssignments(prev => prev.map(a => a.id === assignmentId ? res.assignment : a));
      }
    } catch (e) {
      console.warn('Failed to record assignment submission:', e);
      setAssignments(prev => prev.map(a => {
        if (a.id === assignmentId) {
          const subs = a.submissions || [];
          return {
            ...a,
            submissions: [...subs.filter(s => s.studentId !== submission.studentId), submission]
          };
        }
        return a;
      }));
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
              description: 'Real-time diagnostic assessment platform',
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
      studentId: res.studentId,
      collegeId: user.collegeId,
      collegeName: user.collegeName,
      programId: user.programId,
      subProgramName: user.subProgramName,
      isIndependent: user.isIndependent,
      permissions: user.permissions
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

  const loginWithAuthUser = (authUser: AuthUser, token?: string) => {
    if (token) api.setToken(token);
    setCurrentUser(authUser);
    setActiveRole(authUser.role);
    setIsAuthenticated(true);
    localStorage.setItem('auth_user', JSON.stringify(authUser));
    setAuthModalOpen(false);
  };

  const registerCandidate = async (data: { name: string; email: string; password?: string }) => {
    const res = await api.auth.registerCandidate(data);
    loginWithAuthUser(res.user, res.token);
    try {
      const prof = await api.student.getProfile(res.studentId);
      if (prof) {
        setStudent(prof);
        setLatestReport(null);
      }
    } catch (err) {
      console.warn('Profile fetch after candidate register:', err);
    }
  };

  const completeInviteActivation = async (token: string, password: string) => {
    const res = await api.invites.completePasswordSetup(token, password);
    loginWithAuthUser(res.user, res.token);
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
      track: data.track || 'General Track',
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
      track: data.track || 'General Track',
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
      loginWithAuthUser,
      registerUser,
      registerCandidate,
      completeInviteActivation,
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
      activeAssignment,
      startAssignedSession,
      completeAssignmentSubmission,
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
