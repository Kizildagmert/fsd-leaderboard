import cron from 'node-cron';
import { getRedis } from '../config/redis';
import { WeeklyReward } from '../models/weeklyReward.model';

/**
 * Pre-computed total weight for ranks 4–100 (weighted inverse rank formula).
 * TotalWeight = SUM of (101 - rank) for rank = 4 to 100
 *             = SUM of 97 + 96 + ... + 1 = 97 * 98 / 2 = 4753
 */
const TOTAL_WEIGHT = 4753;

/**
 * Calculates the reward amount for a given rank.
 *
 * Distribution:
 *   Rank 1  → 20% of total pool
 *   Rank 2  → 15% of total pool
 *   Rank 3  → 10% of total pool
 *   Rank 4–100 → weighted inverse rank:
 *     Weight(rank) = 101 - rank
 *     Reward(rank) = (Weight / 4753) * 0.55 * totalPool
 *
 * @param rank      - 1-based rank of the player.
 * @param totalPool - Total prize pool value for the week.
 * @returns Calculated reward amount (floating point).
 */
function calculateReward(rank: number, totalPool: number): number {
  switch (rank) {
    case 1: return totalPool * 0.20;
    case 2: return totalPool * 0.15;
    case 3: return totalPool * 0.10;
    default: {
      const weight = 101 - rank;
      return (weight / TOTAL_WEIGHT) * 0.55 * totalPool;
    }
  }
}

/**
 * Executes the full weekly reset sequence in strict order:
 *
 * 1. Fetch Top 100 from Redis  (ZREVRANGE WITHSCORES)
 * 2. Fetch prize pool          (GET)
 * 3. Calculate rewards         (formula)
 * 4. Persist rewards to MongoDB
 * 5. Delete leaderboard key    (DEL)
 * 6. Delete prize pool key     (DEL)
 * 7. Increment week counter, initialise new Redis keys
 *
 * @throws Will throw if Redis or MongoDB operations fail.
 */
export async function runWeeklyReset(): Promise<void> {
  const client = getRedis();
  const week = parseInt(process.env.CURRENT_WEEK ?? '1', 10);

  const leaderboardKey = `leaderboard:week_${week}`;
  const prizePoolKey = `prize_pool:week_${week}`;

  console.log(`[CronService] 🚀 Weekly reset started — week ${week}`);

  // ── Step 1: Fetch ALL players ─────────────────────────────────────────────
  const raw = await client.zrevrange(leaderboardKey, 0, -1, 'WITHSCORES');

  if (raw.length === 0) {
    console.warn('[CronService] ⚠️  Leaderboard is empty — skipping reward distribution.');
  }

  /** Array of { userId, rank (1-based), score } */
  const allPlayers: Array<{ userId: string; rank: number; score: number }> = [];
  for (let i = 0; i < raw.length; i += 2) {
    allPlayers.push({
      userId: raw[i],
      rank: allPlayers.length + 1,
      score: parseFloat(raw[i + 1]),
    });
  }

  console.log(`[CronService] ✅ Step 1: Fetched ${allPlayers.length} players from Redis.`);

  // ── Step 2: Fetch prize pool ──────────────────────────────────────────────
  const poolRaw = await client.get(prizePoolKey);
  const totalPool = poolRaw !== null ? parseFloat(poolRaw) : 0;

  console.log(`[CronService] ✅ Step 2: Prize pool = ${totalPool}`);

  // ── Step 3 & 4: Calculate rewards and persist to MongoDB ─────────────────
  if (allPlayers.length > 0) {
    const distributedAt = new Date();

    // Clear any existing records for this week to prevent duplicates if reset runs multiple times
    await WeeklyReward.deleteMany({ week });

    const rewardDocs = allPlayers.map(({ userId, rank, score }) => ({
      userId,
      week,
      rank,
      score,
      rewardAmount: rank <= 100 ? calculateReward(rank, totalPool) : 0,
      distributedAt,
    }));

    // Use native driver for extremely fast insertion (bypasses Mongoose validation overhead)
    // We can insert 100k records directly in ~200ms
    await WeeklyReward.collection.insertMany(rewardDocs, { ordered: false });

    console.log(`[CronService] ✅ Steps 3–4: Old records cleared. New rewards calculated and saved to MongoDB (${rewardDocs.length} records).`);

    // Log top 3 for visibility
    rewardDocs.slice(0, 3).forEach(({ rank, userId, rewardAmount }) => {
      console.log(`  Rank ${rank}: userId=${userId} → reward=${rewardAmount.toFixed(2)}`);
    });
  }

  // ── Step 5: Delete current leaderboard key ────────────────────────────────
  await client.del(leaderboardKey);
  console.log(`[CronService] ✅ Step 5: Deleted ${leaderboardKey}`);

  // ── Step 6: Delete current prize pool key ────────────────────────────────
  await client.del(prizePoolKey);
  console.log(`[CronService] ✅ Step 6: Deleted ${prizePoolKey}`);

  // ── Step 7: Increment week and initialise new keys ────────────────────────
  const nextWeek = week + 1;
  process.env.CURRENT_WEEK = String(nextWeek);

  // Persist CURRENT_WEEK to .env to survive restarts
  try {
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath) && process.env.NODE_ENV !== 'development') {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('CURRENT_WEEK=')) {
        envContent = envContent.replace(/CURRENT_WEEK=\d+/, `CURRENT_WEEK=${nextWeek}`);
      } else {
        envContent += `\nCURRENT_WEEK=${nextWeek}\n`;
      }
      fs.writeFileSync(envPath, envContent);
      console.log(`[CronService] ✅ Persisted CURRENT_WEEK=${nextWeek} to .env`);
    }
  } catch (err) {
    console.error(`[CronService] ❌ Failed to persist CURRENT_WEEK to .env:`, err);
  }

  const nextLeaderboardKey = `leaderboard:week_${nextWeek}`;
  const nextPrizePoolKey = `prize_pool:week_${nextWeek}`;

  // Initialise prize pool for the new week at 0
  await client.set(nextPrizePoolKey, '0');

  // Fetch all existing users and add them to the new week with 0 score
  const { getAllUserIds } = await import('./auth.service');
  const allUsers = await getAllUserIds();

  if (allUsers.length > 0) {
    // Add all users using batched ZADD to prevent maximum call stack and pipeline overload
    const chunkSize = 5000;
    for (let i = 0; i < allUsers.length; i += chunkSize) {
      const chunk = allUsers.slice(i, i + chunkSize);
      const args: (string | number)[] = ['NX'];
      for (const id of chunk) {
        args.push(0, id);
      }
      await client.zadd(nextLeaderboardKey, ...args);
    }
  }

  console.log(`[CronService] ✅ Step 7: Week advanced to ${nextWeek}. Added ${allUsers.length} users with 0 score. New keys: ${nextLeaderboardKey}, ${nextPrizePoolKey}`);

  console.log(`[CronService] 🎉 Weekly reset complete — week ${week} → ${nextWeek}`);
}

/**
 * Schedules the weekly cron job to run every Monday at 00:00 UTC.
 * Cron expression: `0 0 * * 1`
 *
 * Should be called once during application bootstrap.
 */
export function scheduleCronJob(): void {
  cron.schedule(
    '0 0 * * 1',
    async () => {
      console.log('[CronService] ⏰ Cron triggered — running weekly reset...');
      try {
        await runWeeklyReset();
      } catch (err) {
        console.error('[CronService] ❌ Weekly reset failed:', (err as Error).message);
      }
    },
    { timezone: 'UTC' },
  );

  console.log('[CronService] ✅ Weekly cron job scheduled (every Monday 00:00 UTC).');
}
