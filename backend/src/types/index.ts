export type UserRole = 
  | 'SUPER_ADMIN'
  | 'PROGRAM_ADMIN'
  | 'FACULTY_MENTOR'
  | 'TRAINER'
  | 'PLACEMENT_COORDINATOR'
  | 'STUDENT';

export type StudentTrack = 
  | 'HOPE_ELITE'
  | 'HOPE_NON_ELITE'
  | 'PEP'
  | 'DEPARTMENT'
  | 'EXTERNAL';

export type Difficulty = 'EASY' | 'MEDIUM' | 'ADVANCED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isEmailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CodingHandles {
  github?: string;
  leetcode?: string;
  hackerrank?: string;
  codeforces?: string;
  codechef?: string;
  leetcodeSolved?: number;
  githubRepos?: number;
}

export interface ParsedResume {
  fileName: string;
  parsedAt: string;
  summary: string;
  skills: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    tools: string[];
  };
  projects: {
    title: string;
    techStack: string[];
    description: string;
  }[];
  rawText?: string;
}

export interface CriteriaTask {
  id: string;
  title: string;
  description: string;
  targetTrack: 'ALL' | 'HOPE' | 'PEP' | 'DEPARTMENT';
  isCompleted: boolean;
  verifiedByMentor: boolean;
  verifiedAt?: string;
}

export interface QuestionTurn {
  id: string;
  questionNumber: number;
  questionText: string;
  difficulty: Difficulty;
  studentAnswer?: string;
  technicalScore?: number;
  communicationScore?: number;
  wpm?: number;
  fillerWords?: number;
  fillerBreakdown?: Record<string, number>;
  feedback?: string;
  strengths?: string;
  weaknesses?: string;
}

export interface DiagnosticReport {
  id: string;
  date: string;
  sessionType: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION';
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  averageWpm: number;
  totalFillerWords: number;
  fillerWordBreakdown: Record<string, number>;
  skillBreakdown: {
    skill: string;
    score: number;
    status: 'STRONG' | 'MODERATE' | 'NEEDS_WORK';
    recommendation: string;
  }[];
  actionableNextSteps: string[];
  tabSwitches: number;
  isFlagged: boolean;
}

export interface StudentProfile {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  department: string;
  batchYear: number;
  track: StudentTrack;
  pepDomain?: string;
  mentorName: string;
  mentorEmail: string;
  codingHandles: CodingHandles;
  resume: ParsedResume | null;
  criteriaTasks: CriteriaTask[];
  recentReports: DiagnosticReport[];
}

export interface TrainerTenure {
  id: string;
  trainerName: string;
  trainerEmail: string;
  companyOrInstitute: string;
  domain: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface InterviewAssignment {
  id: string;
  title: string;
  assignedByRole: 'PLACEMENT_COORDINATOR' | 'PROGRAM_ADMIN' | 'TRAINER';
  assignedByName: string;
  targetDomainOrTrack: string;
  dueDate: string;
  isMandatory: boolean;
}

export interface ListeningQuestion {
  id: string;
  questionText: string;
  expectedAnswer: string;
}

export interface ListeningPassage {
  id: string;
  title: string;
  durationSeconds: number;
  narrativeText: string;
  questions: ListeningQuestion[];
}

export interface SuggestionChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  technicalTerminology?: {
    term: string;
    definition: string;
    betterAlternativeTo?: string;
  }[];
  communicationSuggestions?: string[];
  structuralAdvice?: string[];
  createdAt: string;
}
