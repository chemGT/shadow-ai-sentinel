import type { NextFunction, Request, Response } from 'express';

type WindowState = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, WindowState>();

export function createRateLimiter(maxPerWindow: number, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = (req as Request & { tenantId?: string }).tenantId ?? 'anonymous';
    const key = `${tenantId}:${req.path}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    res.setHeader('X-RateLimit-Limit', String(maxPerWindow));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxPerWindow - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxPerWindow) {
      res.status(429).json({ error: 'Trop de requêtes — réessayez plus tard' });
      return;
    }

    next();
  };
}

/** Tests uniquement */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}
