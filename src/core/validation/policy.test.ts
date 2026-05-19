import { describe, expect, it } from 'vitest';
import { createDefaultPolicy } from '../defaults.js';
import { validatePolicy } from './policy.js';

describe('validatePolicy', () => {
  it('accepte une policy valide', () => {
    const policy = createDefaultPolicy('acme');
    const result = validatePolicy(policy);
    expect(result.ok).toBe(true);
  });

  it('rejette pro_email activé sans domaines', () => {
    const policy = {
      ...createDefaultPolicy('acme'),
      emailDomains: [],
      rules: createDefaultPolicy().rules.map((r) =>
        r.type === 'pro_email' ? { ...r, enabled: true } : r,
      ),
    };
    const result = validatePolicy(policy);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('emailDomains'))).toBe(true);
    }
  });

  it('normalise les domaines email', () => {
    const policy = {
      ...createDefaultPolicy('acme'),
      emailDomains: ['@Acme.COM', '  acme.fr  '],
      rules: createDefaultPolicy().rules.map((r) =>
        r.type === 'pro_email' ? { ...r, enabled: true } : r,
      ),
    };
    const result = validatePolicy(policy);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.policy.emailDomains).toEqual(['acme.com', 'acme.fr']);
    }
  });
});
