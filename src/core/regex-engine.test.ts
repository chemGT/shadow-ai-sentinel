import { describe, expect, it } from 'vitest';
import { createDefaultPolicy } from './defaults.js';
import { MAX_DETECTION_INPUT_LENGTH } from './detection/limits.js';
import { isValidIbanChecksum } from './detection/iban.js';
import { detectSensitiveData } from './regex-engine.js';
import type { Policy } from './types.js';

function policyWith(overrides: Partial<Policy> & { emailDomains?: string[] }): Policy {
  const base = createDefaultPolicy('tenant-test');
  return {
    ...base,
    ...overrides,
    rules: overrides.rules ?? base.rules,
    emailDomains: overrides.emailDomains ?? base.emailDomains,
  };
}

function enableAllRules(policy: Policy): Policy {
  return {
    ...policy,
    rules: policy.rules.map((r) => ({ ...r, enabled: true })),
    emailDomains: ['acme.com'],
  };
}

describe('isValidIbanChecksum', () => {
  it('valide un IBAN de référence', () => {
    expect(isValidIbanChecksum('DE89370400440532013000')).toBe(true);
    expect(isValidIbanChecksum('FR76 3000 6000 0112 3456 7890 189')).toBe(true);
  });

  it('rejette un IBAN invalide', () => {
    expect(isValidIbanChecksum('FR7612345678901234567890188')).toBe(false);
    expect(isValidIbanChecksum('XX00INVALID0000000000')).toBe(false);
  });
});

describe('detectSensitiveData — api_key', () => {
  it('détecte une clé AWS', () => {
    const text = 'clé = AKIAIOSFODNN7EXAMPLE pour S3';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(true);
    expect(matches.find((m) => m.ruleType === 'api_key')?.replacementToken).toBe(
      '[REDACTED_API_KEY]',
    );
  });

  it('détecte une clé OpenAI sk-', () => {
    const text = 'token sk-abcdefghijklmnopqrstuvwxyz1234567890';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(true);
  });

  it('détecte un token GitHub', () => {
    const text = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz12';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(true);
  });
});

describe('detectSensitiveData — iban', () => {
  it('détecte un IBAN valide', () => {
    const text = 'virement vers DE89370400440532013000 demain';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'iban')).toBe(true);
  });

  it('ignore une chaîne type IBAN invalide', () => {
    const text = 'FR7612345678901234567890188';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'iban')).toBe(false);
  });
});

describe('detectSensitiveData — internal_ip', () => {
  it('détecte une IP RFC1918', () => {
    const text = 'serveur sur 192.168.10.25 en local';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'internal_ip')).toBe(true);
  });

  it('ignore une IP publique', () => {
    const text = 'DNS 8.8.8.8';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    expect(matches.some((m) => m.ruleType === 'internal_ip')).toBe(false);
  });
});

describe('detectSensitiveData — pro_email', () => {
  it('détecte un email pro allowlisté', () => {
    const policy = policyWith({
      emailDomains: ['acme.com'],
      rules: createDefaultPolicy().rules.map((r) =>
        r.type === 'pro_email' ? { ...r, enabled: true } : r,
      ),
    });
    const matches = detectSensitiveData('contact: jean.dupont@acme.com', policy);
    expect(matches.some((m) => m.ruleType === 'pro_email')).toBe(true);
  });

  it('ignore gmail hors allowlist', () => {
    const policy = policyWith({
      emailDomains: ['acme.com'],
      rules: createDefaultPolicy().rules.map((r) =>
        r.type === 'pro_email' ? { ...r, enabled: true } : r,
      ),
    });
    const matches = detectSensitiveData('perso@gmail.com', policy);
    expect(matches.some((m) => m.ruleType === 'pro_email')).toBe(false);
  });

  it('ne scanne pas pro_email si désactivé', () => {
    const policy = policyWith({ emailDomains: ['acme.com'] });
    const matches = detectSensitiveData('jean@acme.com', policy);
    expect(matches.some((m) => m.ruleType === 'pro_email')).toBe(false);
  });
});

describe('detectSensitiveData — phone', () => {
  it('détecte un numéro FR', () => {
    const matches = detectSensitiveData(
      'appelez le 06 12 34 56 78',
      enableAllRules(createDefaultPolicy()),
    );
    expect(matches.some((m) => m.ruleType === 'phone')).toBe(true);
  });

  it('ignore une suite de chiffres sans format téléphone', () => {
    const matches = detectSensitiveData(
      'référence 1234567890123',
      enableAllRules(createDefaultPolicy()),
    );
    expect(matches.some((m) => m.ruleType === 'phone')).toBe(false);
  });
});

describe('detectSensitiveData — generic_secret', () => {
  it('détecte un Bearer token', () => {
    const matches = detectSensitiveData(
      'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
      enableAllRules(createDefaultPolicy()),
    );
    expect(matches.some((m) => m.ruleType === 'generic_secret')).toBe(true);
  });
});

describe('detectSensitiveData — policy', () => {
  it('respecte les règles désactivées', () => {
    const policy = policyWith({
      rules: createDefaultPolicy().rules.map((r) =>
        r.type === 'api_key' ? { ...r, enabled: false } : { ...r, enabled: true },
      ),
      emailDomains: ['acme.com'],
    });
    const matches = detectSensitiveData('AKIAIOSFODNN7EXAMPLE', policy);
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(false);
  });

  it('fusionne les chevauchements (api_key prioritaire)', () => {
    const text = 'AKIAIOSFODNN7EXAMPLE';
    const matches = detectSensitiveData(text, enableAllRules(createDefaultPolicy()));
    const apiMatches = matches.filter((m) => m.ruleType === 'api_key');
    expect(apiMatches.length).toBe(1);
  });
});

describe('detectSensitiveData — limites', () => {
  it('tronque les entrées trop longues sans planter', () => {
    const policy = enableAllRules(createDefaultPolicy());
    const padding = 'x'.repeat(MAX_DETECTION_INPUT_LENGTH + 5000);
    const text = `${padding} AKIAIOSFODNN7EXAMPLE`;
    const matches = detectSensitiveData(text, policy);
    expect(matches.some((m) => m.ruleType === 'api_key')).toBe(false);
  });

  it('reste rapide sur ~10k caractères', () => {
    const policy = enableAllRules(createDefaultPolicy());
    const text = `${'mot '.repeat(2500)}DE89370400440532013000 ${'fin '.repeat(2500)}`;
    const start = performance.now();
    detectSensitiveData(text, policy);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
