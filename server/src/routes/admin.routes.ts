import { Router, Request, Response } from 'express';
import { runWeeklyReset } from '../services/cron.service';
import { flushBuffer, getBufferSize } from '../services/score.service';
import { getPgPool } from '../config/postgres';
import { lastRps } from '../services/metrics.service';
import mongoose from 'mongoose';
import { getRedis } from '../config/redis';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

/**
 * GET /api/admin/metrics
 * Returns real-time technical metrics for the admin dashboard.
 */
router.get('/metrics', async (_req: Request, res: Response): Promise<void> => {
  try {
    const redis = getRedis();
    const start = process.hrtime();
    await redis.ping();
    const diff = process.hrtime(start);
    const latencyMs = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(1);

    res.status(200).json({
      bufferQueue: getBufferSize(),
      redisLatency: latencyMs,
      apiThroughput: lastRps
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch metrics.' });
  }
});

/**
 * POST /api/admin/trigger-cron
 * Only available in development. Manually triggers the weekly reset.
 */
router.post('/trigger-cron', async (_req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    res.status(403).json({ error: 'Only available in development.', code: 'FORBIDDEN_IN_PRODUCTION' });
    return;
  }
  try {
    // Flush any pending simulation scores to ensure they are captured in the reset
    await flushBuffer();
    await runWeeklyReset();
    res.status(200).json({ triggered: true });
  } catch (err) {
    console.error('[AdminRoute] ❌ Cron trigger failed:', (err as Error).message);
    res.status(500).json({ error: 'Weekly reset failed.', code: 'CRON_FAILED' });
  }
});

/**
 * POST /api/admin/flush
 * Flushes the score buffer to Redis synchronously.
 */
router.post('/flush', async (_req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    res.status(403).json({ error: 'Only available in development.', code: 'FORBIDDEN_IN_PRODUCTION' });
    return;
  }
  try {
    await flushBuffer();
    res.status(200).json({ flushed: true });
  } catch (err) {
    res.status(500).json({ error: 'Flush failed' });
  }
});

/**
 * POST /api/admin/simulate
 *
 * Selects 200 random users from PostgreSQL and adds a random score
 * (between 1,000 and 50,000) for each via the score buffer.
 * Each call selects a different random subset of users.
 * No authentication required (development use only).
 *
 * 200: { simulated: true, usersAffected: number }
 * 500: unexpected error
 */
router.post('/simulate', async (_req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    res.status(403).json({ error: 'Only available in development.', code: 'FORBIDDEN_IN_PRODUCTION' });
    return;
  }
  try {
    const pool = getPgPool();

    // Select 999 random users to simulate random scores (prevent Redis rate limits)
    const { rows } = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE email != 'demo@panteon.games' ORDER BY RANDOM() LIMIT 999",
    );

    const { rows: demoRows } = await pool.query<{ id: string }>(
      "SELECT id FROM users WHERE email = 'demo@panteon.games' LIMIT 1"
    );

    const demoScoreDelta = () => Math.floor(Math.random() * (35 - 15 + 1)) + 15; // 15 to 35
    const botScoreDelta = () => Math.floor(Math.random() * (200 - 100 + 1)) + 100; // 100 to 200

    const client = getRedis();
    const leaderboardKey = `leaderboard:week_${process.env.CURRENT_WEEK ?? '1'}`;
    const prizePoolKey = `prize_pool:week_${process.env.CURRENT_WEEK ?? '1'}`;

    let totalPrizePoolDelta = 0;
    const chunkSize = 10000;

    // Combine all updates into a single array for chunking
    const updates: { id: string, delta: number }[] = rows.map(row => {
      const delta = botScoreDelta();
      totalPrizePoolDelta += delta * 0.02; // 2%
      return { id: row.id, delta };
    });

    if (demoRows.length > 0) {
      const delta = demoScoreDelta();
      totalPrizePoolDelta += delta * 0.02;
      updates.push({ id: demoRows[0].id, delta });
    }

    // Process updates in chunks directly to Redis
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const pipeline = client.pipeline();

      for (const { id, delta } of chunk) {
        pipeline.zincrby(leaderboardKey, delta, id);
      }

      const results = await pipeline.exec();
      if (results) {
        const firstError = results.find(([err]) => err !== null)?.[0];
        if (firstError) throw firstError;
      }
    }

    // Update prize pool
    if (totalPrizePoolDelta > 0) {
      await client.incrbyfloat(prizePoolKey, totalPrizePoolDelta);
    }

    console.log(`[AdminRoute] ✅ Simulated ${updates.length} score updates instantly.`);
    res.status(200).json({ simulated: true, usersAffected: updates.length });
  } catch (err) {
    console.error('[AdminRoute] ❌ Simulate failed:', (err as Error).message);
    res.status(500).json({ error: 'Simulation failed.', code: 'SIMULATE_FAILED' });
  }
});

/**
 * POST /api/admin/hard-reset
 * Flushes Redis, clears MongoDB history, backfills Week 1, and restarts the server by modifying .env
 */
router.post('/hard-reset', async (_req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    res.status(403).json({ error: 'Only available in development.', code: 'FORBIDDEN_IN_PRODUCTION' });
    return;
  }

  try {
    console.log('[AdminRoute] ⚠️ HARD RESET INITIATED...');

    // 1. Flush Redis
    const client = getRedis();
    await client.flushall();

    // 2. Clear MongoDB
    await mongoose.connection.collection('weeklyrewards').deleteMany({});

    // 3. Backfill Week 1
    const week = '1';
    const leaderboardKey = `leaderboard:week_${week}`;
    const prizePoolKey = `prize_pool:week_${week}`;

    const pool = getPgPool();
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM users');
    const userIds = rows.map(r => r.id);

    await client.set(prizePoolKey, '0');

    const chunkSize = 5000;
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);
      const args: (string | number)[] = ['NX'];
      for (const id of chunk) {
        args.push(0, id);
      }
      await client.zadd(leaderboardKey, ...args);
    }

    console.log(`[AdminRoute] ✅ Hard reset backfill complete for ${userIds.length} users.`);

    // Send response BEFORE modifying .env to ensure the client gets the 200 OK
    res.status(200).json({ reset: true });

    // Modify .env after 1 second, which will trigger ts-node-dev to restart the server
    setTimeout(() => {
      console.log('[AdminRoute] 🔄 Updating .env to CURRENT_WEEK=1 and restarting server...');
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath) && process.env.NODE_ENV !== 'development') {
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('CURRENT_WEEK=')) {
          envContent = envContent.replace(/CURRENT_WEEK=\d+/, 'CURRENT_WEEK=1');
        } else {
          envContent += '\nCURRENT_WEEK=1\n';
        }
        fs.writeFileSync(envPath, envContent);
      }
      process.env.CURRENT_WEEK = '1';
      console.log('[AdminRoute] ✨ In-memory CURRENT_WEEK updated to 1.');
    }, 1000);

  } catch (err) {
    console.error('[AdminRoute] ❌ Hard reset failed:', (err as Error).message);
    res.status(500).json({ error: 'Hard reset failed.', code: 'HARD_RESET_FAILED' });
  }
});

export default router;
