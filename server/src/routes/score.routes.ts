import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { addToBuffer } from '../services/score.service';

const router = Router();

/**
 * Rate limiter for the score endpoint.
 * Prevents buffer bypass and Redis abuse: max 60 requests per minute per IP.
 */
const scoreLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.', code: 'RATE_LIMIT_EXCEEDED' },
});

/**
 * POST /api/score
 *
 * Accepts a score delta from an authenticated user and adds it to the
 * in-memory buffer. The buffer is flushed to Redis every 5 seconds.
 * Also immediately increments the prize pool by 2% of the amount.
 *
 * Requires: Authorization: Bearer <token>
 * Body:     { amount: number }
 * 200: { success: true, buffered: true }
 * 400: missing or invalid amount
 * 429: rate limit exceeded
 */
router.post('/', scoreLimiter, authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount } = req.body as { amount?: unknown };
    const { userId } = req.user!;

    if (amount === undefined || amount === null) {
      res.status(400).json({ error: '`amount` is required.', code: 'VALIDATION_MISSING_FIELDS' });
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({
        error: '`amount` must be a positive number.',
        code: 'VALIDATION_INVALID_AMOUNT',
      });
      return;
    }

    addToBuffer(userId, numericAmount);

    res.status(200).json({ success: true, buffered: true });
  } catch (err) {
    console.error('[ScoreRoute] ❌ Unexpected error:', (err as Error).message);
    res.status(500).json({ error: 'An unexpected error occurred.', code: 'SERVER_ERROR' });
  }
});

export default router;
