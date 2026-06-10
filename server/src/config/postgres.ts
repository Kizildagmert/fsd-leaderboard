import { Pool } from 'pg';

let _pool: Pool | null = null;

/**
 * Returns the singleton PostgreSQL Pool instance.
 * Pool is created lazily so that dotenv has already loaded DATABASE_URL
 * before the Pool reads it from process.env.
 */
export function getPgPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return _pool;
}

/**
 * Initializes the PostgreSQL connection pool by running a test query.
 * Logs success or failure to the console.
 */
export async function connectPostgres(): Promise<void> {
  const pool = getPgPool();
  try {
    const client = await pool.connect();
    client.release();
    console.log('[PostgreSQL] ✅ Connection established successfully.');
  } catch (err) {
    console.error('[PostgreSQL] ❌ Connection failed:', err);
    throw err;
  }
}
