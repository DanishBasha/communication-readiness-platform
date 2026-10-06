import { Pool } from 'pg';
import { env } from './env';

// Supabase pooler connections (port 6543 = transaction-mode) and remote
// Postgres connections need more time than the default 2 s budget.
// SSL is required by Supabase; rejectUnauthorized:false avoids self-signed
// cert issues on the pooler end.
const needsSsl = env.DATABASE_URL.includes('supabase.com')
  || env.DATABASE_URL.includes('supabase.co')
  || env.DATABASE_URL.includes('sslmode=require');

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 30,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

db.on('connect', () => {
  if (env.NODE_ENV === 'development') {
    console.log('[db] pool connected');
  }
});
