import 'express';

/**
 * Extends the Express Request interface to include the authenticated user
 * payload attached by the `authenticate` middleware.
 */
declare module 'express' {
  interface Request {
    user?: {
      userId: string;
      username: string;
    };
  }
}
