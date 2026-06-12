import { eq, desc, count, gte, and } from 'drizzle-orm';
import type { Db } from './index.js';
import { policies, telemetryEvents, auditLog } from './schema.js';
import type { Policy } from '../../core/types.js';

export type GroupByField = 'ruleType' | 'action' | 'host';
export type AggregateRow = { key: string; count: number };

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

export async function getTelemetryCount(db: Db, tenantId: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ cnt: count() })
    .from(telemetryEvents)
    .where(and(eq(telemetryEvents.tenantId, tenantId), gte(telemetryEvents.ts, since)));
  return Number(row?.cnt ?? 0);
}

export async function getTelemetryAggregate(
  db: Db,
  tenantId: string,
  since: Date,
  groupByField: GroupByField,
): Promise<AggregateRow[]> {
  const col =
    groupByField === 'ruleType'
      ? telemetryEvents.ruleType
      : groupByField === 'action'
        ? telemetryEvents.action
        : telemetryEvents.host;

  const rows = await db
    .select({ key: col, cnt: count() })
    .from(telemetryEvents)
    .where(and(eq(telemetryEvents.tenantId, tenantId), gte(telemetryEvents.ts, since)))
    .groupBy(col)
    .orderBy(desc(count()));

  return rows.map((r) => ({ key: r.key, count: Number(r.cnt) }));
}

export type TelemetryRow = { ts: Date; host: string; ruleType: string; action: string };

export async function getTelemetryEvents(
  db: Db,
  tenantId: string,
  since: Date,
  limit: number,
): Promise<TelemetryRow[]> {
  return db
    .select({
      ts: telemetryEvents.ts,
      host: telemetryEvents.host,
      ruleType: telemetryEvents.ruleType,
      action: telemetryEvents.action,
    })
    .from(telemetryEvents)
    .where(and(eq(telemetryEvents.tenantId, tenantId), gte(telemetryEvents.ts, since)))
    .orderBy(desc(telemetryEvents.ts))
    .limit(limit);
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
