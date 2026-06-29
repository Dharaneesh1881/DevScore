import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

// Master DB — must be imported before any master models are used
import './db/masterDb.js';

import { createRedisClient } from './utils/redis.js';
import submissionsRouter from './routes/submissions.js';
import authRouter from './routes/auth.js';
import assignmentsRouter from './routes/assignments.js';
import uploadsRouter from './routes/uploads.js';
import progressRouter from './routes/progress.js';
import platformAdminRouter from './routes/platform-admin.js';
import industryAdminRouter from './routes/industry-admin.js';
import groupsRouter from './routes/groups.js';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
});

// Trust the first proxy hop (Render / Cloudflare) so rate-limit sees the real client IP
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '2mb' }));
app.set('io', io);

// Health check for uptime monitors and load balancers
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const submissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions, please wait a minute.' },
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/submissions', submissionLimiter);
app.use('/api', submissionsRouter);
app.use('/api/auth', authRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api', uploadsRouter);
app.use('/api', progressRouter);
app.use('/api', platformAdminRouter);
app.use('/api', industryAdminRouter);
app.use('/api', groupsRouter);

// ── Redis pub/sub → Socket.IO ─────────────────────────────────────────────────
const redisSub = createRedisClient();

redisSub.subscribe('eval:done', (err) => {
  if (err) console.error('Redis subscribe error:', err);
  else console.log('Subscribed to eval:done channel');
});

redisSub.on('message', (channel, message) => {
  if (channel === 'eval:done') {
    try {
      const { submissionId } = JSON.parse(message);
      io.emit('evaluation:complete', { submissionId });
      console.log('Emitted evaluation:complete for', submissionId);
    } catch (e) {
      console.error('Failed to parse eval:done message:', e);
    }
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Global error handler — catches any unhandled errors from routes/middleware
app.use((err, req, res, _next) => {
  console.error('[Unhandled error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`API server running on port ${PORT}`));
