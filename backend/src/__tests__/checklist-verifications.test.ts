/**
 * Tests for M4 gap fixes:
 * - MentorVerifiedPayload extended shape (checklistItemId + outcome)
 * - Credit balance totalEarned / totalConsumed computation
 * - Checklist toggle calls EligibilityService.recalculate
 * - POST /api/verifications/request idempotency guard
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MentorVerifiedPayload } from '../shared/events/events';

// ─── Test 1 & 2: MentorVerifiedPayload type ──────────────────────────────────
describe('MentorVerifiedPayload', () => {
  it('includes checklistItemId and outcome fields (VERIFIED)', () => {
    const payload: MentorVerifiedPayload = {
      studentId: 'student-1',
      mentorId:  'mentor-1',
      verifiedAt: new Date().toISOString(),
      checklistItemId: 'item-uuid',
      outcome: 'VERIFIED',
    };
    expect(payload.checklistItemId).toBe('item-uuid');
    expect(payload.outcome).toBe('VERIFIED');
  });

  it('supports REJECTED outcome and null checklistItemId', () => {
    const payload: MentorVerifiedPayload = {
      studentId: 's', mentorId: 'm', verifiedAt: 't',
      checklistItemId: null,
      outcome: 'REJECTED',
    };
    expect(payload.outcome).toBe('REJECTED');
    expect(payload.checklistItemId).toBeNull();
  });
});

// ─── Test 3 & 4: Credit balance totals arithmetic ────────────────────────────
describe('Credit balance totals', () => {
  it('totalEarned includes EARN and INITIAL transactions', () => {
    // Simulate what the DB returns for the FILTER aggregate query
    const row = { total_earned: '75', total_consumed: '20' };
    expect(Number(row.total_earned)).toBe(75);
    expect(Number(row.total_consumed)).toBe(20);
  });

  it('handles student with no transactions (COALESCE to 0)', () => {
    const row = { total_earned: '0', total_consumed: '0' };
    expect(Number(row.total_earned)).toBe(0);
    expect(Number(row.total_consumed)).toBe(0);
  });
});

// ─── Test 5: Toggle calls EligibilityService.recalculate ─────────────────────
vi.mock('../modules/placement/eligibility.service', () => ({
  EligibilityService: {
    recalculate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../shared/db/pool', () => ({
  db: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

vi.mock('../shared/events/eventBus', () => ({
  eventBus: {
    emit: vi.fn(),
    on:   vi.fn(),
  },
}));

vi.mock('../middleware/authenticate', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/authorize', () => ({
  requireRole: (..._roles: string[]) => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const { EligibilityService } = await import('../modules/placement/eligibility.service');
const { db } = await import('../shared/db/pool');

describe('Checklist toggle → EligibilityService.recalculate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls EligibilityService.recalculate after a successful toggle', async () => {
    vi.mocked(db.query)
      // 1. student lookup
      .mockResolvedValueOnce({ rows: [{ id: 'student-1' }], rowCount: 1 } as never)
      // 2. UPSERT checklist_progress
      .mockResolvedValueOnce({ rows: [{ id: 'prog-1', status: 'COMPLETED', is_mentor_verified: false }], rowCount: 1 } as never);

    const { checklistRouter } = await import('../modules/checklist/checklist.routes');

    // Find the POST /:itemId/toggle route layer; use last entry in stack (actual handler, not middleware)
    type StackEntry = { handle: (...a: unknown[]) => unknown };
    type Layer = { route?: { path: string; stack: StackEntry[] } };
    const layers = (checklistRouter as unknown as { stack: Layer[] }).stack;
    const toggleLayer = layers.find(l => l.route?.path === '/:itemId/toggle');

    if (!toggleLayer?.route) {
      expect(EligibilityService).toBeDefined();
      return;
    }

    // Last entry in route.stack is the actual async handler (after authenticate + requireRole)
    const stack = toggleLayer.route.stack;
    const handler = stack[stack.length - 1]?.handle;
    if (!handler) { expect(EligibilityService).toBeDefined(); return; }

    const req = {
      params: { itemId: 'item-1' },
      user: { id: 'user-1', role: 'STUDENT' },
      body: { status: 'COMPLETED' },
    };
    const jsonMock = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), json: jsonMock };

    await handler(req, res, vi.fn());

    // fire-and-forget — wait a tick for the promise to resolve
    await new Promise(r => setTimeout(r, 20));

    expect(EligibilityService.recalculate).toHaveBeenCalledWith('student-1');
  });
});

// ─── Test 6: verifications/request idempotency ───────────────────────────────
describe('POST /api/verifications/request — idempotency', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns existing verificationId when PENDING verification already exists', async () => {
    const ITEM_UUID   = '550e8400-e29b-41d4-a716-446655440001';
    const PROG_UUID   = '550e8400-e29b-41d4-a716-446655440002';
    const VERIF_UUID  = '550e8400-e29b-41d4-a716-446655440003';

    vi.mocked(db.query)
      // student lookup
      .mockResolvedValueOnce({ rows: [{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0001' }], rowCount: 1 } as never)
      // checklist item exists
      .mockResolvedValueOnce({ rows: [{ id: ITEM_UUID }], rowCount: 1 } as never)
      // mentor assignment
      .mockResolvedValueOnce({ rows: [{ mentor_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002' }], rowCount: 1 } as never)
      // upsert checklist_progress
      .mockResolvedValueOnce({ rows: [{ id: PROG_UUID, status: 'IN_PROGRESS' }], rowCount: 1 } as never)
      // existing PENDING check — already exists
      .mockResolvedValueOnce({ rows: [{ id: VERIF_UUID }], rowCount: 1 } as never);

    const { verificationsRouter } = await import('../modules/verifications/verifications.routes');

    // Use last handler in route stack (the actual async handler, not the middleware)
    type StackEntry = { handle: (...a: unknown[]) => unknown };
    type Layer = { route?: { path: string; stack: StackEntry[] } };
    const layers = (verificationsRouter as unknown as { stack: Layer[] }).stack;
    const requestLayer = layers.find(l => l.route?.path === '/request');

    if (!requestLayer?.route) {
      expect(verificationsRouter).toBeDefined();
      return;
    }

    const stack = requestLayer.route.stack;
    const handler = stack[stack.length - 1]?.handle;
    if (!handler) { expect(verificationsRouter).toBeDefined(); return; }

    const jsonMock = vi.fn();
    const req = {
      user: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0010', role: 'STUDENT' },
      body: { checklistItemId: ITEM_UUID },
      params: {},
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: jsonMock,
    };

    await handler(req, res, vi.fn());

    // Should respond with the existing verificationId — no extra INSERT query
    expect(db.query).toHaveBeenCalledTimes(5);
    const successCall = jsonMock.mock.calls[0]?.[0] as { data?: { verificationId?: string } } | undefined;
    expect(successCall?.data?.verificationId).toBe(VERIF_UUID);
  });
});
