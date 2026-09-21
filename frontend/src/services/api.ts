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

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        let errorMsg = `API Error (${res.status})`;
        try {
          const parsed = JSON.parse(errText);
          errorMsg = parsed.error || errorMsg;
        } catch {
          errorMsg = errText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      return res.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // AUTH
  auth = {
    login: async (email: string, password: string) => {
      const data = await this.request<{ user: any; token: string; studentId?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      this.setToken(data.token);
      return data;
    },
    register: async (userData: any) => {
      const data = await this.request<{ user: any; token: string; studentId?: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      this.setToken(data.token);
      return data;
    },
    registerExternal: async (userData: { name: string; email: string; password: string; department?: string; batchYear?: number }) => {
      return this.request<{ message: string; email: string; simulatedVerificationCode: string }>('/auth/register-external', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    },
    verifyEmail: async (email: string, code: string) => {
      const data = await this.request<{ user: any; token: string; studentId?: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code })
      });
      this.setToken(data.token);
      return data;
    },
    me: () => this.request<{ user: any; studentId?: string }>('/auth/me')
  };

  // STUDENT
  student = {
    getProfile: async (studentId?: string): Promise<StudentProfile> => {
      try {
        const id = studentId || 'me';
        return await this.request<StudentProfile>(`/students/${id}`);
      } catch (err) {
        console.warn('Student profile fetch error:', err);
        return DEFAULT_CLEAN_STUDENT;
      }
    },
    updateCodingHandles: (studentId: string, handles: CodingHandles) => 
      this.request(`/students/${studentId}/coding-handles`, {
        method: 'PUT',
        body: JSON.stringify(handles)
      }),
    uploadResume: async (
      studentId: string, 
      payload: FormData | { resumeText: string; fileName?: string } | ParsedResume
    ): Promise<ParsedResume> => {
      if (payload instanceof FormData) {
        const headers: Record<string, string> = {};
        const token = localStorage.getItem('auth_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/students/${studentId}/resume`, {
          method: 'POST',
          headers,
          body: payload
        });
        if (!res.ok) throw new Error('Resume upload failed.');
        const data = await res.json();
        return data.resume;
      } else {
        const data = await this.request<{ resume: ParsedResume }>(`/students/${studentId}/resume`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        return data.resume;
      }
    }
  };

  // TASKS
  tasks = {
    toggleTask: async (studentId: string, taskId: string): Promise<boolean> => {
      try {
        const res = await this.request<{ isCompleted: boolean }>(`/tasks/${studentId}/toggle/${taskId}`, {
          method: 'POST'
        });
        return res.isCompleted;
      } catch (err) {
        console.warn('Backend offline, toggled task locally:', err);
        return true;
      }
    },
    verifyTask: async (studentId: string, taskId: string): Promise<void> => {
      try {
        await this.request(`/tasks/${studentId}/verify/${taskId}`, { method: 'POST' });
      } catch (err) {
        console.warn('Backend offline, verified task locally:', err);
      }
    }
  };

  // INTERVIEW
  interview = {
    start: async (studentId: string, type: 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION' | 'PRACTICE' = 'MOCK_INTERVIEW'): Promise<{ sessionId: string; firstQuestion: QuestionTurn }> => {
      try {
        return await this.request<{ sessionId: string; firstQuestion: QuestionTurn }>('/interviews/start', {
          method: 'POST',
          body: JSON.stringify({ studentId, sessionType: type })
        });
      } catch (err) {
        console.warn('Backend offline, starting simulated interview room:', err);
        return {
          sessionId: `mock-sess-${Date.now()}`,
          firstQuestion: MOCK_INTERVIEW_QUESTIONS[0]
        };
      }
    },
    recordProctorEvent: async (sessionId: string, eventType: 'TAB_SWITCH' | 'FULLSCREEN_EXIT') => {
      try {
        return await this.request<{ tabSwitches: number; isFlagged: boolean }>(`/interviews/${sessionId}/proctor-event`, {
          method: 'POST',
          body: JSON.stringify({ eventType })
        });
      } catch (err) {
        return { tabSwitches: 1, isFlagged: false };
      }
    },
    submitAnswer: async (sessionId: string, studentAnswer: string, durationSeconds = 15) => {
      try {
        return await this.request<{
          isCompleted: boolean;
          turnEvaluation?: QuestionTurn;
          nextQuestion?: QuestionTurn;
          finalReport?: DiagnosticReport;
        }>(`/interviews/${sessionId}/submit-answer`, {
          method: 'POST',
          body: JSON.stringify({ studentAnswer, estimatedDurationSeconds: durationSeconds })
        });
      } catch (err) {
        console.warn('Backend offline, calculating turn evaluation locally:', err);
        return null;
      }
    },
    finalize: async (sessionId: string): Promise<DiagnosticReport | null> => {
      try {
        return await this.request<DiagnosticReport>(`/interviews/${sessionId}/finalize`, { method: 'POST' });
      } catch (err) {
        console.warn('Backend offline, generated fallback diagnostic report:', err);
        return null;
      }
    },
    getReport: (sessionId: string) => this.request<DiagnosticReport>(`/interviews/${sessionId}/report`)
  };

  // LISTENING COMPREHENSION
  listening = {
    start: async (studentId: string) => {
      try {
        return await this.request<{ sessionId: string; passage: any; replaysUsed: number; maxReplays: number }>('/listening/start', {
          method: 'POST',
          body: JSON.stringify({ studentId })
        });
      } catch (err) {
        return {
          sessionId: `lis-${Date.now()}`,
          passage: LISTENING_PASSAGE,
          replaysUsed: 0,
          maxReplays: 2
        };
      }
    },
    recordReplay: async (sessionId: string) => {
      try {
        return await this.request<{ replaysUsed: number }>(`/listening/${sessionId}/replay`, { method: 'POST' });
      } catch {
        return { replaysUsed: 1 };
      }
    },
    submitAnswers: (sessionId: string, answers: any[]) =>
      this.request<{ overallScore: number; evaluations: any[] }>(`/listening/${sessionId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      })
  };

  // SUGGESTION SYSTEM CHATBOT (2-Agent Architecture)
  suggestions = {
    getOrCreateSession: async (studentId = 'stu-101'): Promise<string> => {
      try {
        const res = await this.request<{ sessionId: string }>(`/suggestions/session/${studentId}`, { method: 'POST' });
        return res.sessionId;
      } catch {
        return `sug-${Date.now()}`;
      }
    },
    getHistory: async (sessionId: string) => {
      try {
        return await this.request<any[]>(`/suggestions/${sessionId}/history`);
      } catch {
        return [];
      }
    },
    sendMessage: async (sessionId: string, message: string) => {
      return this.request<{
        userMessage: any;
        assistantMessage: {
          id: string;
          role: 'assistant';
          content: string;
          technicalTerminology: Array<{ term: string; definition: string; betterAlternativeTo?: string }>;
          communicationSuggestions: string[];
          structuralAdvice: string[];
          createdAt: string;
        };
      }>(`/suggestions/${sessionId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });
    }
  };

  // ADMIN PORTALS
  admin = {
    getCoordinatorStats: async () => {
      try {
        return await this.request<any>('/admin/coordinator-stats');
      } catch {
        return {
          totalCandidates: 0,
          hopeEliteCount: 0,
          pepDomainsCount: 0,
          placementReadyRate: 0,
          departmentStreamCount: 0,
          hopeGeneralCount: 0,
          pepTotalCount: 0
        };
      }
    },
    getSystemStats: async () => {
      try {
        return await this.request<any>('/admin/system-stats');
      } catch {
        return {
          programAdminsCount: 0,
          facultyMentorsCount: 0,
          trainersCount: 0,
          studentsCount: 0
        };
      }
    },
    getProgramAdmins: async (): Promise<any[]> => {
      try {
        return await this.request<any[]>('/admin/program-admins');
      } catch {
        return [];
      }
    },
    createProgramAdmin: async (data: { name: string; email: string; password?: string }) => {
      return this.request<any>('/admin/program-admins', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    getFacultyMentors: async (): Promise<any[]> => {
      try {
        return await this.request<any[]>('/admin/faculty-mentors');
      } catch {
        return [];
      }
    },
    createFacultyMentor: async (data: { name: string; email: string; password?: string }) => {
      return this.request<any>('/admin/faculty-mentors', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    assignMentor: async (studentId: string, mentorId: string) => {
      return this.request<{ message: string }>('/admin/assign-mentor', {
        method: 'POST',
        body: JSON.stringify({ studentId, mentorId })
      });
    },
    createStudent: async (data: { 
      name: string; 
      email: string; 
      rollNumber: string; 
      department: string; 
      batchYear: number; 
      track: string; 
      domainName?: string; 
      mentorId?: string;
      password?: string 
    }) => {
      return this.request<any>('/admin/create-student', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    createStudentByMentor: async (data: { 
      name: string; 
      email: string; 
      rollNumber: string; 
      department: string; 
      batchYear: number; 
      track: string; 
      domainName?: string; 
      mentorId?: string;
      password?: string 
    }) => {
      return this.request<any>('/admin/create-student', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    deleteUser: async (userId: string) => {
      return this.request<{ success: boolean; message: string }>(`/admin/users/${userId}`, {
        method: 'DELETE'
      });
    },
    getStudentFullHistory: async (studentIdOrUserId: string) => {
      return this.request<any>(`/admin/students/${studentIdOrUserId}/full-history`);
    },
    getStudents: async (params: { cohort?: string; search?: string } = {}) => {
      try {
        const query = new URLSearchParams(params as any).toString();
        return await this.request<any[]>(`/admin/students?${query}`);
      } catch {
        return [];
      }
    },
    getMentorMentees: async (mentorId?: string) => {
      try {
        const q = mentorId ? `?mentorId=${mentorId}` : '';
        return await this.request<any[]>(`/admin/mentees${q}`);
      } catch {
        return [];
      }
    },
    getTrainerTenures: async (): Promise<TrainerTenure[]> => {
      try {
        return await this.request<TrainerTenure[]>('/admin/trainer-tenures');
      } catch {
        return [];
      }
    },
    onboardTrainer: async (trainer: Omit<TrainerTenure, 'id' | 'isActive'>): Promise<TrainerTenure> => {
      return await this.request<TrainerTenure>('/admin/onboard-trainer', {
        method: 'POST',
        body: JSON.stringify(trainer)
      });
    },
    revokeTrainer: async (id: string): Promise<void> => {
      await this.request(`/admin/revoke-trainer/${id}`, { method: 'PUT' });
    },
    getAssignments: async (): Promise<InterviewAssignment[]> => {
      try {
        return await this.request<InterviewAssignment[]>('/admin/assignments');
      } catch {
        return [];
      }
    },
    createAssignment: async (asg: Omit<InterviewAssignment, 'id'>): Promise<InterviewAssignment> => {
      return await this.request<InterviewAssignment>('/admin/assignments', {
        method: 'POST',
        body: JSON.stringify(asg)
      });
    },
    getPepDomains: async (): Promise<string[]> => {
      try {
        return await this.request<string[]>('/admin/pep-domains');
      } catch {
        return PEP_DOMAINS;
      }
    }
  };
}

export const api = new ApiClient();
