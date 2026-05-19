import { describe, expect, it } from 'vitest';
import { createDefaultPolicy } from '../../core/defaults.js';
import { applyRedactionsToText, evaluateGuard } from './analyze.js';

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

describe('applyRedactionsToText', () => {
  it('remplace du plus grand index au plus petit', () => {
    const text = 'aaa bbb';
    const result = applyRedactionsToText(text, [
      { ruleType: 'iban', start: 0, end: 3, replacementToken: '[A]' },
      { ruleType: 'iban', start: 4, end: 7, replacementToken: '[B]' },
    ]);
    expect(result).toBe('[A] [B]');
  });
});
