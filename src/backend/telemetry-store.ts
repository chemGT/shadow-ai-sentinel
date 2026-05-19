import type { TelemetryEvent } from '../core/types.js';

const seenEvents = new Map<string, number>();
const DEDUPE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function purgeExpired(now: number): void {
  for (const [id, ts] of seenEvents.entries()) {
    if (now - ts > DEDUPE_TTL_MS) {
      seenEvents.delete(id);
    }
  }
}

export function registerEvents(events: TelemetryEvent[]): { accepted: number; duplicates: number } {
  const now = Date.now();
  purgeExpired(now);

  let accepted = 0;
  let duplicates = 0;

  for (const event of events) {
    if (seenEvents.has(event.eventId)) {
      duplicates += 1;
      continue;
    }
    seenEvents.set(event.eventId, now);
    accepted += 1;
  }

  return { accepted, duplicates };
}
