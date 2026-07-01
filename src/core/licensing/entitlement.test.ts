import { describe, it, expect } from 'vitest';
import {
  applyEntitlementToPolicy,
  createFreeEntitlement,
  FREE_RULE_TYPES,
  isFileScanAllowed,
  isProEntitlement,
  isProRuleType,
  PRO_RULE_TYPES,
  type Entitlement,
} from './entitlement.js';
import { createDefaultPolicy } from '../defaults.js';

const proEntitlement: Entitlement = {
  tier: 'pro',
  valid: true,
  checkedAt: '2026-06-30T10:00:00Z',
};

describe('isProEntitlement', () => {
  it('vrai uniquement pour un palier pro valide', () => {
    expect(isProEntitlement(proEntitlement)).toBe(true);
  });

  it('faux pour Free, null, ou pro invalide', () => {
    expect(isProEntitlement(createFreeEntitlement())).toBe(false);
    expect(isProEntitlement(null)).toBe(false);
    expect(isProEntitlement(undefined)).toBe(false);
    expect(isProEntitlement({ ...proEntitlement, valid: false })).toBe(false);
  });
});

describe('partition des types de règles', () => {
  it('Free et Pro sont disjoints', () => {
    for (const type of FREE_RULE_TYPES) {
      expect(PRO_RULE_TYPES).not.toContain(type);
    }
  });

  it('isProRuleType correspond à PRO_RULE_TYPES', () => {
    expect(isProRuleType('iban')).toBe(true);
    expect(isProRuleType('api_key')).toBe(false);
  });
});

describe('isFileScanAllowed', () => {
  it('réservé au Pro', () => {
    expect(isFileScanAllowed(proEntitlement)).toBe(true);
    expect(isFileScanAllowed(createFreeEntitlement())).toBe(false);
  });
});

describe('applyEntitlementToPolicy', () => {
  it('Pro : policy inchangée (même référence)', () => {
    const policy = createDefaultPolicy('t1');
    expect(applyEntitlementToPolicy(policy, proEntitlement)).toBe(policy);
  });

  it('Free : désactive toutes les règles Pro, garde les règles Free', () => {
    const policy = createDefaultPolicy('t1');
    const effective = applyEntitlementToPolicy(policy, createFreeEntitlement());

    for (const rule of effective.rules) {
      if (PRO_RULE_TYPES.includes(rule.type)) {
        expect(rule.enabled).toBe(false);
      }
    }
    // Au moins une règle Free reste potentiellement active.
    const freeRule = effective.rules.find((r) => r.type === 'api_key');
    const originalFree = policy.rules.find((r) => r.type === 'api_key');
    expect(freeRule?.enabled).toBe(originalFree?.enabled);
  });

  it('Free : ne mute pas la policy d’origine', () => {
    const policy = createDefaultPolicy('t1');
    const snapshot = JSON.stringify(policy);
    applyEntitlementToPolicy(policy, createFreeEntitlement());
    expect(JSON.stringify(policy)).toBe(snapshot);
  });
});
