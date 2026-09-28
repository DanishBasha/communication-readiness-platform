/**
 * M4 event handler tests.
 * Verifies USER_REGISTERED and ATTEMPT_COMPLETED handlers call the right services.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock CreditService and EligibilityService before importing the handlers
vi.mock('../modules/credits/credits.service', () => ({
  CreditService: {
    createAccount: vi.fn().mockResolvedValue(undefined),
    earn: vi.fn().mockResolvedValue({ newBalance: 60, transactionId: 'txn-mock' }),
    consume: vi.fn().mockResolvedValue({ newBalance: 40, transactionId: 'txn-mock' }),
  },
}));

vi.mock('../modules/placement/eligibility.service', () => ({
  EligibilityService: {
    recalculate: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock db for the inline policy query in event-handlers.ts
vi.mock('../shared/db/pool', () => ({
  db: {
    query: vi.fn().mockResolvedValue({ rows: [{ consume_amount: '10' }] }),
  },
}));

// Mock eventBus so registerM4EventHandlers can attach listeners
vi.mock('../shared/events/eventBus', () => {
  const listeners: Record<string, ((p: unknown) => void)[]> = {};
  return {
    eventBus: {
      on: vi.fn((event: string, cb: (p: unknown) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      emit: vi.fn((event: string, payload: unknown) => {
        (listeners[event] ?? []).forEach(cb => cb(payload));
      }),
      _listeners: listeners,
    },
  };
});

const { registerM4EventHandlers } = await import('../modules/credits/event-handlers');
const { CreditService } = await import('../modules/credits/credits.service');
const { EligibilityService } = await import('../modules/placement/eligibility.service');
const { eventBus } = await import('../shared/events/eventBus');
const { Events } = await import('../shared/events/events');

describe('M4 event handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerM4EventHandlers();
  });

  describe('USER_REGISTERED handler', () => {
    it('creates credit account when studentId is present', async () => {
      eventBus.emit(Events.USER_REGISTERED, {
        userId: 'user-1',
        studentId: 'student-1',
        email: 'test@example.com',
        name: 'Test',
      });

      // Handlers are async — wait a tick
      await new Promise(r => setTimeout(r, 10));
      expect(CreditService.createAccount).toHaveBeenCalledWith('student-1');
    });

    it('skips when studentId is absent (non-student role)', async () => {
      eventBus.emit(Events.USER_REGISTERED, {
        userId: 'user-2',
        studentId: undefined,
        email: 'mentor@example.com',
        name: 'Mentor',
      });

      await new Promise(r => setTimeout(r, 10));
      expect(CreditService.createAccount).not.toHaveBeenCalled();
    });
  });

  describe('ATTEMPT_COMPLETED handler', () => {
    it('earns credits and recalculates eligibility', async () => {
      eventBus.emit(Events.ATTEMPT_COMPLETED, {
        attemptId: 'attempt-1',
        assessmentId: 'asmt-1',
        studentId: 'student-1',
        assessmentType: 'MOCK_INTERVIEW',
        technicalScore: 75,
        communicationScore: 70,
        overallScore: 73.5,
        reportId: 'report-1',
      });

      await new Promise(r => setTimeout(r, 10));

      expect(CreditService.earn).toHaveBeenCalledWith(
        'student-1',
        10,
        'ATTEMPT_COMPLETED',
        'attempt-1'
      );
      expect(EligibilityService.recalculate).toHaveBeenCalledWith('student-1');
    });

    it('skips when studentId is absent', async () => {
      eventBus.emit(Events.ATTEMPT_COMPLETED, {
        attemptId: 'attempt-2',
        studentId: undefined,
        assessmentType: 'MOCK_INTERVIEW',
        overallScore: 70,
      });

      await new Promise(r => setTimeout(r, 10));
      expect(CreditService.earn).not.toHaveBeenCalled();
      expect(EligibilityService.recalculate).not.toHaveBeenCalled();
    });

    it('still recalculates eligibility even if earn throws', async () => {
      vi.mocked(CreditService.earn).mockRejectedValueOnce(new Error('DB error'));

      eventBus.emit(Events.ATTEMPT_COMPLETED, {
        attemptId: 'attempt-3',
        assessmentId: 'asmt-1',
        studentId: 'student-2',
        assessmentType: 'MOCK_INTERVIEW',
        technicalScore: 80,
        communicationScore: 75,
        overallScore: 78.5,
        reportId: 'report-3',
      });

      await new Promise(r => setTimeout(r, 10));
      // Error is caught; eligibility still runs
      expect(EligibilityService.recalculate).toHaveBeenCalledWith('student-2');
    });
  });
});
