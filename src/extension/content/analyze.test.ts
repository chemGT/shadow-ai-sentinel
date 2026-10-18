import { describe, expect, it } from 'vitest';
import { createDefaultPolicy } from '../../core/defaults.js';
import {
  applyRedactionsToText,
  evaluateGuard,
  normalizeAllowlistValue,
} from './analyze.js';

describe('evaluateGuard', () => {
  it('autorise un texte vide', () => {
    expect(evaluateGuard('  ', createDefaultPolicy())).toEqual({ kind: 'allow' });
  });

  it('bloque une clé API', () => {
    const decision = evaluateGuard(
      'key=AKIAIOSFODNN7EXAMPLE',
      createDefaultPolicy(),
    );
    expect(decision.kind).toBe('block');
  });

  it('redact un IBAN si seule règle redact', () => {
    const policy = {
      ...createDefaultPolicy(),
      rules: createDefaultPolicy().rules.map((r) =>
        r.type === 'api_key' ? { ...r, enabled: false } : r,
      ),
    };
    const decision = evaluateGuard('virement DE89370400440532013000', policy);
    expect(decision.kind).toBe('redact');
    if (decision.kind === 'redact') {
      expect(decision.matches.length).toBeGreaterThan(0);
    }
  });
});

describe('evaluateGuard — allowlist', () => {
  it('exclut une valeur exacte allowlistée (block → allow)', () => {
    const decision = evaluateGuard(
      'key=AKIAIOSFODNN7EXAMPLE',
      createDefaultPolicy(),
      ['AKIAIOSFODNN7EXAMPLE'],
    );
    expect(decision.kind).toBe('allow');
  });

  it('ignore la casse et les espaces autour de la valeur allowlistée', () => {
    const decision = evaluateGuard(
      'key=AKIAIOSFODNN7EXAMPLE',
      createDefaultPolicy(),
      ['  akiaiosfodnn7example  '],
    );
    expect(decision.kind).toBe('allow');
  });

  it('ne filtre pas une valeur non allowlistée', () => {
    const decision = evaluateGuard(
      'key=AKIAIOSFODNN7EXAMPLE',
      createDefaultPolicy(),
      ['une-autre-valeur'],
    );
    expect(decision.kind).toBe('block');
  });

  it('reconnaît la valeur allowlistée malgré un repli Unicode (NBSP, zero-width)', () => {
    const decision = evaluateGuard(
      'key=AKIA\u200BIOSFODNN7EXAMPLE',
      createDefaultPolicy(),
      ['AKIAIOSFODNN7EXAMPLE'],
    );
    expect(decision.kind).toBe('allow');
  });

  it('allowlist vide = comportement inchangé', () => {
    const decision = evaluateGuard('key=AKIAIOSFODNN7EXAMPLE', createDefaultPolicy(), []);
    expect(decision.kind).toBe('block');
  });
});

describe('normalizeAllowlistValue', () => {
  it('trim + minuscule', () => {
    expect(normalizeAllowlistValue('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });
});

describe('applyRedactionsToText', () => {
  it('remplace du plus grand index au plus petit', () => {
    const text = 'aaa bbb';
    const result = applyRedactionsToText(text, [
      { ruleType: 'iban', start: 0, end: 3, replacementToken: '[A]' },
      { ruleType: 'iban', start: 4, end: 7, replacementToken: '[B]' },
    ]);
    expect(result).toBe('[A] [B]');
  });

  it('caviarde intégralement un IBAN séparé par NBSP (offsets du texte original)', () => {
    const policy = {
      ...createDefaultPolicy(),
      rules: createDefaultPolicy().rules.map((r) =>
        r.type === 'api_key' ? { ...r, enabled: false } : r,
      ),
    };
    const nbsp = '\u00A0';
    const iban = ['DE89', '3704', '0044', '0532', '0130', '00'].join(nbsp);
    const text = `virement ${iban} merci`;
    const decision = evaluateGuard(text, policy);
    expect(decision.kind).toBe('redact');
    if (decision.kind === 'redact') {
      const result = applyRedactionsToText(text, decision.matches);
      expect(result).toBe(`virement ${decision.matches[0].replacementToken} merci`);
    }
  });
});
