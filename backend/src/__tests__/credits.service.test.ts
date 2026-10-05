/**
 * CreditService unit tests — mock the pg pool client so no live DB needed.
 *
 * The CreditService uses db.connect() → client.query() → client.release().
 * We intercept 'src/shared/db/pool' and return a controllable fake client.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Minimal fake pg client ─────────────────────────────────────────────────
type QueryResult = { rows: Record<string, unknown>[]; rowCount?: number };

function makeFakeClient(queryMap: Map<string, QueryResult>) {
  const queries: string[] = [];
  const client = {
    queries,
    query: vi.fn(async (sql: string, _params?: unknown[]) => {
      queries.push(sql.trim().split(/\s+/)[0].toUpperCase()); // log first word
      // Match by first keyword or full match
      for (const [key, result] of queryMap) {
        if (sql.includes(key)) return result;
      }
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  };
  return client;
}

// ── Mock pool module before importing CreditService ───────────────────────
const mockConnect = vi.fn();
vi.mock('../shared/db/pool', () => ({
  db: { connect: mockConnect },
}));

// ── Import after mock ─────────────────────────────────────────────────────
const { CreditService } = await import('../modules/credits/credits.service');
const { AppError } = await import('../shared/errors/AppError');

// ─────────────────────────────────────────────────────────────────────────────
describe('CreditService.consume()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deducts balance and returns newBalance + transactionId', async () => {
    const queryMap = new Map<string, QueryResult>([
      // idempotency check — no existing row
      ['SELECT id, balance_after FROM credit.credit_transactions WHERE idempotency_key', { rows: [] }],
      // account lock
      ['SELECT id, balance FROM credit.credit_accounts WHERE student_id', {
        rows: [{ id: 'acct-1', balance: '50' }],
      }],
      // account update
      ['UPDATE credit.credit_accounts SET balance', { rows: [], rowCount: 1 }],
      // insert transaction
      ['INSERT INTO credit.credit_transactions', { rows: [{ id: 'txn-1' }] }],
      // BEGIN / COMMIT
      ['BEGIN', { rows: [] }],
      ['COMMIT', { rows: [] }],
      ['ROLLBACK', { rows: [] }],
    ]);
    const client = makeFakeClient(queryMap);
    mockConnect.mockResolvedValue(client);

    const result = await CreditService.consume('student-1', 10, 'ASSESSMENT_START', 'ref-1');

    expect(result.newBalance).toBe(40);
    expect(result.transactionId).toBe('txn-1');
    expect(client.release).toHaveBeenCalled();
  });

  it('throws INSUFFICIENT_CREDITS when balance < amount', async () => {
    const queryMap = new Map<string, QueryResult>([
      ['SELECT id, balance_after FROM credit.credit_transactions WHERE idempotency_key', { rows: [] }],
      ['SELECT id, balance FROM credit.credit_accounts WHERE student_id', {
        rows: [{ id: 'acct-1', balance: '5' }],
      }],
      ['BEGIN', { rows: [] }],
      ['ROLLBACK', { rows: [] }],
    ]);
    const client = makeFakeClient(queryMap);
    mockConnect.mockResolvedValue(client);

    await expect(
      CreditService.consume('student-1', 10, 'ASSESSMENT_START', 'ref-1')
    ).rejects.toMatchObject({ statusCode: 402, code: 'INSUFFICIENT_CREDITS' });

    expect(client.release).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when no credit account exists', async () => {
    const queryMap = new Map<string, QueryResult>([
      ['SELECT id, balance_after FROM credit.credit_transactions WHERE idempotency_key', { rows: [] }],
      ['SELECT id, balance FROM credit.credit_accounts WHERE student_id', { rows: [] }],
      ['BEGIN', { rows: [] }],
      ['ROLLBACK', { rows: [] }],
    ]);
    const client = makeFakeClient(queryMap);
    mockConnect.mockResolvedValue(client);

    await expect(
      CreditService.consume('ghost-student', 10, 'ASSESSMENT_START', 'ref-1')
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('returns cached result on duplicate idempotency key (no double-deduct)', async () => {
    const queryMap = new Map<string, QueryResult>([
      ['SELECT id, balance_after FROM credit.credit_transactions WHERE idempotency_key', {
        rows: [{ id: 'txn-existing', balance_after: '40' }],
      }],
      ['BEGIN', { rows: [] }],
      ['ROLLBACK', { rows: [] }],
    ]);
    const client = makeFakeClient(queryMap);
    mockConnect.mockResolvedValue(client);

    const result = await CreditService.consume('student-1', 10, 'ASSESSMENT_START', 'ref-1');

    expect(result.newBalance).toBe(40);
    expect(result.transactionId).toBe('txn-existing');
    // UPDATE should NOT have been called
    const updateCalled = client.queries.includes('UPDATE');
    expect(updateCalled).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CreditService.earn()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('increases balance up to max_balance cap', async () => {
    const queryMap = new Map<string, QueryResult>([
      ['SELECT id, balance_after FROM credit.credit_transactions WHERE idempotency_key', { rows: [] }],
      ['SELECT id, balance FROM credit.credit_accounts WHERE student_id', {
        rows: [{ id: 'acct-1', balance: '195' }],
      }],
      // policy: max_balance = 200
      ['SELECT max_balance FROM credit.credit_policies', {
        rows: [{ max_balance: '200' }],
      }],
      ['UPDATE credit.credit_accounts SET balance', { rows: [], rowCount: 1 }],
      ['INSERT INTO credit.credit_transactions', { rows: [{ id: 'txn-2' }] }],
      ['BEGIN', { rows: [] }],
      ['COMMIT', { rows: [] }],
      ['ROLLBACK', { rows: [] }],
    ]);
    const client = makeFakeClient(queryMap);
    mockConnect.mockResolvedValue(client);

    // earn 20, but balance = 195 and cap = 200 → should cap at 200
    const result = await CreditService.earn('student-1', 20, 'ATTEMPT_COMPLETED', 'attempt-1');
    expect(result.newBalance).toBe(200); // capped
    expect(result.transactionId).toBe('txn-2');
  });

  it('earns full amount when below cap', async () => {
    const queryMap = new Map<string, QueryResult>([
      ['SELECT id, balance_after FROM credit.credit_transactions WHERE idempotency_key', { rows: [] }],
      ['SELECT id, balance FROM credit.credit_accounts WHERE student_id', {
        rows: [{ id: 'acct-1', balance: '40' }],
      }],
      ['SELECT max_balance FROM credit.credit_policies', { rows: [] }], // no cap = Infinity
      ['UPDATE credit.credit_accounts SET balance', { rows: [], rowCount: 1 }],
      ['INSERT INTO credit.credit_transactions', { rows: [{ id: 'txn-3' }] }],
      ['BEGIN', { rows: [] }],
      ['COMMIT', { rows: [] }],
      ['ROLLBACK', { rows: [] }],
    ]);
    const client = makeFakeClient(queryMap);
    mockConnect.mockResolvedValue(client);

    const result = await CreditService.earn('student-1', 10, 'ATTEMPT_COMPLETED', 'attempt-2');
    expect(result.newBalance).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CreditService.createAccount()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates account with initial balance from policy', async () => {
    const queryMap = new Map<string, QueryResult>([
      // no existing account
      ['SELECT id FROM credit.credit_accounts WHERE student_id', { rows: [] }],
      // policy: initial = 50
      ['SELECT initial_credit_amount FROM credit.credit_policies', {
        rows: [{ initial_credit_amount: '50' }],
      }],
      ['INSERT INTO credit.credit_accounts', { rows: [{ id: 'new-acct' }] }],
      ['INSERT INTO credit.credit_transactions', { rows: [] }],
      ['BEGIN', { rows: [] }],
      ['COMMIT', { rows: [] }],
      ['ROLLBACK', { rows: [] }],
    ]);
    const client = makeFakeClient(queryMap);
    mockConnect.mockResolvedValue(client);

    await expect(CreditService.createAccount('student-new')).resolves.toBeUndefined();
    expect(client.release).toHaveBeenCalled();
  });

  it('is idempotent: silently returns if account already exists', async () => {
    const queryMap = new Map<string, QueryResult>([
      ['SELECT id FROM credit.credit_accounts WHERE student_id', { rows: [{ id: 'existing' }] }],
      ['BEGIN', { rows: [] }],
      ['ROLLBACK', { rows: [] }],
    ]);
    const client = makeFakeClient(queryMap);
    mockConnect.mockResolvedValue(client);

    await expect(CreditService.createAccount('student-existing')).resolves.toBeUndefined();
    // INSERT should NOT have been called
    const insertCalled = client.queries.includes('INSERT');
    expect(insertCalled).toBe(false);
  });
});
