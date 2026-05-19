import { describe, expect, it } from 'vitest';
import type { TelemetryEvent } from '../core/types.js';
import {
  countStoredEvents,
  getRetentionMs,
  purgeExpiredEvents,
  registerEvents,
} from './telemetry-store.js';

function sampleEvent(id: string): TelemetryEvent {
  return {
    eventId: id,
    tenantId: 'acme',
    deviceId: 'device-1',
    occurredAt: new Date().toISOString(),
    ruleType: 'iban',
    action: 'block',
    host: 'claude.ai',
    extensionVersion: '0.1.0',
    policyVersion: '1.0.0',
    locale: 'fr',
    browser: 'chromium',
  };
}

describe('telemetry-store', () => {
  it('déduplique par eventId', () => {
    const retention = getRetentionMs(90);
    const first = registerEvents([sampleEvent('id-1')], retention);
    const second = registerEvents([sampleEvent('id-1')], retention);
    expect(first.accepted).toBe(1);
    expect(second.duplicates).toBe(1);
    expect(countStoredEvents()).toBe(1);
  });

  it('purge les événements expirés', () => {
    const retention = getRetentionMs(90);
    registerEvents([sampleEvent('purge-me')], retention);
    const removed = purgeExpiredEvents(-1);
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(countStoredEvents()).toBe(0);
  });
});
