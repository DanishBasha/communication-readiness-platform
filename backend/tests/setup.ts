/**
 * Vitest global setup — runs before every test file worker.
 * Sets DATABASE_URL so env.ts picks up the correct connection string
 * before the module is first imported by a test.
 */

// Allow override via actual environment; fall back to the dev DB.
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://tamildev:123_TamiL_321@127.0.0.1:5422/comm_readiness';

// Ensure JWT_SECRET meets the 32-char minimum required by env.ts
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production-min-32-chars';
