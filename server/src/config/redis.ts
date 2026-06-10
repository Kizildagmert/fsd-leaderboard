import Redis from 'ioredis';

let _redis: Redis | null = null;

/**
 * Returns the singleton ioredis client instance.
 * Created lazily so that dotenv has already loaded REDIS_URL before first use.
 * TLS is enabled for cloud Redis providers (e.g. Upstash).
 * Eager connection — connects immediately upon first instantiation.
 */
export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL as string, {
      tls: {},
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    });

    _redis.on('error', (err: Error) => {
      console.error('[Redis] 🔴 Connection error:', err.message);
    });

    _redis.on('connect', () => {
      console.log('[Redis] 🟢 Connection established successfully (PONG received).');
    });
  }
  return _redis;
}

/** Convenience re-export used by service modules. */
export const redis = { get client(): Redis { return getRedis(); } };

/**
 * Verifies the Redis connection is alive by issuing a PING command.
 * Logs success or failure — does not throw, preventing application crash on Redis outage.
 */
export async function connectRedis(): Promise<void> {
  try {
    const pong = await getRedis().ping();
    if (pong === 'PONG') {
      console.log('[Redis] ✅ Connection established successfully (PONG received).');
    } else {
      console.warn('[Redis] ⚠️  Unexpected PING response:', pong);
    }
  } catch (err) {
    console.error('[Redis] ❌ Failed to connect:', (err as Error).message);
    // Intentionally not re-throwing — app should remain functional without Redis on startup.
  }
}
