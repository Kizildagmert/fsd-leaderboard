import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  getTopHundred,
  getUserRank,
  getUserScore,
  getNeighbors,
  getPrizePool,
  ensureUserInLeaderboard,
} from '../services/leaderboard.service';
import { getUsersByIds } from '../services/auth.service';
import { WeeklyReward } from '../models/weeklyReward.model';
import type { LeaderboardEntry, LeaderboardResponse } from '../types';

const router = Router();

/**
 * GET /api/leaderboard
 *
 * Returns the top 100 players for the current week, the current prize pool,
 * and the authenticated user's context (rank, score, neighbors).
 * If the user is already in the top 100, `currentUser.neighbors` is null.
 *
 * Requires: Authorization: Bearer <token>
 * 200: LeaderboardResponse
 * 500: unexpected server error
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.user!;
    const week = parseInt(process.env.CURRENT_WEEK ?? '1', 10);

    // ── 1. Fetch top 100 from Redis ──────────────────────────────────────────
    const topHundredRaw = await getTopHundred();

    // ── 2. Enrich top 100 with usernames from PostgreSQL ────────────────────
    const topIds = topHundredRaw.map((e) => e.userId);
    const topUsers = await getUsersByIds(topIds);
    const usernameMap = new Map(topUsers.map((u) => [u.id, u.username]));

    const topHundred: LeaderboardEntry[] = topHundredRaw.map((e) => ({
      ...e,
      username: usernameMap.get(e.userId) ?? e.userId,
    }));

    // ── 3. Determine if current user is in top 100 ──────────────────────────
    const isInTopHundred = topIds.includes(userId);

    // ── 4. Fetch prize pool ──────────────────────────────────────────────────
    const prizePool = await getPrizePool();

    // ── 5. Build currentUser context ─────────────────────────────────────────
    let currentUser: LeaderboardResponse['currentUser'] = null;

    let rank = await getUserRank(userId);
    let score = await getUserScore(userId);

    // If user is not in leaderboard, register them with 0 score and re-fetch
    if (rank === null || score === null) {
      await ensureUserInLeaderboard(userId);
      rank = await getUserRank(userId);
      score = await getUserScore(userId);

      // Since they were just added, they might now be in top 100 if the list is short
      // We should technically re-fetch top 100, but for now we just append them to the bottom
    }

    console.log(`[LeaderboardRoute DEBUG] userId=${userId}, rank=${rank}, score=${score}, week=${week}`);

    if (rank !== null && score !== null) {
      if (isInTopHundred && rank <= 100) {
        // User is in top 100 — no neighbors needed
        currentUser = { rank, score, neighbors: null };
      } else {
        // User is outside top 100 — fetch surrounding players
        const neighborsRaw = await getNeighbors(userId);

        // Enrich neighbor list with usernames
        const neighborIds = neighborsRaw.map((e) => e.userId);
        const neighborUsers = await getUsersByIds(neighborIds);
        const neighborUsernameMap = new Map(neighborUsers.map((u) => [u.id, u.username]));

        const neighbors: LeaderboardEntry[] = neighborsRaw.map((e) => ({
          ...e,
          username: neighborUsernameMap.get(e.userId) ?? e.userId,
        }));

        currentUser = { rank, score, neighbors };
      }
    }

    // ── 6. Build and send response ───────────────────────────────────────────
    const response: LeaderboardResponse & { debug?: any } = { week, prizePool, topHundred, currentUser };
    response.debug = { userId, rank, score, week };
    res.status(200).json(response);
  } catch (err) {
    console.error('[LeaderboardRoute] ❌ Unexpected error:', (err as Error).message);
    res.status(500).json({ error: 'An unexpected error occurred.', code: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/leaderboard/history
 *
 * Returns the top 100 players from the previous week stored in MongoDB.
 * Requires: Authorization: Bearer <token>
 */
router.get('/history', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const currentWeek = parseInt(process.env.CURRENT_WEEK ?? '1', 10);
    const prevWeek = currentWeek - 1;

    if (prevWeek <= 0) {
      res.status(200).json({ week: prevWeek, topHundred: [] });
      return;
    }

    // Fetch from MongoDB
    const records = await WeeklyReward.find({ week: prevWeek })
      .sort({ rank: 1 })
      .limit(100)
      .lean();

    if (records.length === 0) {
      res.status(200).json({ week: prevWeek, topHundred: [] });
      return;
    }

    // Enrich with usernames
    const userIds = records.map(r => r.userId);
    const users = await getUsersByIds(userIds);
    const usernameMap = new Map(users.map(u => [u.id, u.username]));

    const topHundred: LeaderboardEntry[] = records.map(r => ({
      rank: r.rank,
      userId: r.userId,
      username: usernameMap.get(r.userId) ?? r.userId,
      score: r.score ?? 0,
      rewardAmount: r.rewardAmount,
    }));

    // Fetch current user's record
    const currentUserRecord = await WeeklyReward.findOne({ week: prevWeek, userId: req.user!.userId }).lean();
    let currentUser: LeaderboardResponse['currentUser'] = null;

    if (currentUserRecord) {
      currentUser = {
        rank: currentUserRecord.rank,
        score: currentUserRecord.score ?? 0,
        neighbors: null, // We don't fetch neighbors for history to keep it simple
        rewardAmount: currentUserRecord.rewardAmount
      };
    }

    // Top 100 players receive 100% of the prize pool, so the sum of their rewards is the exact historical prize pool
    const prizePool = topHundred.reduce((sum, entry) => sum + (entry.rewardAmount ?? 0), 0);

    res.status(200).json({ week: prevWeek, prizePool, topHundred, currentUser });
  } catch (err) {
    console.error('[LeaderboardRoute] ❌ History fetch error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to fetch history.', code: 'SERVER_ERROR' });
  }
});

export default router;
