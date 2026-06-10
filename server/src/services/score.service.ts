import { getRedis } from '../config/redis';

const FLUSH_INTERVAL_MS = 5_000;

function leaderboardKey() { return `leaderboard:week_${process.env.CURRENT_WEEK ?? '1'}`; }
function prizePoolKey() { return `prize_pool:week_${process.env.CURRENT_WEEK ?? '1'}`; }


/**
 * In-memory score buffer.
 * Accumulates score deltas per userId between flush cycles.
 */
const buffer = new Map<string, number>();
let prizePoolBuffer = 0;

/**
 * Adds a score delta to the in-memory buffer for the given user.
 * Also buffers the prize pool increment.
 *
 * @param userId - The authenticated user's ID (from JWT).
 * @param amount - The score delta to add.
 */
export function addToBuffer(userId: string, amount: number): void {
  const current = buffer.get(userId) ?? 0;
  buffer.set(userId, current + amount);
  prizePoolBuffer += amount * 0.02;
}

/**
 * Returns the current number of unique users in the score buffer.
 */
export function getBufferSize(): number {
  return buffer.size;
}

/**
 * Flushes the in-memory buffer to Redis using a pipeline.
 * Uses ZINCRBY so concurrent score updates are additive, not overwritten.
 * Clears the buffer after a successful flush.
 * Does nothing if the buffer is empty.
 */
export async function flushBuffer(): Promise<void> {
  if (buffer.size === 0) return;

  // Snapshot and clear the buffer atomically before awaiting Redis
  const snapshot = new Map(buffer);
  buffer.clear();

  const poolDelta = prizePoolBuffer;
  prizePoolBuffer = 0;

  try {
    const redis = getRedis();
    const entries = Array.from(snapshot.entries());
    const chunkSize = 5000;

    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      const pipeline = redis.pipeline();

      for (const [userId, delta] of chunk) {
        pipeline.zincrby(leaderboardKey(), delta, userId);
      }

      const results = await pipeline.exec();

      // Check if any command in the pipeline failed
      if (results) {
        const firstError = results.find(([err]) => err !== null)?.[0];
        if (firstError) {
          throw firstError;
        }
      }
    }

    if (poolDelta > 0) {
      await redis.incrbyfloat(prizePoolKey(), poolDelta);
    }

    console.log(`[ScoreService] ✅ Flushed ${snapshot.size} record(s) and added ${poolDelta.toFixed(2)} to prize pool.`);
  } catch (err) {
    // On failure, merge the snapshot back into the buffer to avoid data loss
    for (const [userId, delta] of snapshot) {
      const existing = buffer.get(userId) ?? 0;
      buffer.set(userId, existing + delta);
    }
    prizePoolBuffer += poolDelta;
    console.error('[ScoreService] ❌ Flush failed, buffer restored:', (err as Error).message);
  }
}

/**
 * Starts the 5-second interval that periodically flushes the score buffer to Redis.
 * Should be called once during application bootstrap.
 */
export function startFlushInterval(): void {
  setInterval(() => {
    flushBuffer().catch((err: Error) => {
      console.error('[ScoreService] ❌ Unexpected flush error:', err.message);
    });
  }, FLUSH_INTERVAL_MS);

  console.log(`[ScoreService] ⏱  Score buffer flush interval started (every ${FLUSH_INTERVAL_MS / 1000}s).`);
}
