import { Router, Request, Response } from 'express';
import { login } from '../services/auth.service';

const router = Router();

/**
 * POST /api/auth/login
 *
 * Authenticates a user with email and password.
 * Returns a signed JWT on success.
 *
 * Body: { email: string, password: string }
 * 200: { token: string }
 * 400: missing required fields
 * 401: invalid credentials
 * 500: unexpected server error
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required.', code: 'VALIDATION_MISSING_FIELDS' });
    return;
  }

  try {
    const token = await login(email, password);
    res.status(200).json({ token });
  } catch (err) {
    const message = (err as Error).message;

    if (message === 'USER_NOT_FOUND' || message === 'INVALID_PASSWORD') {
      res.status(401).json({ error: 'Invalid email or password.', code: 'AUTH_INVALID_CREDENTIALS' });
      return;
    }

    console.error('[AuthRoute] ❌ Unexpected error during login:', message);
    res.status(500).json({ error: 'An unexpected error occurred.', code: 'SERVER_ERROR' });
  }
});

export default router;
