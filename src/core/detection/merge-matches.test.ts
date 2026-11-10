import { describe, expect, it } from 'vitest';
import { mergeRawMatches } from './merge-matches.js';
import type { RawMatch } from './types.js';

describe('mergeRawMatches', () => {
  it('conserve les correspondances disjointes, triées', () => {
    const merged = mergeRawMatches([
      { ruleType: 'phone', start: 20, end: 30 },
      { ruleType: 'iban', start: 0, end: 10 },
    ]);
    expect(merged.map((m) => [m.ruleType, m.start])).toEqual([
      ['iban', 0],
      ['phone', 20],
    ]);
  });

  it('en cas de chevauchement, garde la règle la plus prioritaire', () => {
    const merged = mergeRawMatches([
      { ruleType: 'card', start: 0, end: 16 },
      { ruleType: 'api_key', start: 4, end: 30 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].ruleType).toBe('api_key');
  });

  it('élimine les doublons exacts (chevauchement de fenêtres)', () => {
    const dup: RawMatch = { ruleType: 'iban', start: 5, end: 32 };
    expect(mergeRawMatches([dup, { ...dup }])).toHaveLength(1);
  });

  it('à début égal et priorité égale, garde la plus longue', () => {
    const merged = mergeRawMatches([
      { ruleType: 'api_key', start: 0, end: 10 },
      { ruleType: 'api_key', start: 0, end: 40 },
    ]);
    expect(merged).toEqual([expect.objectContaining({ start: 0, end: 40 })]);
  });

  it('reste linéaire : 200 000 correspondances fusionnées en moins de 2 s (F10)', () => {
    const many: RawMatch[] = Array.from({ length: 200_000 }, (_, i) => ({
      ruleType: 'phone',
      start: i * 15,
      end: i * 15 + 14,
    }));
    const t0 = performance.now();
    const merged = mergeRawMatches(many);
    expect(merged).toHaveLength(200_000);
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});
