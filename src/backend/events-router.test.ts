import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { CACHE_TTL_MS, CSV_HEADER, clearCache } from './events-router.js';

vi.mock('./db/index.js', () => ({ getDb: vi.fn() }));
vi.mock('./middleware/tenant.js', () => ({
  tenantMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    _req.tenant = { tenantId: 'tenant-a', scopes: ['telemetry:read'], source: 'api_key' };
    next();
  },
  requireScope: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));
vi.mock('./db/queries.js', () => ({
  getTelemetryAggregate: vi.fn(),
  getTelemetryCount: vi.fn(),
  getTelemetryEvents: vi.fn(),
}));

import { getDb } from './db/index.js';
import { getTelemetryAggregate, getTelemetryCount, getTelemetryEvents } from './db/queries.js';
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
    vi.mocked(getTelemetryEvents).mockResolvedValue([
      { ts: new Date('2026-06-01T10:00:00Z'), host: 'claude.ai', ruleType: 'iban', action: 'block' },
      { ts: new Date('2026-06-02T11:00:00Z'), host: 'chat.openai.com', ruleType: 'api_key', action: 'redact' },
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

describe('GET /events/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockReturnValue({} as never);
    vi.mocked(getTelemetryEvents).mockResolvedValue([
      { ts: new Date('2026-06-01T10:00:00Z'), host: 'claude.ai', ruleType: 'iban', action: 'block' },
      { ts: new Date('2026-06-02T11:00:00Z'), host: 'chat.openai.com', ruleType: 'api_key', action: 'redact' },
    ]);
  });

  it('retourne 200 avec Content-Type text/csv', async () => {
    const res = await request(makeApp()).get('/events/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('header Content-Disposition avec filename', async () => {
    const res = await request(makeApp()).get('/events/export');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="shadow-ai-events-\d{4}-\d{2}-\d{2}\.csv"/);
  });

  it('CSV commence par la ligne header', async () => {
    const res = await request(makeApp()).get('/events/export');
    expect(res.text.startsWith(CSV_HEADER)).toBe(true);
  });

  it('CSV contient les lignes de données (pas de texte utilisateur)', async () => {
    const res = await request(makeApp()).get('/events/export');
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain('claude.ai');
    expect(lines[1]).toContain('iban');
    expect(lines[1]).toContain('block');
    expect(lines[1]).not.toMatch(/text|content|message/i);
  });

  it('escape virgule dans le host', async () => {
    vi.mocked(getTelemetryEvents).mockResolvedValue([
      { ts: new Date('2026-06-01T10:00:00Z'), host: 'host,with,commas', ruleType: 'iban', action: 'block' },
    ]);
    const res = await request(makeApp()).get('/events/export');
    expect(res.text).toContain('"host,with,commas"');
  });

  it('X-Total-Rows header correspond au nombre de lignes', async () => {
    const res = await request(makeApp()).get('/events/export');
    expect(res.headers['x-total-rows']).toBe('2');
  });

  it('0 événements → CSV header only', async () => {
    vi.mocked(getTelemetryEvents).mockResolvedValue([]);
    const res = await request(makeApp()).get('/events/export');
    expect(res.status).toBe(200);
    expect(res.text).toBe(CSV_HEADER);
    expect(res.headers['x-total-rows']).toBe('0');
  });

  it('DB indisponible → 503', async () => {
    vi.mocked(getDb).mockImplementation(() => { throw new Error('no db'); });
    const res = await request(makeApp()).get('/events/export');
    expect(res.status).toBe(503);
  });

  it('limit clampé à 50000 max', async () => {
    await request(makeApp()).get('/events/export?limit=999999');
    expect(getTelemetryEvents).toHaveBeenCalledWith(expect.anything(), expect.any(String), expect.any(Date), 50_000);
  });

  it('days clampé à 90 max', async () => {
    await request(makeApp()).get('/events/export?days=200');
    const call = vi.mocked(getTelemetryEvents).mock.calls[0];
    const since = call[2] as Date;
    const diffDays = (Date.now() - since.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeCloseTo(90, 0);
  });
});
