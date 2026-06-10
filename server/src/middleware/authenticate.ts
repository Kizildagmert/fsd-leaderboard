import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/** Shape of the decoded JWT payload. */
interface JwtPayload {
  userId: string;
  username: string;
}

/**
 * Express middleware that verifies the JWT from the `Authorization: Bearer <token>` header.
 * On success, attaches `{ userId, username }` to `req.user` and calls `next()`.
 * On failure (missing header, invalid token, expired), responds with 401.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header.', code: 'AUTH_MISSING_TOKEN' });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.user = { userId: payload.userId, username: payload.username };
    next();
  } catch (err) {
    const isExpired = err instanceof jwt.TokenExpiredError;
    res.status(401).json({
      error: isExpired ? 'Token has expired.' : 'Invalid token.',
      code: isExpired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
    });
  }
}
