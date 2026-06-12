import type { Db } from '../db/index.js';
import {
  getOverdueTenants,
  suspendTenant,
  revokeAllTenantKeys,
  appendAuditEntry,
} from '../db/queries.js';

export const DEFAULT_GRACE_PERIOD_DAYS = 7;

export async function runDunningCheck(
  db: Db,
  gracePeriodDays = DEFAULT_GRACE_PERIOD_DAYS,
): Promise<number> {
  const cutoff = new Date(Date.now() - gracePeriodDays * 24 * 60 * 60 * 1000);
  const overdue = await getOverdueTenants(db, cutoff);
  let suspended = 0;

  for (const tenant of overdue) {
    await suspendTenant(db, tenant.id);
    const revoked = await revokeAllTenantKeys(db, tenant.id);
    await appendAuditEntry(db, tenant.id, 'system:dunning', 'tenant.suspended', {
      reason: 'payment_overdue',
      gracePeriodDays,
      keysRevoked: revoked,
    });
    suspended += 1;
  }

  return suspended;
}
