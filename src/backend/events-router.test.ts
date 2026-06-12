import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { CACHE_TTL_MS, clearCache } from './events-router.js';

vi.mock('./db/index.js', () => ({ getDb: vi.fn() }));
vi.mock('./middleware/tenant.js', () => ({
  tenantMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    _req.tenant = { tenantId: 'tenant-a', scopes: ['telemetry:read'] };
    next();
  },
  requireScope: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));
vi.mock('./db/queries.js', () => ({
  getTelemetryAggregate: vi.fn(),
  getTelemetryCount: vi.fn(),
}));

import { getDb } from './db/index.js';
import { getTelemetryAggregate, getTelemetryCount } from './db/queries.js';
import { eventsRouter } from './events-router.js';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/events', eventsRouter);
  return app;
}

describe('GET /events/aggregate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
    vi.mocked(getDb).mockReturnValue({} as never);
    vi.mocked(getTelemetryCount).mockResolvedValue(42);
    vi.mocked(getTelemetryAggregate).mockResolvedValue([
      { key: 'iban', count: 30 },
      { key: 'api_key', count: 12 },
    ]);
  });

  it('retourne 200 avec breakdown par ruleType (défaut)', async () => {
    const res = await request(makeApp()).get('/events/aggregate');
    expect(res.status).toBe(200);
    expect(res.body.days).toBe(30);
    expect(res.body.groupBy).toBe('ruleType');
    expect(res.body.total).toBe(42);
    expect(res.body.breakdown).toEqual([{ key: 'iban', count: 30 }, { key: 'api_key', count: 12 }]);
    expect(res.headers['x-cache']).toBe('MISS');
  });

  it('retourne 200 avec groupBy=action', async () => {
    const res = await request(makeApp()).get('/events/aggregate?groupBy=action');
    expect(res.status).toBe(200);
    expect(res.body.groupBy).toBe('action');
    expect(res.headers['x-cache']).toBe('MISS');
  });

  it('retourne 200 avec groupBy=all — 3 sous-listes', async () => {
    const res = await request(makeApp()).get('/events/aggregate?groupBy=all');
    expect(res.status).toBe(200);
    expect(res.body.breakdown).toHaveProperty('byRuleType');
    expect(res.body.breakdown).toHaveProperty('byAction');
    expect(res.body.breakdown).toHaveProperty('byHost');
    expect(getTelemetryAggregate).toHaveBeenCalledTimes(3);
  });

  it('clamp days à 90 max', async () => {
    const res = await request(makeApp()).get('/events/aggregate?days=200');
    expect(res.status).toBe(200);
    expect(res.body.days).toBe(90);
  });

  it('days invalide → fallback 30', async () => {
    const res = await request(makeApp()).get('/events/aggregate?days=abc');
    expect(res.status).toBe(200);
    expect(res.body.days).toBe(30);
  });

  it('groupBy invalide → 400', async () => {
    const res = await request(makeApp()).get('/events/aggregate?groupBy=unknown');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_groupBy');
  });

  it('cache — 2ème appel retourne HIT sans rappeler la DB', async () => {
    const app = makeApp();
    await request(app).get('/events/aggregate?days=7');
    const res2 = await request(app).get('/events/aggregate?days=7');
    expect(res2.headers['x-cache']).toBe('HIT');
    expect(getTelemetryAggregate).toHaveBeenCalledTimes(1);
  });

  it('cache — clés différentes (days) → deux MISS', async () => {
    const app = makeApp();
    const r1 = await request(app).get('/events/aggregate?days=7');
    const r2 = await request(app).get('/events/aggregate?days=14');
    expect(r1.headers['x-cache']).toBe('MISS');
    expect(r2.headers['x-cache']).toBe('MISS');
    expect(getTelemetryAggregate).toHaveBeenCalledTimes(2);
  });

  it('CACHE_TTL_MS est 5 minutes', () => {
    expect(CACHE_TTL_MS).toBe(5 * 60 * 1000);
  });

  it('from est antérieur à to de N jours', async () => {
    const res = await request(makeApp()).get('/events/aggregate?days=7');
    const from = new Date(res.body.from).getTime();
    const to = new Date(res.body.to).getTime();
    const diffDays = (to - from) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeCloseTo(7, 0);
  });

  it('DB indisponible → 503', async () => {
    vi.mocked(getDb).mockImplementation(() => { throw new Error('no db'); });
    const res = await request(makeApp()).get('/events/aggregate');
    expect(res.status).toBe(503);
  });
});
