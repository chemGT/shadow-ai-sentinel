import { eq, desc } from 'drizzle-orm';
import type { Db } from './index.js';
import { policies, telemetryEvents, auditLog } from './schema.js';
import type Policy from '../../core/types.js';

// --- Policies ---

export async function getLatestPolicy(db: Db, tenantId: string): Promise<Policy | null> {
  const rows = await db
    .select()
    .from(policies)
    .where(eq(policies.tenantId, tenantId))
    .orderBy(desc(policies.createdAt))
    .limit(1);

  return rows[0]?.payload as Policy ?? null;
}

export async function upsertPolicy(db: Db, tenantId: string, payload: Policy): Promise<void> {
  await db.insert(policies).values({ tenantId, payload });
}

// --- Telemetry ---

export async function insertTelemetryEvents(
  db: Db,
  tenantId: string,
  events: Array<{ host: string; ruleType: string; action: string; ts?: Date }>,
): Promise<void> {
  if (events.length === 0) return;
  await db.insert(telemetryEvents).values(
    events.map((e) => ({
      tenantId,
      host: e.host,
      ruleType: e.ruleType,
      action: e.action,
      ts: e.ts ?? new Date(),
    })),
  );
}

// --- Audit ---

export async function appendAuditEntry(
  db: Db,
  tenantId: string,
  actor: string,
  action: string,
  payload?: unknown,
): Promise<void> {
  await db.insert(auditLog).values({ tenantId, actor, action, payload });
}
