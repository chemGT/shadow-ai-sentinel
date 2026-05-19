import type { TelemetryEvent } from '../core/types.js';

type StoredMeta = {
  receivedAt: number;
  tenantId: string;
};

const events = new Map<string, StoredMeta>();

export function getRetentionMs(retentionDays: number): number {
  return retentionDays * 24 * 60 * 60 * 1000;
}

export function purgeExpiredEvents(retentionMs: number): number {
  const now = Date.now();
  let removed = 0;

  for (const [eventId, meta] of events.entries()) {
    if (now - meta.receivedAt > retentionMs) {
      events.delete(eventId);
      removed += 1;
    }
  }

  return removed;
}

export function registerEvents(
  incoming: TelemetryEvent[],
  retentionMs: number,
): { accepted: number; duplicates: number } {
  purgeExpiredEvents(retentionMs);

  let accepted = 0;
  let duplicates = 0;
  const now = Date.now();

  for (const event of incoming) {
    if (events.has(event.eventId)) {
      duplicates += 1;
      continue;
    }
    events.set(event.eventId, { receivedAt: now, tenantId: event.tenantId });
    accepted += 1;
  }

  return { accepted, duplicates };
}

export function countStoredEvents(): number {
  return events.size;
}
