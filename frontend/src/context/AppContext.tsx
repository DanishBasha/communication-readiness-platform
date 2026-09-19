import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserRole, 
  StudentProfile, 
  DiagnosticReport, 
  TrainerTenure, 
  InterviewAssignment, 
  QuestionTurn, 
  Difficulty,
  ParsedResume 
} from '../types';
import { 
  INITIAL_STUDENT_PROFILE, 
  MOCK_INTERVIEW_QUESTIONS, 
  MOCK_TRAINER_TENURES, 
  MOCK_ASSIGNMENTS 
} from '../data/mockData';

interface InterviewSessionState {
  isActive: boolean;
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
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeView: 'DASHBOARD' | 'INTERVIEW_ROOM' | 'LISTENING_ROOM' | 'REPORT_VIEW';
  setActiveView: (view: 'DASHBOARD' | 'INTERVIEW_ROOM' | 'LISTENING_ROOM' | 'REPORT_VIEW') => void;
  student: StudentProfile;
  setStudent: React.Dispatch<React.SetStateAction<StudentProfile>>;
  interviewState: InterviewSessionState;
  startInterview: (type?: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION') => void;
  submitAnswer: (answerText: string) => void;
  endInterview: () => void;
  recordTabSwitch: () => void;
  latestReport: DiagnosticReport | null;
  trainerTenures: TrainerTenure[];
  onboardTrainer: (trainer: Omit<TrainerTenure, 'id' | 'isActive'>) => void;
  revokeTrainer: (id: string) => void;
  assignments: InterviewAssignment[];
  createAssignment: (assignment: Omit<InterviewAssignment, 'id'>) => void;
  toggleCriteriaTask: (taskId: string) => void;
  verifyCriteriaTask: (taskId: string) => void;
  uploadResumeData: (resume: ParsedResume) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRole, setActiveRole] = useState<UserRole>('STUDENT');
  const [activeView, setActiveView] = useState<'DASHBOARD' | 'INTERVIEW_ROOM' | 'LISTENING_ROOM' | 'REPORT_VIEW'>('DASHBOARD');
  const [student, setStudent] = useState<StudentProfile>(INITIAL_STUDENT_PROFILE);
  const [trainerTenures, setTrainerTenures] = useState<TrainerTenure[]>(MOCK_TRAINER_TENURES);
  const [assignments, setAssignments] = useState<InterviewAssignment[]>(MOCK_ASSIGNMENTS);
  const [latestReport, setLatestReport] = useState<DiagnosticReport | null>(INITIAL_STUDENT_PROFILE.recentReports[0] || null);

  const [interviewState, setInterviewState] = useState<InterviewSessionState>({
    isActive: false,
    type: 'MOCK_INTERVIEW',
    turnIndex: 0,
    currentDifficulty: 'EASY',
    questions: MOCK_INTERVIEW_QUESTIONS,
    tabSwitches: 0,
    isFlagged: false,
    orbState: 'SPEAKING',
    liveTranscript: ''
  });

  // Handle Tab switches when in interview room
  useEffect(() => {
    const handleVisibilityChange = () => {
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
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [interviewState.isActive]);

  const startInterview = (type: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION' = 'MOCK_INTERVIEW') => {
    setInterviewState({
      isActive: true,
      type,
      turnIndex: 0,
      currentDifficulty: 'EASY',
      questions: MOCK_INTERVIEW_QUESTIONS,
      tabSwitches: 0,
      isFlagged: false,
      orbState: 'SPEAKING',
      liveTranscript: ''
    });
    setActiveView(type === 'MOCK_INTERVIEW' ? 'INTERVIEW_ROOM' : 'LISTENING_ROOM');
  };

  const submitAnswer = (answerText: string) => {
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

      // Adapt difficulty
      let nextDifficulty: Difficulty = prev.currentDifficulty;
      if (prev.currentDifficulty === 'EASY') nextDifficulty = 'MEDIUM';
      else if (prev.currentDifficulty === 'MEDIUM') nextDifficulty = 'ADVANCED';

      const nextTurn = prev.turnIndex + 1;

      if (nextTurn >= prev.questions.length) {
        // Conclude interview
        setTimeout(() => endInterview(), 500);
        return prev;
      }

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

  const endInterview = () => {
    // Generate new diagnostic report
    const newReport: DiagnosticReport = {
      id: `rep-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      sessionType: interviewState.type,
      overallScore: Math.floor(Math.random() * 15) + 78, // 78-92
      technicalScore: Math.floor(Math.random() * 12) + 82, // 82-94
      communicationScore: Math.floor(Math.random() * 14) + 72, // 72-86
      averageWpm: Math.floor(Math.random() * 20) + 120, // 120-140
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

    setLatestReport(newReport);
    setStudent(prev => ({
      ...prev,
      recentReports: [newReport, ...prev.recentReports]
    }));

    setInterviewState(prev => ({ ...prev, isActive: false, orbState: 'IDLE' }));
    setActiveView('REPORT_VIEW');
  };

  const recordTabSwitch = () => {
    setInterviewState(prev => ({
      ...prev,
      tabSwitches: prev.tabSwitches + 1,
      isFlagged: prev.tabSwitches + 1 >= 4
    }));
  };

  const onboardTrainer = (trainer: Omit<TrainerTenure, 'id' | 'isActive'>) => {
    const newTrainer: TrainerTenure = {
      ...trainer,
      id: `trn-${Date.now()}`,
      isActive: true
    };
    setTrainerTenures(prev => [newTrainer, ...prev]);
  };

  const revokeTrainer = (id: string) => {
    setTrainerTenures(prev => prev.map(t => t.id === id ? { ...t, isActive: false } : t));
  };

  const createAssignment = (asg: Omit<InterviewAssignment, 'id'>) => {
    const newAsg: InterviewAssignment = {
      ...asg,
      id: `asg-${Date.now()}`
    };
    setAssignments(prev => [newAsg, ...prev]);
  };

  const toggleCriteriaTask = (taskId: string) => {
    setStudent(prev => ({
      ...prev,
      criteriaTasks: prev.criteriaTasks.map(t => 
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      )
    }));
  };

  const verifyCriteriaTask = (taskId: string) => {
    setStudent(prev => ({
      ...prev,
      criteriaTasks: prev.criteriaTasks.map(t => 
        t.id === taskId ? { ...t, verifiedByMentor: true, verifiedAt: new Date().toISOString().split('T')[0] } : t
      )
    }));
  };

  const uploadResumeData = (resume: ParsedResume) => {
    setStudent(prev => ({
      ...prev,
      resume
    }));
  };

  return (
    <AppContext.Provider value={{
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
      uploadResumeData
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
