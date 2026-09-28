/**
 * EligibilityService unit tests.
 * Tests the eligibility determination logic with mocked DB queries.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Fake client builder ────────────────────────────────────────────────────
type QueryResult = { rows: Record<string, unknown>[]; rowCount?: number };

function makeSequentialClient(responses: QueryResult[]) {
  let idx = 0;
  const client = {
    query: vi.fn(async () => responses[idx++] ?? { rows: [], rowCount: 0 }),
    release: vi.fn(),
  };
  return client;
}

const mockConnect = vi.fn();
vi.mock('../shared/db/pool', () => ({
  db: { connect: mockConnect },
}));

const { EligibilityService } = await import('../modules/placement/eligibility.service');

// ─────────────────────────────────────────────────────────────────────────────
describe('EligibilityService.recalculate()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks eligible when all required items verified, perf ≥ 60, balance > 0', async () => {
    const client = makeSequentialClient([
      // checklist query
      { rows: [{ required_total: '3', required_verified: '3', total_score: '90', max_score: '100' }] },
      // performance profile
      { rows: [{ overall_score: '72.5' }] },
      // credit balance
      { rows: [{ balance: '40' }] },
      // upsert
      { rows: [], rowCount: 1 },
    ]);
    mockConnect.mockResolvedValue(client);

    await EligibilityService.recalculate('student-1');

    const upsertCall = client.query.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO placement.placement_eligibility')
    );
    expect(upsertCall).toBeTruthy();
    // is_eligible = true should be passed as 5th param (index 4, 0-based)
    const params = upsertCall![1] as unknown[];
    const isEligibleIdx = 4;
    expect(params[isEligibleIdx]).toBe(true);
  });

  it('marks ineligible when required items not all verified', async () => {
    const client = makeSequentialClient([
      { rows: [{ required_total: '3', required_verified: '2', total_score: '60', max_score: '100' }] },
      { rows: [{ overall_score: '75.0' }] },
      { rows: [{ balance: '30' }] },
      { rows: [], rowCount: 1 },
    ]);
    mockConnect.mockResolvedValue(client);

    await EligibilityService.recalculate('student-2');

    const upsertCall = client.query.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO placement.placement_eligibility')
    );
    const params = upsertCall![1] as unknown[];
    expect(params[4]).toBe(false); // is_eligible
    // blocking_reasons should mention pending verification
    const blockingReasons = JSON.parse(params[5] as string) as string[];
    expect(blockingReasons.some((r: string) => r.includes('mentor verification'))).toBe(true);
  });

  it('marks ineligible when performance score < 60', async () => {
    const client = makeSequentialClient([
      { rows: [{ required_total: '2', required_verified: '2', total_score: '80', max_score: '100' }] },
      { rows: [{ overall_score: '45.0' }] }, // below 60 threshold
      { rows: [{ balance: '40' }] },
      { rows: [], rowCount: 1 },
    ]);
    mockConnect.mockResolvedValue(client);

    await EligibilityService.recalculate('student-3');

    const upsertCall = client.query.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO placement.placement_eligibility')
    );
    const params = upsertCall![1] as unknown[];
    expect(params[4]).toBe(false);
    const blockingReasons = JSON.parse(params[5] as string) as string[];
    expect(blockingReasons.some((r: string) => r.includes('60.0'))).toBe(true);
  });

  it('marks ineligible when credit balance is zero', async () => {
    const client = makeSequentialClient([
      { rows: [{ required_total: '1', required_verified: '1', total_score: '80', max_score: '100' }] },
      { rows: [{ overall_score: '70.0' }] },
      { rows: [{ balance: '0' }] }, // zero balance
      { rows: [], rowCount: 1 },
    ]);
    mockConnect.mockResolvedValue(client);

    await EligibilityService.recalculate('student-4');

    const upsertCall = client.query.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO placement.placement_eligibility')
    );
    const params = upsertCall![1] as unknown[];
    expect(params[4]).toBe(false);
    const blockingReasons = JSON.parse(params[5] as string) as string[];
    expect(blockingReasons.some((r: string) => r.includes('Credit balance'))).toBe(true);
  });

  it('handles student with no performance profile (M3 not yet implemented)', async () => {
    const client = makeSequentialClient([
      { rows: [{ required_total: '1', required_verified: '1', total_score: '80', max_score: '100' }] },
      { rows: [] }, // no performance_profiles row
      { rows: [{ balance: '50' }] },
      { rows: [], rowCount: 1 },
    ]);
    mockConnect.mockResolvedValue(client);

    await EligibilityService.recalculate('student-5');

    const upsertCall = client.query.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO placement.placement_eligibility')
    );
    const params = upsertCall![1] as unknown[];
    // perfScore defaults to 0 → ineligible
    expect(params[4]).toBe(false);
    const blockingReasons = JSON.parse(params[5] as string) as string[];
    expect(blockingReasons.some((r: string) => r.includes('0.0'))).toBe(true);
  });

  it('releases db client even when query throws', async () => {
    const client = {
      query: vi.fn().mockRejectedValueOnce(new Error('DB connection lost')),
      release: vi.fn(),
    };
    mockConnect.mockResolvedValue(client);

    await expect(EligibilityService.recalculate('student-err')).rejects.toThrow('DB connection lost');
    expect(client.release).toHaveBeenCalled();
  });
});
