import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPgPool } from '../config/postgres';

/** Shape of a user row returned from PostgreSQL. */
interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
}

/** Minimal user shape used for username enrichment in leaderboard responses. */
export interface UserRecord {
  id: string;
  username: string;
}

/**
 * Validates user credentials against PostgreSQL and returns a signed JWT on success.
 *
 * @param email    - The user's email address.
 * @param password - The plaintext password to verify against the stored hash.
 * @returns A signed JWT string containing `userId` and `username`.
 * @throws {Error} with message 'USER_NOT_FOUND' if no account matches the email.
 * @throws {Error} with message 'INVALID_PASSWORD' if the password does not match.
 */
export async function login(email: string, password: string): Promise<string> {
  const pool = getPgPool();

  const { rows } = await pool.query<UserRow>(
    'SELECT id, username, email, password_hash FROM users WHERE email = $1 LIMIT 1',
    [email],
  );

  if (rows.length === 0) {
    throw new Error('USER_NOT_FOUND');
  }

  const user = rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    throw new Error('INVALID_PASSWORD');
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '24h' } as jwt.SignOptions,
  );

  return token;
}

import { getRedis } from '../config/redis';

/**
 * Fetches multiple users by their IDs, using Redis as a cache.
 * 
 * Flow:
 * 1. MGET to fetch all usernames from Redis in one go.
 * 2. If missing (Cache Miss), fetch from PostgreSQL.
 * 3. Store the missing ones in Redis with SETEX (1 hour TTL).
 *
 * @param ids - Array of user UUIDs to look up.
 * @returns Array of `{ id, username }` records (order is not guaranteed).
 */
export async function getUsersByIds(ids: string[]): Promise<UserRecord[]> {
  if (ids.length === 0) return [];

  const redis = getRedis();
  const cacheKeys = ids.map(id => `user:${id}`);

  // 1. Fetch from Redis
  const cachedUsernames = await redis.mget(...cacheKeys);

  const result: UserRecord[] = [];
  const missingIds: string[] = [];

  // 2. Separate hits and misses
  for (let i = 0; i < ids.length; i++) {
    if (cachedUsernames[i]) {
      result.push({ id: ids[i], username: cachedUsernames[i]! });
    } else {
      missingIds.push(ids[i]);
    }
  }

  if (missingIds.length === 0) {
    // console.log(`[Cache Hit] Fetched ${result.length} usernames from Redis.`);
    return result;
  }

  // 3. Fetch missing from DB
  const pool = getPgPool();
  const { rows } = await pool.query<UserRecord>(
    'SELECT id, username FROM users WHERE id = ANY($1)',
    [missingIds],
  );

  // 4. Cache newly fetched users
  if (rows.length > 0) {
    const pipeline = redis.pipeline();
    for (const row of rows) {
      pipeline.setex(`user:${row.id}`, 3600, row.username);
      result.push(row);
    }
    await pipeline.exec();
  }

  // console.log(`[Cache Status] Hits: ${result.length - rows.length}, Misses (Fetched from DB): ${rows.length}`);
  return result;
}

/**
 * Fetches all user IDs from PostgreSQL.
 * Used during weekly reset to populate the new leaderboard with 0 scores.
 */
export async function getAllUserIds(): Promise<string[]> {
  const pool = getPgPool();
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM users');
  return rows.map(r => r.id);
}
