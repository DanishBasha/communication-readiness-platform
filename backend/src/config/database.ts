import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from './env';

export const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const db = {
  query: async <T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> => {
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (config.nodeEnv === 'development' && duration > 500) {
        console.warn(`[SLOW QUERY] ${duration}ms: ${text.slice(0, 100)}`);
      }
      return res;
    } catch (error) {
      console.error(`Database Query Error in: ${text.slice(0, 100)}`, error);
      throw error;
    }
  },
  getClient: () => pool.connect()
};

export default pool;
