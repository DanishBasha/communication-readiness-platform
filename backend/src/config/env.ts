import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AI_SERVICE_URL: z.string().url().default('http://127.0.0.1:8000'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32).default('dev-secret-change-in-production-min-32-chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/comm_readiness'),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_TAB_SWITCH_LIMIT: z.coerce.number().int().min(1).default(4),
  MAX_REPLAY_COUNT: z.coerce.number().int().min(1).default(2),
  MAX_QUESTIONS_PER_SESSION: z.coerce.number().int().min(1).default(5),
  // Redis for session context cache (TTL: 2 hours per session)
  REDIS_URL: z.string().default('redis://localhost:6379'),
  // vLLM / LLM generation settings (used by knowledge service and future RAG prompts)
  // VLLM_BASE_URL must include the /v1 path: e.g. http://host:8000/v1
  VLLM_BASE_URL: z.string().default(''),
  VLLM_MODEL: z.string().default('local-model'),
  VLLM_TIMEOUT_MS: z.coerce.number().default(30000),
  // Knowledge / RAG settings
  RAG_CHUNK_SIZE: z.coerce.number().default(2000),
  RAG_CHUNK_OVERLAP: z.coerce.number().default(200),
  RAG_TOP_K: z.coerce.number().default(5),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
});

export const env = schema.parse(process.env);
