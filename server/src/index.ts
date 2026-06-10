import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import { connectPostgres } from './config/postgres';
import { connectMongo } from './config/mongo';
import { connectRedis } from './config/redis';
import { startFlushInterval } from './services/score.service';
import { scheduleCronJob } from './services/cron.service';

import authRouter from './routes/auth.routes';
import leaderboardRouter from './routes/leaderboard.routes';
import scoreRouter from './routes/score.routes';
import adminRouter from './routes/admin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ───────────────────────────────────────────────────────────────
// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

import { rpsMiddleware } from './services/metrics.service';
app.use(rpsMiddleware);

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/score', scoreRouter);
app.use('/api/admin', adminRouter);

/**
 * Bootstraps the application by establishing all database connections
 * and starting background services before opening the HTTP server.
 * PostgreSQL and MongoDB failures are fatal; Redis failure is non-fatal.
 */
async function bootstrap(): Promise<void> {
  console.log('[Server] Starting up...');

  await connectPostgres();
  await connectMongo();
  await connectRedis();

  // Ensure leaderboard has all users if it is empty
  const { ensureLeaderboardInitialized } = await import('./services/leaderboard.service');
  await ensureLeaderboardInitialized();

  // Start the 5-second score buffer flush interval
  startFlushInterval();

  // Schedule the weekly cron job (every Monday 00:00 UTC)
  scheduleCronJob();

  app.listen(PORT, () => {
    console.log(`[Server] ✅ Listening on port ${PORT}`);
  });
}

bootstrap().catch((err: Error) => {
  console.error('[Server] ❌ Fatal startup error:', err.message);
  process.exit(1);
});

export default app;
