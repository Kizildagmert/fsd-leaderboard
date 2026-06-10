const BASE_URL = import.meta.env.VITE_API_URL as string;

/** Retrieves the stored JWT from localStorage. */
function getToken(): string | null {
  return localStorage.getItem('token');
}

/** Builds default headers, injecting the Bearer token when available. */
function headers(includeAuth = true): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  rewardAmount?: number;
}

export interface CurrentUserContext {
  rank: number;
  score: number;
  neighbors: LeaderboardEntry[] | null;
  rewardAmount?: number;
}

export interface LeaderboardResponse {
  week: number;
  prizePool: number;
  topHundred: LeaderboardEntry[];
  currentUser: CurrentUserContext | null;
}

export interface LeaderboardResult extends LeaderboardResponse {
  loadTimeMs: number;
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Authenticates with email/password, stores the JWT in localStorage.
 * @returns The signed JWT string.
 */
export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: headers(false),
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<{ token: string }>(res);
  localStorage.setItem('token', data.token);
  return data.token;
}

/** Clears the stored JWT (logout). */
export function logout(): void {
  localStorage.removeItem('token');
}

export async function getLeaderboard(): Promise<LeaderboardResult> {
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}/api/leaderboard`, {
    headers: headers(),
    cache: 'no-store'
  });
  const data = await handleResponse<LeaderboardResponse>(res);
  const loadTimeMs = Date.now() - t0;
  console.log('[Leaderboard] currentUser:', data.currentUser);
  return { ...data, loadTimeMs };
}

/**
 * Fetches the leaderboard history (top 100) for the previous week.
 */
export async function getPreviousLeaderboard(): Promise<{ week: number, prizePool: number, topHundred: LeaderboardEntry[], currentUser: CurrentUserContext | null }> {
  const res = await fetch(`${BASE_URL}/api/leaderboard/history`, {
    headers: headers(),
    cache: 'no-store'
  });
  return await handleResponse<{ week: number, prizePool: number, topHundred: LeaderboardEntry[], currentUser: CurrentUserContext | null }>(res);
}

/**
 * Adds a score delta to the in-memory buffer.
 * @param amount - Positive number to add to the authenticated user's score.
 */
export async function addScore(amount: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/score`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ amount }),
  });
  await handleResponse<unknown>(res);
}

/**
 * Flushes the server's score buffer synchronously.
 */
export async function flushServerBuffer(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/flush`, {
    method: 'POST',
    headers: headers(false),
  });
  await handleResponse<unknown>(res);
}

/**
 * Triggers the weekly cron reset manually (development only).
 */
export async function triggerReset(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/trigger-cron`, {
    method: 'POST',
    headers: headers(false),
  });
  await handleResponse<unknown>(res);
}

/**
 * Triggers one round of simulation: 200 random users get random score deltas.
 */
export async function simulateScores(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/simulate`, {
    method: 'POST',
    headers: headers(false),
  });
  await handleResponse<unknown>(res);
}

/**
 * Hard resets the entire application (wipes DBs, sets week to 1)
 */
export async function hardReset(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/hard-reset`, {
    method: 'POST',
    headers: headers(false),
  });
  await handleResponse<unknown>(res);
}

/**
 * Gets live system metrics.
 */
export async function getLiveMetrics(): Promise<{ bufferQueue: number, redisLatency: string, apiThroughput: number }> {
  const res = await fetch(`${BASE_URL}/api/admin/metrics`, {
    method: 'GET',
    headers: headers(false),
  });
  return await handleResponse<{ bufferQueue: number, redisLatency: string, apiThroughput: number }>(res);
}
