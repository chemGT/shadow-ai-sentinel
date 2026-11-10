import { describe, expect, it } from 'vitest';
import { createDefaultPolicy } from '../defaults.js';
import { detectSensitiveData } from '../regex-engine.js';
import type { Policy } from '../types.js';
import { applyRedactionsToText } from '../../extension/content/analyze.js';
import { TRUE_NEGATIVES, TRUE_POSITIVES, type CorpusEntry } from './corpus.js';

const policy: Policy = {
  ...createDefaultPolicy(),
  emailDomains: ['acme.com'],
  rules: createDefaultPolicy().rules.map((r) => ({ ...r, enabled: true })),
};

const detectedTypes = (text: string): string[] =>
  [...new Set(detectSensitiveData(text, policy).map((m) => m.ruleType))].sort();

const label = (e: CorpusEntry): string => (e.gap ? `[MANQUE CONNU] ${e.id}` : e.id);

describe('corpus étiqueté — vrais positifs', () => {
  it.each(TRUE_POSITIVES.map((e) => [label(e), e] as const))('%s', (_id, entry) => {
    expect(detectedTypes(entry.text)).toEqual([...entry.expect].sort());
  });

  it('une valeur seule est caviardée en entier (rien ne dépasse du jeton)', () => {
    for (const entry of TRUE_POSITIVES.filter((e) => !e.gap && e.expect[0] === 'api_key')) {
      const redacted = applyRedactionsToText(entry.text, detectSensitiveData(entry.text, policy));
      // Hors chaîne de connexion Azure (suffixe non secret conservé), il ne reste que le jeton.
      if (entry.id !== 'azure-connection-string') {
        expect(redacted, entry.id).toBe('[REDACTED_API_KEY]');
      }
    }
  });
});

describe('corpus étiqueté — vrais négatifs', () => {
  it.each(TRUE_NEGATIVES.map((e) => [label(e), e] as const))('%s', (_id, entry) => {
    expect(detectedTypes(entry.text)).toEqual([...entry.expect].sort());
  });
});

describe('corpus étiqueté — taux', () => {
  it('rappel et précision hors manques connus = 100 %', () => {
    const tp = TRUE_POSITIVES.filter((e) => !e.gap);
    const tn = TRUE_NEGATIVES.filter((e) => !e.gap);
    const missed = tp.filter((e) => detectedTypes(e.text).length === 0).map((e) => e.id);
    const falsePositives = tn.filter((e) => detectedTypes(e.text).length > 0).map((e) => e.id);
    expect(missed).toEqual([]);
    expect(falsePositives).toEqual([]);
  });
});

describe('temps de scan borné sur entrées adverses (anti-ReDoS)', () => {
  // Entrées conçues pour maximiser le retour arrière de chaque motif. Mesuré à ~2 M caractères :
  // pire cas < 0,7 s. Ici 300 k caractères et un plafond large (2 s) pour rester stable en CI.
  const SIZE = 300_000;
  const fill = (unit: string): string => unit.repeat(Math.ceil(SIZE / unit.length));
  const cases: [string, string][] = [
    ['chiffres et tirets', fill('4-')],
    ['IBAN groupes sans fin', `FR76${fill('.AAAA')}`],
    ['e-mail à labels', fill(`x@${'a-'.repeat(31)}a.`)],
    ['points répétés', fill('a.')],
    ['sk- à tirets', fill(`sk-${'a-'.repeat(120)} `)],
    ['en-têtes PEM sans END', fill('-----BEGIN RSA PRIVATE KEY-----\n')],
    ['password= répété', fill('password=')],
    ['Bearer répété', fill('Bearer ')],
    ['numéros denses', fill('01 ')],
    ['IP denses', fill('10.1.1.1 ')],
  ];

  it.each(cases)('%s', (_label, text) => {
    const t0 = performance.now();
    detectSensitiveData(text, policy);
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});
