import type { RawMatch } from './types.js';

type ApiKeyPattern = { source: RegExp; ruleType: 'api_key' };

/** Patterns à ancres fixes — évite ReDoS sur entrées longues. */
const API_KEY_PATTERNS: ApiKeyPattern[] = [
  { source: /\bAKIA[0-9A-Z]{16}\b/g, ruleType: 'api_key' },
  { source: /\bASIA[0-9A-Z]{16}\b/g, ruleType: 'api_key' },
  { source: /\bsk-[A-Za-z0-9_-]{20,255}\b/g, ruleType: 'api_key' },
  { source: /\bsk-proj-[A-Za-z0-9_-]{10,255}\b/g, ruleType: 'api_key' },
  { source: /\bsk-ant-[A-Za-z0-9_-]{10,255}\b/g, ruleType: 'api_key' },
  // Stripe : underscore (pas tiret) — distinct des clés `sk-...` ci-dessus, aucune collision.
  { source: /\bsk_live_[A-Za-z0-9]{10,255}\b/g, ruleType: 'api_key' },
  { source: /\bsk_test_[A-Za-z0-9]{10,255}\b/g, ruleType: 'api_key' },
  { source: /\brk_live_[A-Za-z0-9]{10,255}\b/g, ruleType: 'api_key' },
  { source: /\brk_test_[A-Za-z0-9]{10,255}\b/g, ruleType: 'api_key' },
  { source: /\bghp_[A-Za-z0-9]{36,255}\b/g, ruleType: 'api_key' },
  { source: /\bgithub_pat_[A-Za-z0-9_]{22,255}\b/g, ruleType: 'api_key' },
  { source: /\bglpat-[A-Za-z0-9_-]{20,255}\b/g, ruleType: 'api_key' },
  { source: /\bxox[baprs]-[A-Za-z0-9-]{10,255}\b/g, ruleType: 'api_key' },
  {
    source: /\bDefaultEndpointsProtocol=https;AccountName=[^;\s]{3,24};/g,
    ruleType: 'api_key',
  },
];

function collectPatternMatches(text: string, pattern: ApiKeyPattern): RawMatch[] {
  const matches: RawMatch[] = [];
  pattern.source.lastIndex = 0;

  let result = pattern.source.exec(text);
  while (result !== null) {
    matches.push({
      ruleType: pattern.ruleType,
      start: result.index,
      end: result.index + result[0].length,
    });
    result = pattern.source.exec(text);
  }

  return matches;
}

export function findApiKeyMatches(text: string): RawMatch[] {
  const all: RawMatch[] = [];
  for (const pattern of API_KEY_PATTERNS) {
    all.push(...collectPatternMatches(text, pattern));
  }
  return all;
}
