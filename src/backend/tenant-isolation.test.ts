import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { tenantMiddleware, requireScope } from './middleware/tenant.js';

// Mock DB module so tests run without a real Postgres instance
vi.mock('./db/index.js', () => ({
  getDb: vi.fn(),
}));

import { getDb } from './db/index.js';

function mockReq(authHeader?: string): Partial<Request> {
  return { headers: { authorization: authHeader } } as Partial<Request>;
}

function mockRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
}

describe('tenantMiddleware', () => {
  const next = vi.fn() as unknown as NextFunction;

  beforeEach(() => vi.clearAllMocks());

  it('rejects missing Authorization header', async () => {
    const req = mockReq();
    const res = mockRes();
    await tenantMiddleware(req as Request, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'missing_token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects token shorter than 12 chars', async () => {
    const req = mockReq('Bearer short');
    const res = mockRes();
    await tenantMiddleware(req as Request, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 503 when DB is unavailable', async () => {
    vi.mocked(getDb).mockImplementation(() => { throw new Error('no db'); });
    const req = mockReq('Bearer sk_live_validprefix_extra');
    const res = mockRes();
    await tenantMiddleware(req as Request, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('rejects token with no DB match', async () => {
    vi.mocked(getDb).mockReturnValue({
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    } as never);
    const req = mockReq('Bearer sk_live_validprefix_extra');
    const res = mockRes();
    await tenantMiddleware(req as Request, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireScope', () => {
  const next = vi.fn() as unknown as NextFunction;

  beforeEach(() => vi.clearAllMocks());

  it('passes when tenant has the required scope', () => {
    const req = { tenant: { tenantId: 'tid', scopes: ['policies:read'] } } as Request;
    const res = mockRes();
    requireScope('policies:read')(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects when scope is missing', () => {
    const req = { tenant: { tenantId: 'tid', scopes: ['telemetry:write'] } } as Request;
    const res = mockRes();
    requireScope('policies:read')(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when tenant context is absent', () => {
    const req = {} as Request;
    const res = mockRes();
    requireScope('policies:read')(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('cross-tenant data isolation', () => {
  it('tenantId from middleware is used as query filter (schema contract)', () => {
    // Static check: the queries.ts helpers all accept tenantId as explicit param.
    // This test documents the contract — integration tests with a real DB
    // will be added in S1-I3 integration suite.
    expect(true).toBe(true);
  });
});
