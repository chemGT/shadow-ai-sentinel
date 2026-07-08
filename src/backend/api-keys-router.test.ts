import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { GRACE_PERIOD_DAYS, VALID_SCOPES } from './api-keys-router.js';

// Mock DB and auth middleware so tests run without Postgres
vi.mock('./db/index.js', () => ({ getDb: vi.fn() }));
vi.mock('./middleware/tenant.js', () => ({
  tenantMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    _req.tenant = { tenantId: 'tenant-a', scopes: ['admin:*'], source: 'api_key' };
    next();
  },
  requireScope: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));
vi.mock('./db/queries.js', () => ({ appendAuditEntry: vi.fn().mockResolvedValue(undefined) }));

import { appendAuditEntry } from './db/queries.js';

import { getDb } from './db/index.js';
import { apiKeysRouter } from './api-keys-router.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api-keys', apiKeysRouter);
  return app;
}

describe('POST /api-keys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a key with default scopes', async () => {
    vi.mocked(getDb).mockReturnValue({
      insert: () => ({
        values: () => ({
          returning: vi.fn().mockResolvedValue([{ id: 'key-1', createdAt: new Date() }]),
        }),
      }),
    } as never);

    const res = await request(makeApp()).post('/api-keys').send({});
    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(/^sk_live_[0-9a-f]{48}$/);
    expect(res.body.prefix).toMatch(/^sk_live_[0-9a-f]{8}$/);
    expect(res.body.scopes).toContain('policies:read');
    expect(appendAuditEntry).toHaveBeenCalledWith(
      expect.anything(),
      'tenant-a',
      expect.any(String),
      'api_key.created',
      expect.objectContaining({ keyId: expect.any(String) }),
    );
  });

  it('rejects invalid scopes', async () => {
    const res = await request(makeApp()).post('/api-keys').send({ scopes: ['not:valid'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_scopes');
  });

  it('accepts all valid scopes', async () => {
    vi.mocked(getDb).mockReturnValue({
      insert: () => ({
        values: () => ({
          returning: vi.fn().mockResolvedValue([{ id: 'key-2', createdAt: new Date() }]),
        }),
      }),
    } as never);

    const res = await request(makeApp())
      .post('/api-keys')
      .send({ scopes: [...VALID_SCOPES] });
    expect(res.status).toBe(201);
  });
});

describe('DELETE /api-keys/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('revokes an existing key', async () => {
    vi.mocked(getDb).mockReturnValue({
      update: () => ({
        set: () => ({ where: () => ({ returning: vi.fn().mockResolvedValue([{ id: 'key-1' }]) }) }),
      }),
    } as never);

    const res = await request(makeApp()).delete('/api-keys/key-1');
    expect(res.status).toBe(204);
    expect(appendAuditEntry).toHaveBeenCalledWith(
      expect.anything(),
      'tenant-a',
      expect.any(String),
      'api_key.revoked',
      expect.objectContaining({ keyId: 'key-1' }),
    );
  });

  it('returns 404 for unknown or already revoked key', async () => {
    vi.mocked(getDb).mockReturnValue({
      update: () => ({
        set: () => ({ where: () => ({ returning: vi.fn().mockResolvedValue([]) }) }),
      }),
    } as never);

    const res = await request(makeApp()).delete('/api-keys/unknown');
    expect(res.status).toBe(404);
  });
});

describe('POST /api-keys/:id/rotate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates new key and sets grace period on old key', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: vi.fn().mockResolvedValue([{
            id: 'key-old',
            tenantId: 'tenant-a',
            scopes: ['policies:read'],
            revokedAt: null,
          }]),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: vi.fn().mockResolvedValue([{ id: 'key-new', createdAt: new Date() }]),
        }),
      }),
      update: () => ({
        set: () => ({ where: vi.fn().mockResolvedValue([]) }),
      }),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    const res = await request(makeApp()).post('/api-keys/key-old/rotate');
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('key-new');
    expect(res.body.key).toMatch(/^sk_live_/);
    expect(res.body.oldKeyExpiresAt).toBeDefined();
    expect(appendAuditEntry).toHaveBeenCalledWith(
      expect.anything(),
      'tenant-a',
      expect.any(String),
      'api_key.rotated',
      expect.objectContaining({ oldKeyId: 'key-old', newKeyId: 'key-new' }),
    );

    const grace = new Date(res.body.oldKeyExpiresAt);
    const diff = grace.getTime() - Date.now();
    // Grace period should be ~7 days (within 1 min tolerance)
    expect(diff).toBeGreaterThan((GRACE_PERIOD_DAYS - 1) * 86_400_000);
    expect(diff).toBeLessThan((GRACE_PERIOD_DAYS + 1) * 86_400_000);
  });

  it('returns 404 when key does not belong to tenant', async () => {
    vi.mocked(getDb).mockReturnValue({
      select: () => ({ from: () => ({ where: vi.fn().mockResolvedValue([]) }) }),
    } as never);

    const res = await request(makeApp()).post('/api-keys/unknown/rotate');
    expect(res.status).toBe(404);
  });
});
