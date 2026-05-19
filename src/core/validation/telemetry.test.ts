import { describe, expect, it } from 'vitest';
import { validateTelemetryEvent } from './telemetry.js';

const VALID_EVENT = {
  eventId: '00000000-0000-4000-8000-000000000001',
  tenantId: 'acme-corp',
  deviceId: '00000000-0000-4000-8000-000000000002',
  occurredAt: '2026-05-19T12:00:00.000Z',
  ruleType: 'iban',
  action: 'block',
  host: 'claude.ai',
  extensionVersion: '0.1.0',
  policyVersion: '1.0.0',
  locale: 'fr',
  browser: 'chromium',
} as const;

describe('validateTelemetryEvent', () => {
  it('accepte un événement conforme', () => {
    const result = validateTelemetryEvent(VALID_EVENT);
    expect(result.ok).toBe(true);
  });

  it('rejette un champ interdit', () => {
    const result = validateTelemetryEvent({ ...VALID_EVENT, text: 'prompt secret' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('text'))).toBe(true);
    }
  });

  it('rejette un eventId non UUID', () => {
    const result = validateTelemetryEvent({ ...VALID_EVENT, eventId: 'not-a-uuid' });
    expect(result.ok).toBe(false);
  });
});
