import { Request, Response, NextFunction } from 'express';

export let lastRps = 0;
let requestCount = 0;

setInterval(() => {
  lastRps = requestCount;
  requestCount = 0;
}, 1000);

export function rpsMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  requestCount++;
  next();
}
