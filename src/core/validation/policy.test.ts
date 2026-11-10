import { describe, expect, it } from 'vitest';
import { createDefaultPolicy } from '../defaults.js';
import { evaluateGuard } from '../../extension/content/analyze.js';
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

describe('validatePolicy — règles manquantes (F11)', () => {
  it('complète les types absents par leur valeur par défaut au lieu de les désactiver', () => {
    const result = validatePolicy({ ...createDefaultPolicy(), rules: [] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.policy.rules).toEqual(createDefaultPolicy().rules);
      expect(evaluateGuard('AKIAIOSFODNN7EXAMPLE', result.policy).kind).toBe('block');
    }
  });

  it('respecte une désactivation explicite et garde la dernière occurrence d’un doublon', () => {
    const result = validatePolicy({
      ...createDefaultPolicy(),
      rules: [
        { type: 'iban', action: 'redact', enabled: true },
        { type: 'iban', action: 'block', enabled: false },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const iban = result.policy.rules.filter((r) => r.type === 'iban');
      expect(iban).toEqual([{ type: 'iban', action: 'block', enabled: false }]);
      expect(result.policy.rules).toHaveLength(createDefaultPolicy().rules.length);
    }
  });
});

describe('docs/policy.example.json', () => {
  it('reste une policy valide (exemple documenté pour l’import dans les options)', async () => {
    const { readFile } = await import('node:fs/promises');
    const raw = JSON.parse(await readFile('docs/policy.example.json', 'utf8')) as unknown;
    const result = validatePolicy(raw);
    expect(result.ok, result.ok ? '' : result.errors.join(', ')).toBe(true);
  });
});
