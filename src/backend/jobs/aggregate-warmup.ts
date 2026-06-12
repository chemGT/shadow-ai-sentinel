import type { Db } from '../db/index.js';
import { getActiveTenants, getTelemetryAggregate, getTelemetryCount } from '../db/queries.js';
import { setCacheEntry } from '../events-router.js';

const WARMUP_DAYS = 30;

export async function runAggregateWarmup(db: Db): Promise<number> {
  const active = await getActiveTenants(db);
  let warmed = 0;

  for (const tenant of active) {
    const to = new Date();
    const from = new Date(to.getTime() - WARMUP_DAYS * 24 * 60 * 60 * 1000);

    const [byRuleType, byAction, byHost, total] = await Promise.all([
      getTelemetryAggregate(db, tenant.id, from, 'ruleType'),
      getTelemetryAggregate(db, tenant.id, from, 'action'),
      getTelemetryAggregate(db, tenant.id, from, 'host'),
      getTelemetryCount(db, tenant.id, from),
    ]);

    setCacheEntry(tenant.id, WARMUP_DAYS, 'all', {
      days: WARMUP_DAYS,
      from: from.toISOString(),
      to: to.toISOString(),
      total,
      groupBy: 'all',
      breakdown: { byRuleType, byAction, byHost },
    });

    warmed += 1;
  }

  return warmed;
}
