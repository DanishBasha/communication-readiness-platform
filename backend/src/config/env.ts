import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/college_readiness_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'college_readiness_db'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'college_readiness_super_secure_jwt_secret_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  proctoring: {
    maxTabSwitches: parseInt(process.env.MAX_TAB_SWITCH_LIMIT || '4', 10)
  },
  
  llm: {
    provider: (process.env.LLM_PROVIDER || 'mock').toLowerCase() as 'mock' | 'groq' | 'openai' | 'gemini',
    activeModel: process.env.ACTIVE_MODEL || 'gemini-1.5-flash',
    groqApiKey: process.env.GROQ_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    geminiApiKey: process.env.GEMINI_API_KEY || ''
  },
  
  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    uploadDir: process.env.UPLOAD_DIR || './uploads'
  }
};
