import 'dotenv/config';
import http from 'http';
import app, { attachWebSocket } from './app';
import { env } from './config/env';
import { eventBus } from './shared/events/eventBus';
import { Events, UserRegisteredPayload } from './shared/events/events';
import { db } from './shared/db/pool';
import { registerM4EventHandlers } from './modules/credits/event-handlers';

// M1 handler: write audit log on registration (non-blocking)
eventBus.on(Events.USER_REGISTERED, async (payload: UserRegisteredPayload) => {
  try {
    await db.query(
      `INSERT INTO system.audit_logs (user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, 'USER_REGISTERED', 'USER', $1::uuid, $2)`,
      [payload.userId, JSON.stringify({ studentId: payload.studentId, email: payload.email })]
    );
  } catch (err) {
    console.error('[eventBus] USER_REGISTERED handler error:', err);
  }
});

// Module 4 — credit accounts, earn-on-attempt, eligibility recalculation
registerM4EventHandlers();

// Create HTTP server from Express app so WebSocket can share the same port
const server = http.createServer(app);
attachWebSocket(server);

server.listen(env.PORT, () => {
  console.log(`[backend] http://localhost:${env.PORT}  (${env.NODE_ENV})`);
  console.log(`[backend] ws://localhost:${env.PORT}/interview?sessionId=<id>&token=<jwt>`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
