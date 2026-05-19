import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { createRateLimiter, resetRateLimitBuckets } from './rate-limit.js';

function mockRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: null as unknown,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('createRateLimiter', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it('autorise jusqu’à la limite puis renvoie 429', () => {
    const limiter = createRateLimiter(2);
    const req = { path: '/telemetry', tenantId: 'acme' } as Request & { tenantId: string };
    const next = vi.fn() as unknown as NextFunction;

    limiter(req, mockRes(), next);
    limiter(req, mockRes(), next);
    expect(vi.mocked(next)).toHaveBeenCalledTimes(2);

    const blocked = mockRes();
    limiter(req, blocked, next);
    expect(blocked.statusCode).toBe(429);
    expect(vi.mocked(next)).toHaveBeenCalledTimes(2);
  });
});
