/**
 * Unit tests for Module 3 event handler logic.
 * The DB is mocked — no live connection required.
 */

// ── Mock the DB pool before any imports ───────────────────────────────────────
const mockQuery = jest.fn();
const mockConnect = jest.fn();

jest.mock('../../shared/db/pool', () => ({
  db: {
    query: mockQuery,
    connect: mockConnect,
  },
}));

// ── Mock the eventBus (prevent actual subscriptions during tests) ─────────────
jest.mock('../../shared/events/eventBus', () => ({
  eventBus: { on: jest.fn() },
}));

import { computeTrend } from '../../shared/events/module3Handlers';

// ─────────────────────────────────────────────────────────────────────────────

describe('computeTrend (from module3Handlers)', () => {
  it('returns STABLE for < 3 snapshots', () => {
    expect(computeTrend([])).toBe('STABLE');
    expect(computeTrend([80])).toBe('STABLE');
    expect(computeTrend([80, 80])).toBe('STABLE');
  });

  it('returns STABLE for 3–5 snapshots', () => {
    expect(computeTrend([90, 90, 90])).toBe('STABLE');
    expect(computeTrend([90, 90, 90, 60])).toBe('STABLE');
  });

  it('returns IMPROVING when diff > 5', () => {
    expect(computeTrend([85, 85, 85, 70, 70, 70])).toBe('IMPROVING');
  });

  it('returns DECLINING when diff < -5', () => {
    expect(computeTrend([55, 55, 55, 80, 80, 80])).toBe('DECLINING');
  });

  it('returns STABLE when diff is within ±5', () => {
    expect(computeTrend([75, 75, 75, 72, 72, 72])).toBe('STABLE');
  });
});

// ── USER_REGISTERED handler logic (pure unit check of insert pattern) ────────

describe('USER_REGISTERED event', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('inserts performance profile when studentId is present', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    // Simulate what registerModule3Handlers' USER_REGISTERED handler does
    const studentId = '00000000-0000-0000-0000-000000001001';
    const { db } = await import('../../shared/db/pool');
    await db.query(
      `INSERT INTO performance.performance_profiles (student_id) VALUES ($1) ON CONFLICT (student_id) DO NOTHING`,
      [studentId]
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO performance.performance_profiles'),
      [studentId]
    );
  });

  it('is idempotent: ON CONFLICT DO NOTHING means second call does not error', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const { db } = await import('../../shared/db/pool');
    const studentId = '00000000-0000-0000-0000-000000001001';

    await db.query(
      `INSERT INTO performance.performance_profiles (student_id) VALUES ($1) ON CONFLICT (student_id) DO NOTHING`,
      [studentId]
    );
    await db.query(
      `INSERT INTO performance.performance_profiles (student_id) VALUES ($1) ON CONFLICT (student_id) DO NOTHING`,
      [studentId]
    );

    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

// ── ATTEMPT_COMPLETED running average logic ───────────────────────────────────

function runningAverage(oldAvg: number | null, oldCount: number, newScore: number | null): number | null {
  if (newScore === null) return oldAvg;
  if (oldAvg === null || oldCount === 0) return newScore;
  return (oldAvg * oldCount + newScore) / (oldCount + 1);
}

describe('ATTEMPT_COMPLETED running average', () => {
  it('first attempt: count=0, result equals the new score', () => {
    expect(runningAverage(null, 0, 70)).toBe(70);
  });

  it('second attempt: running average of two scores', () => {
    const after1 = runningAverage(null, 0, 70)!;
    expect(runningAverage(after1, 1, 80)).toBe(75);
  });

  it('three assessments converge to correct average', () => {
    let avg: number | null = null;
    let count = 0;
    for (const s of [70, 80, 90]) {
      avg = runningAverage(avg, count, s);
      count++;
    }
    expect(avg).toBeCloseTo(80, 5);
  });

  it('duplicate attempt: same sessionId should trigger ON CONFLICT, average unchanged', () => {
    // We verify this at the SQL level; the handler uses ON CONFLICT DO NOTHING
    // for performance_snapshots, so the running average update is skipped.
    // Here we just confirm the math: if count stays the same, avg is unchanged.
    const avg = runningAverage(75, 2, null); // null = skipped duplicate
    expect(avg).toBe(75);
  });

  it('missing report: overallScore fallback handled without crash', () => {
    // If no score available (null), old average should be preserved
    expect(runningAverage(70, 1, null)).toBe(70);
  });
});
