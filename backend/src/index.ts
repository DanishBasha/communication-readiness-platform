import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import taskRoutes from './routes/taskRoutes';
import interviewRoutes from './routes/interviewRoutes';
import listeningRoutes from './routes/listeningRoutes';
import suggestionRoutes from './routes/suggestionRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();

// Middleware
app.use(cors({
  origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger in dev
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.path}`);
    next();
  });
}

// Health Check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'UP',
    environment: config.nodeEnv,
    activeLlmProvider: config.llm.provider,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/listening', listeningRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/admin', adminRoutes);

// Centralized Error Handling
app.use(errorHandler);

// Start HTTP Server
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`🚀 Communication Readiness Platform Backend`);
    console.log(`📡 Listening on http://localhost:${config.port}`);
    console.log(`🤖 Active LLM Provider: ${config.llm.provider.toUpperCase()}`);
    console.log(`🏢 Target Environment: ${config.nodeEnv}`);
    console.log(`====================================================`);
  });
}

export default app;
