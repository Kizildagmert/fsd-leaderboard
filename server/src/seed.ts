import 'dotenv/config';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getPgPool } from './config/postgres';
import { getRedis } from './config/redis';

const WEEK = process.env.CURRENT_WEEK ?? '1';
const LEADERBOARD_KEY = `leaderboard:week_${WEEK}`;
const PRIZE_POOL_KEY = `prize_pool:week_${WEEK}`;

const TOTAL_USERS = 100_000;
const BATCH_SIZE = 1_000;
const BCRYPT_ROUNDS = 10;

const DEMO_EMAIL = 'demo@panteon.games';
const DEMO_PASSWORD = 'demo123';
const DEMO_USERNAME = 'DemoPlayer';
const DEMO_SCORE = 150_000;

/**
 * Creates the `users` table in PostgreSQL if it does not already exist.
 */
async function createUsersTable(): Promise<void> {
  const pool = getPgPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY,
      username      VARCHAR(255) NOT NULL,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at    TIMESTAMP   NOT NULL DEFAULT NOW()
    )
  `);
  console.log('[Seed] ✅ users table ready.');
}

/**
 * Generates a random integer between min and max (inclusive).
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Inserts `TOTAL_USERS` dummy users into PostgreSQL in batches of `BATCH_SIZE`.
 * Returns an array of { id, score } objects for Redis ingestion.
 */
async function seedPostgres(): Promise<Array<{ id: string; score: number }>> {
  const pool = getPgPool();
  const redisEntries: Array<{ id: string; score: number }> = [];

  // Pre-generate all UUIDs and scores to avoid async overhead inside the loop
  const users = Array.from({ length: TOTAL_USERS }, (_, i) => ({
    id: uuidv4(),
    username: `player_${i + 1}`,
    email: `player_${i + 1}@seed.local`,
    password_hash: 'seeded_hash', // dummy hash — login not intended for seed users
    score: randomInt(100, 1_000_000),
  }));

  console.log(`[Seed] Inserting ${TOTAL_USERS.toLocaleString()} users in batches of ${BATCH_SIZE}...`);

  for (let batchStart = 0; batchStart < TOTAL_USERS; batchStart += BATCH_SIZE) {
    const batch = users.slice(batchStart, batchStart + BATCH_SIZE);

    // Build a single multi-row INSERT for the batch
    const values: unknown[] = [];
    const placeholders = batch.map((u, i) => {
      const base = i * 4;
      values.push(u.id, u.username, u.email, u.password_hash);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    });

    await pool.query(
      `INSERT INTO users (id, username, email, password_hash)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (email) DO NOTHING`,
      values,
    );

    redisEntries.push(...batch.map((u) => ({ id: u.id, score: u.score })));

    const done = Math.min(batchStart + BATCH_SIZE, TOTAL_USERS);
    process.stdout.write(`\r[Seed] PostgreSQL: ${done.toLocaleString()} / ${TOTAL_USERS.toLocaleString()}`);
  }

  process.stdout.write('\n');
  return redisEntries;
}

/**
 * Reads existing user IDs from PostgreSQL and assigns fresh random scores.
 * Used when re-seeding for a new week so Redis always contains IDs
 * that exist in PG — prevents the UUID mismatch problem.
 */
async function loadExistingUsersForRedis(): Promise<Array<{ id: string; score: number }>> {
  const pool = getPgPool();
  console.log('[Seed] Loading existing users from PostgreSQL for Redis seed...');

  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE email != $1 LIMIT $2`,
    [DEMO_EMAIL, TOTAL_USERS],
  );

  console.log(`[Seed] ✅ Found ${rows.length.toLocaleString()} existing users.`);
  return rows.map((r) => ({ id: r.id, score: randomInt(100, 1_000_000) }));
}

/**
 * Writes all user scores to the Redis sorted set using a pipeline.
 * Processes entries in chunks to avoid a single oversized pipeline.
 */
async function seedRedis(entries: Array<{ id: string; score: number }>): Promise<void> {
  const client = getRedis();
  const CHUNK = 5_000;

  console.log(`[Seed] Writing ${entries.length.toLocaleString()} scores to Redis pipeline...`);

  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);
    const pipeline = client.pipeline();
    for (const { id, score } of chunk) {
      pipeline.zadd(LEADERBOARD_KEY, score, id);
    }
    await pipeline.exec();

    const done = Math.min(i + CHUNK, entries.length);
    process.stdout.write(`\r[Seed] Redis ZSET: ${done.toLocaleString()} / ${entries.length.toLocaleString()}`);
  }

  process.stdout.write('\n');
}

/**
 * Creates the demo user in PostgreSQL (upsert by email) and adds them to Redis
 * with a score of 1500 so the "neighbors" feature can be tested.
 */
async function seedDemoUser(): Promise<void> {
  const pool = getPgPool();
  const client = getRedis();

  const demoId = uuidv4();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  await pool.query(
    `INSERT INTO users (id, username, email, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET username      = EXCLUDED.username,
           password_hash = EXCLUDED.password_hash`,
    [demoId, DEMO_USERNAME, DEMO_EMAIL, passwordHash],
  );

  // Resolve the actual id in case the user already existed
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]);
  const actualId = rows[0].id;

  await client.zadd(LEADERBOARD_KEY, DEMO_SCORE, actualId);

  console.log(`[Seed] ✅ Demo user ready — email: ${DEMO_EMAIL} | score: ${DEMO_SCORE} | id: ${actualId}`);
}

/**
 * Sets the prize pool for the current week to a realistic starting value.
 */
async function seedPrizePool(): Promise<void> {
  const client = getRedis();
  await client.set(PRIZE_POOL_KEY, '8000');
  console.log(`[Seed] ✅ Prize pool set — ${PRIZE_POOL_KEY} = 500000`);
}

/**
 * Main seed runner. Orchestrates table creation, bulk inserts,
 * Redis population, and demo user setup.
 */
async function main(): Promise<void> {
  const start = Date.now();
  const week = parseInt(process.env.CURRENT_WEEK ?? '1', 10);

  console.log(`[Seed] 🚀 Starting seed script for week ${week}...\n`);

  await createUsersTable();

  let redisEntries: Array<{ id: string; score: number }>;

  if (week === 1) {
    // First run: create PG users AND seed Redis
    redisEntries = await seedPostgres();
  } else {
    // Subsequent weeks: PG users already exist — load their real IDs for Redis
    console.log(`[Seed] Week ${week}: skipping PG inserts, loading existing users for Redis...`);
    redisEntries = await loadExistingUsersForRedis();
  }

  await seedRedis(redisEntries);
  await seedDemoUser();
  await seedPrizePool();

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n[Seed] 🎉 Done! ${redisEntries.length.toLocaleString()} entries written to Redis in ${elapsed}s.`);

  // Close connections cleanly
  await getPgPool().end();
  getRedis().disconnect();

  process.exit(0);
}

main().catch((err: Error) => {
  console.error('[Seed] ❌ Fatal error:', err.message);
  process.exit(1);
});
