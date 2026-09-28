export type UserRole = 
  | 'PLATFORM_OWNER'
  | 'SUPER_ADMIN'
  | 'PROGRAM_ADMIN'
  | 'FACULTY_MENTOR'
  | 'TRAINER'
  | 'PLACEMENT_COORDINATOR'
  | 'STUDENT';

export type StudentTrack = string;

export type AdminPermission = 
  | 'CAN_VIEW_STUDENT_PROGRESS'
  | 'CAN_ASSIGN_INTERVIEWS'
  | 'CAN_ASSIGN_LISTENING'
  | 'CAN_ASSIGN_TRAINERS'
  | 'CAN_MANAGE_STUDENTS'
  | 'CAN_ASSIGN_SUB_ADMINS';

export interface College {
  id: string;
  name: string;
  code: string;
  campusCity: string;
  createdAt: string;
  superAdminEmail?: string;
  superAdminName?: string;
  superAdminStatus?: 'PENDING_INVITE' | 'ACTIVE';
}

export interface DynamicProgram {
  id: string;
  collegeId: string;
  name: string;
  code: string;
  hasSubPrograms: boolean;
  subPrograms: string[];
  description?: string;
  assignedAdminEmail?: string;
  assignedAdminName?: string;
  adminPermissions: AdminPermission[];
  canAssignAdminsToPrograms?: string[];
  isCommonTrainerAllowed?: boolean;
  createdAt: string;
}

export interface DynamicDepartment {
  id: string;
  collegeId: string;
  name: string;
  code: string;
  assignedAdminEmail?: string;
  assignedAdminName?: string;
  adminPermissions: AdminPermission[];
}

export interface PendingInvite {
  token: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
  role: UserRole;
  collegeId?: string;
  collegeName?: string;
  programId?: string;
  department?: string;
  permissions?: AdminPermission[];
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED';
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'ADVANCED';

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
}

export interface CriteriaTask {
  id: string;
  title: string;
  description: string;
  targetTrack: string;
  isCompleted: boolean;
  verifiedByMentor: boolean;
  verifiedAt?: string;
}

export interface QuestionTurn {
  id: string;
  questionNumber: number;
  questionText: string;
  difficulty: Difficulty;
  category?: string;
  studentAnswer?: string;
  technicalScore?: number;
  communicationScore?: number;
  wpm?: number;
  fillerWords?: number;
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
  fillerWordBreakdown: { [word: string]: number };
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
  collegeId?: string;
  collegeName?: string;
  department: string;
  batchYear: number;
  track: StudentTrack;
  programId?: string;
  programName?: string;
  subProgramName?: string;
  isIndependent?: boolean;
  specialization?: string;
  mentorName: string;
  mentorEmail: string;
  codingHandles: CodingHandles;
  resume: ParsedResume | null;
  criteriaTasks: CriteriaTask[];
  recentReports: DiagnosticReport[];
}

export interface TrainerTenure {
  id: string;
  userId?: string;
  trainerName: string;
  trainerEmail: string;
  companyOrInstitute: string;
  domain: string;
  programId?: string;
  isCommonTrainer?: boolean;
  associatedProgramNames?: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface AssignmentSubmission {
  studentId: string;
  studentName: string;
  studentRollNumber: string;
  score: number;
  submittedAt: string;
  sessionType: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION';
  status?: 'COMPLETED' | 'FLAGGED';
}

export interface InterviewAssignment {
  id: string;
  title: string;
  sessionType: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION';
  assignedByRole: 'SUPER_ADMIN' | 'PLACEMENT_COORDINATOR' | 'PROGRAM_ADMIN' | 'FACULTY_MENTOR' | 'TRAINER';
  assignedByName: string;
  assignedByEmail?: string;
  assignedById?: string;
  collegeId?: string;

  // Targeting scope
  targetScope: 'ALL_STUDENTS' | 'PROGRAM' | 'DEPARTMENT' | 'MY_MENTEES' | 'SPECIFIC_STUDENT';
  targetDomainOrTrack?: string;
  targetProgramName?: string;
  targetSubProgram?: string;
  targetDepartment?: string;
  targetStudentId?: string;
  targetStudentName?: string;

  // Configuration
  domainOrTopic?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'ADVANCED' | 'FAANG';
  listeningPassageId?: string;
  customInstructions?: string;

  dueDate: string;
  isMandatory: boolean;
  createdAt: string;

  submissions?: AssignmentSubmission[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  collegeId?: string;
  collegeName?: string;
  rollNumber?: string;
  department?: string;
  batchYear?: number;
  programId?: string;
  programName?: string;
  subProgramName?: string;
  track?: StudentTrack;
  studentId?: string;
  isIndependent?: boolean;
  permissions?: AdminPermission[];
}


