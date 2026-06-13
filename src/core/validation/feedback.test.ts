import { describe, it, expect } from 'vitest';
import { validateFeedbackEvent, FEEDBACK_CONTEXT_CHOICES } from './feedback.js';
import { FORBIDDEN_TELEMETRY_KEYS } from '../constants.js';

const validEvent = {
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  tenantId: 'tenant-1',
  deviceId: 'device-1',
  occurredAt: '2026-06-13T10:00:00Z',
  ruleType: 'iban',
  contextChoice: 'code',
  host: 'claude.ai',
  extensionVersion: '0.2.0',
  policyVersion: '1.0.0',
  locale: 'fr',
  browser: 'chromium',
};

describe('validateFeedbackEvent — happy path', () => {
  it('accepte un événement complet et bien formé', () => {
    const result = validateFeedbackEvent(validEvent);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.contextChoice).toBe('code');
      expect(result.event.ruleType).toBe('iban');
    }
  });

  it('accepte les 5 valeurs de contextChoice', () => {
    expect(FEEDBACK_CONTEXT_CHOICES).toEqual(['code', 'prose', 'json', 'url', 'other']);
    for (const choice of FEEDBACK_CONTEXT_CHOICES) {
      const r = validateFeedbackEvent({ ...validEvent, contextChoice: choice });
      expect(r.ok).toBe(true);
    }
  });
});

describe('validateFeedbackEvent — rejet des champs interdits', () => {
  for (const key of FORBIDDEN_TELEMETRY_KEYS) {
    it(`rejette le champ interdit "${key}"`, () => {
      const result = validateFeedbackEvent({ ...validEvent, [key]: 'fuite' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes(key))).toBe(true);
      }
    });
  }
});

describe('validateFeedbackEvent — erreurs de schéma', () => {
  it('rejette null', () => {
    expect(validateFeedbackEvent(null).ok).toBe(false);
  });

  it('rejette un eventId non-UUID', () => {
    const r = validateFeedbackEvent({ ...validEvent, eventId: 'not-uuid' });
    expect(r.ok).toBe(false);
  });

  it('rejette contextChoice inconnu', () => {
    const r = validateFeedbackEvent({ ...validEvent, contextChoice: 'invalid' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain('contextChoice invalide');
  });

  it('rejette contextChoice manquant', () => {
    const { contextChoice: _omit, ...rest } = validEvent;
    void _omit;
    const r = validateFeedbackEvent(rest);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain('contextChoice requis');
  });

  it('rejette ruleType invalide', () => {
    const r = validateFeedbackEvent({ ...validEvent, ruleType: 'unknown_type' });
    expect(r.ok).toBe(false);
  });

  it('rejette host non supporté', () => {
    const r = validateFeedbackEvent({ ...validEvent, host: 'evil.com' });
    expect(r.ok).toBe(false);
  });

  it('rejette tenantId vide', () => {
    const r = validateFeedbackEvent({ ...validEvent, tenantId: '' });
    expect(r.ok).toBe(false);
  });
});
