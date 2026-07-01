import { describe, it, expect } from 'vitest';
import { entitlementFromCheck } from './license-manager.js';
import type { Entitlement } from '../../core/licensing/entitlement.js';
import type { LicenseCheckResult } from '../../core/licensing/verify.js';

const NOW = new Date('2026-06-30T12:00:00Z');

function res(partial: Partial<LicenseCheckResult>): LicenseCheckResult {
  return { valid: false, reason: 'not_found', ...partial };
}

describe('entitlementFromCheck', () => {
  it('licence valide → Pro actif avec lastValidAt', () => {
    const e = entitlementFromCheck(res({ valid: true, reason: 'ok' }), null, NOW);
    expect(e).toEqual({
      tier: 'pro',
      valid: true,
      checkedAt: NOW.toISOString(),
      lastValidAt: NOW.toISOString(),
    });
  });

  it('rejet définitif (remboursé) → Free', () => {
    const previous: Entitlement = {
      tier: 'pro',
      valid: true,
      checkedAt: '2026-06-01T00:00:00Z',
      lastValidAt: '2026-06-01T00:00:00Z',
    };
    const e = entitlementFromCheck(res({ reason: 'refunded' }), previous, NOW);
    expect(e.tier).toBe('free');
    expect(e.valid).toBe(false);
  });

  it('erreur réseau dans la grâce → Pro conservé', () => {
    const previous: Entitlement = {
      tier: 'pro',
      valid: true,
      checkedAt: '2026-06-28T00:00:00Z',
      lastValidAt: '2026-06-28T00:00:00Z',
    };
    const e = entitlementFromCheck(res({ reason: 'network_error' }), previous, NOW, 7);
    expect(e.tier).toBe('pro');
    expect(e.valid).toBe(true);
    expect(e.message).toBe('offline_grace');
  });

  it('erreur réseau hors grâce → invalide', () => {
    const previous: Entitlement = {
      tier: 'pro',
      valid: true,
      checkedAt: '2026-06-01T00:00:00Z',
      lastValidAt: '2026-06-01T00:00:00Z',
    };
    const e = entitlementFromCheck(res({ reason: 'network_error' }), previous, NOW, 7);
    expect(e.valid).toBe(false);
    expect(e.message).toBe('network_error');
  });

  it('erreur réseau sans historique → Free invalide', () => {
    const e = entitlementFromCheck(res({ reason: 'network_error' }), null, NOW, 7);
    expect(e.tier).toBe('free');
    expect(e.valid).toBe(false);
  });
});
