import { getRedis } from '../config/redis';
import type { LeaderboardEntry } from '../types';

/** Returns the active Redis key names based on the current CURRENT_WEEK env var. */
function keys() {
  const week = process.env.CURRENT_WEEK ?? '1';
  return {
    leaderboard: `leaderboard:week_${week}`,
    prizePool:   `prize_pool:week_${week}`,
  };
}

/**
 * Ensures a user is registered in the leaderboard with at least 0 points.
 * Uses ZADD NX to only add if they don't already exist.
 */
export async function ensureUserInLeaderboard(userId: string): Promise<void> {
  try {
    await getRedis().zadd(keys().leaderboard, 'NX', 0, userId);
  } catch (err) {
    console.error('[LeaderboardService] ❌ ensureUserInLeaderboard failed:', (err as Error).message);
  }
}

/**
 * Fetches the top 100 players from the Redis sorted set.
 * Returns entries ordered by score descending (rank 1 = highest score).
 * Username is not available in Redis — caller must enrich with PostgreSQL if needed.
 *
 * @returns Array of LeaderboardEntry objects (username field is empty string here).
 */
export async function getTopHundred(): Promise<LeaderboardEntry[]> {
  try {
    // ZREVRANGE returns [member, score, member, score, ...]
    const raw = await getRedis().zrevrange(keys().leaderboard, 0, 99, 'WITHSCORES');

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({
        rank: entries.length + 1,
        userId: raw[i],
        username: '',           // enriched by the route handler via PostgreSQL lookup
        score: parseFloat(raw[i + 1]),
      });
    }

    return entries;
  } catch (err) {
    console.error('[LeaderboardService] ❌ getTopHundred failed:', (err as Error).message);
    return [];
  }
}

/**
 * Returns the 1-based rank of a user in the leaderboard.
 * Returns null if the user is not present in the sorted set.
 *
 * @param userId - The user's ID.
 */
export async function getUserRank(userId: string): Promise<number | null> {
  try {
    // ZREVRANK returns 0-based rank (null if not found)
    const zeroBasedRank = await getRedis().zrevrank(keys().leaderboard, userId);
    if (zeroBasedRank === null) return null;
    return zeroBasedRank + 1;
  } catch (err) {
    console.error('[LeaderboardService] ❌ getUserRank failed:', (err as Error).message);
    return null;
  }
}

/**
 * Returns the user's current score from the sorted set.
 * Returns null if the user is not present.
 *
 * @param userId - The user's ID.
 */
export async function getUserScore(userId: string): Promise<number | null> {
  try {
    const score = await getRedis().zscore(keys().leaderboard, userId);
    return score !== null ? parseFloat(score) : null;
  } catch (err) {
    console.error('[LeaderboardService] ❌ getUserScore failed:', (err as Error).message);
    return null;
  }
}

/**
 * Fetches up to 6 players surrounding the given user in the leaderboard:
 * 3 players above, the user themselves, and 2 players below (rank-ordered).
 * Returns an empty array if the user is not in the sorted set.
 *
 * @param userId - The user's ID.
 */
export async function getNeighbors(userId: string): Promise<LeaderboardEntry[]> {
  try {
    const zeroBasedRank = await getRedis().zrevrank(keys().leaderboard, userId);
    if (zeroBasedRank === null) return [];

    // Window: 3 above (lower index = higher rank), user, 2 below
    const windowStart = Math.max(0, zeroBasedRank - 3);
    const windowEnd = zeroBasedRank + 2;

    const raw = await getRedis().zrevrange(keys().leaderboard, windowStart, windowEnd, 'WITHSCORES');

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({
        rank: windowStart + entries.length + 1,  // 1-based rank
        userId: raw[i],
        username: '',   // enriched by the route handler via PostgreSQL lookup
        score: parseFloat(raw[i + 1]),
      });
    }

    return entries;
  } catch (err) {
    console.error('[LeaderboardService] ❌ getNeighbors failed:', (err as Error).message);
    return [];
  }
}

/**
 * Returns the current prize pool value for the active week.
 * Returns 0 if the key does not exist or an error occurs.
 */
export async function getPrizePool(): Promise<number> {
  try {
    const value = await getRedis().get(keys().prizePool);
    return value !== null ? parseFloat(value) : 0;
  } catch (err) {
    console.error('[LeaderboardService] ❌ getPrizePool failed:', (err as Error).message);
    return 0;
  }
}

/**
 * Checks if the current leaderboard is empty, and if so, backfills all users with 0 points.
 * Ensures that the system always has the 100k users ready for the frontend.
 */
export async function ensureLeaderboardInitialized(): Promise<void> {
  try {
    const client = getRedis();
    const count = await client.zcard(keys().leaderboard);
    
    // If the leaderboard is completely empty (or almost empty)
    if (count < 10) {
      console.log(`[LeaderboardService] Leaderboard is empty (count=${count}). Initializing with all users...`);
      const { getAllUserIds } = await import('./auth.service');
      const allUsers = await getAllUserIds();
      
      if (allUsers.length > 0) {
        const chunkSize = 5000;
        for (let i = 0; i < allUsers.length; i += chunkSize) {
          const chunk = allUsers.slice(i, i + chunkSize);
          const args: (string | number)[] = ['NX'];
          for (const id of chunk) {
            args.push(0, id);
          }
          await client.zadd(keys().leaderboard, ...args);
        }
        console.log(`[LeaderboardService] ✅ Initialized leaderboard with ${allUsers.length} users.`);
      }
    }
  } catch (err) {
    console.error('[LeaderboardService] ❌ ensureLeaderboardInitialized failed:', (err as Error).message);
  }
}
