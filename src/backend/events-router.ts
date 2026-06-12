import { Router } from 'express';
import { getDb } from './db/index.js';
import { getTelemetryAggregate, getTelemetryCount } from './db/queries.js';
import type { GroupByField, AggregateRow } from './db/queries.js';
import { tenantMiddleware, requireScope } from './middleware/tenant.js';

export const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;
const VALID_GROUP_BY = new Set(['ruleType', 'action', 'host', 'all']);

type AllBreakdown = { byRuleType: AggregateRow[]; byAction: AggregateRow[]; byHost: AggregateRow[] };

export interface AggregateResponse {
  days: number;
  from: string;
  to: string;
  total: number;
  groupBy: string;
  breakdown: AggregateRow[] | AllBreakdown;
}

interface CacheEntry {
  data: AggregateResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function evictExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

export function clearCache(): void {
  cache.clear();
}

export const eventsRouter = Router();
eventsRouter.use(tenantMiddleware as never);

eventsRouter.get(
  '/aggregate',
  requireScope('telemetry:read') as never,
  async (req, res) => {
    const tenantId = req.tenant!.tenantId;

    const daysRaw = Number(req.query.days ?? DEFAULT_DAYS);
    const days =
      Number.isFinite(daysRaw) && daysRaw >= 1
        ? Math.min(Math.floor(daysRaw), MAX_DAYS)
        : DEFAULT_DAYS;

    const groupBy = String(req.query.groupBy ?? 'ruleType');
    if (!VALID_GROUP_BY.has(groupBy)) {
      res.status(400).json({ error: 'invalid_groupBy', allowed: [...VALID_GROUP_BY] });
      return;
    }

    const cacheKey = `${tenantId}:${days}:${groupBy}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.setHeader('X-Cache', 'HIT');
      res.json(cached.data);
      return;
    }

    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    let db;
    try {
      db = getDb();
    } catch {
      res.status(503).json({ error: 'database_unavailable' });
      return;
    }

    let breakdown: AggregateRow[] | AllBreakdown;
    let total: number;

    if (groupBy === 'all') {
      const [byRuleType, byAction, byHost, totalCount] = await Promise.all([
        getTelemetryAggregate(db, tenantId, from, 'ruleType'),
        getTelemetryAggregate(db, tenantId, from, 'action'),
        getTelemetryAggregate(db, tenantId, from, 'host'),
        getTelemetryCount(db, tenantId, from),
      ]);
      breakdown = { byRuleType, byAction, byHost };
      total = totalCount;
    } else {
      const [rows, totalCount] = await Promise.all([
        getTelemetryAggregate(db, tenantId, from, groupBy as GroupByField),
        getTelemetryCount(db, tenantId, from),
      ]);
      breakdown = rows;
      total = totalCount;
    }

    const data: AggregateResponse = { days, from: from.toISOString(), to: to.toISOString(), total, groupBy, breakdown };
    cache.set(cacheKey, { data, expiresAt: now + CACHE_TTL_MS });
    evictExpiredCache();

    res.setHeader('X-Cache', 'MISS');
    res.json(data);
  },
);
