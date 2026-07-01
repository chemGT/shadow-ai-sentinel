import type { Db } from '../db/index.js';
import { getAllTenants, deleteTelemetryOlderThan } from '../db/queries.js';

const RETENTION_DAYS_BY_PLAN: Record<string, number> = {
  trial: 30,
  starter: 60,
  business: 90,
};
const DEFAULT_RETENTION_DAYS = 90;

export function retentionDaysForPlan(plan: string): number {
  return RETENTION_DAYS_BY_PLAN[plan] ?? DEFAULT_RETENTION_DAYS;
}

export async function runPurgeJob(db: Db): Promise<number> {
  const allTenants = await getAllTenants(db);
  let purged = 0;

  for (const tenant of allTenants) {
    const days = retentionDaysForPlan(tenant.plan);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    await deleteTelemetryOlderThan(db, tenant.id, cutoff);
    purged += 1;
  }

  return purged;
}
